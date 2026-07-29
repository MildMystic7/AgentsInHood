// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Ownable2Step} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface IWalletEligibilityRegistry {
    function isEligible(address account) external view returns (bool);
}

/// @title AgentsInHood Agent Prediction Vault
/// @notice A single-round, native-token pari-mutuel pool for a three-hour agent battle.
/// @dev Stakes are mutable and withdrawable only during the first hour. The owner can
///      propose the final agent after the battle, but can never withdraw the pool.
contract AgentPredictionVault is Ownable2Step, ReentrancyGuard {
    uint8 public constant AGENT_COUNT = 5;
    uint64 public constant BETTING_DURATION = 1 hours;
    uint64 public constant CHALLENGE_DURATION = 3 hours;

    enum Settlement {
        Unresolved,
        Resolved,
        Cancelled
    }

    enum Phase {
        Scheduled,
        Open,
        Locked,
        AwaitingResolution,
        Resolved,
        Cancelled
    }

    struct Position {
        uint128 amount;
        uint8 agentId;
        bool claimed;
    }

    uint64 public immutable startsAt;
    uint64 public immutable bettingClosesAt;
    uint64 public immutable challengeEndsAt;
    uint64 public immutable resultDisputeDuration;
    uint128 public immutable minimumStake;
    uint128 public immutable maximumStakePerWallet;
    uint256 public immutable maximumTotalPool;
    address public immutable eligibilityRegistry;

    Settlement public settlement;
    bool public resultProposed;
    uint8 public proposedWinningAgent;
    uint8 public winningAgent;
    uint64 public resultFinalizesAt;
    bytes32 public proposedEvidenceHash;
    bytes32 public resultEvidenceHash;
    uint256 public totalPool;
    uint256 public remainingPayoutPool;
    uint256 public remainingWinningStake;

    uint256[AGENT_COUNT] private _agentPools;
    mapping(address account => Position position) private _positions;

    error BettingNotOpen();
    error ChallengeStillRunning();
    error IneligibleParticipant();
    error InvalidAgent();
    error InvalidConfiguration();
    error InvalidEvidence();
    error InvalidStartTime();
    error MaximumPoolExceeded();
    error MaximumStakeExceeded();
    error MinimumStakeRequired();
    error NoStake();
    error PositionAlreadyClaimed();
    error PositionOnDifferentAgent();
    error RoundAlreadySettled();
    error RoundNotCancelled();
    error RoundNotResolved();
    error ResultAlreadyProposed();
    error ResultDisputeActive();
    error ResultDisputeEnded();
    error ResultNotProposed();
    error TransferFailed();
    error WinningAgentRequired();
    error DirectTransferDisabled();
    error OwnershipRenunciationDisabled();

    event BetPlaced(
        address indexed account,
        uint8 indexed agentId,
        uint256 addedAmount,
        uint256 positionAmount
    );
    event AgentChanged(address indexed account, uint8 indexed previousAgent, uint8 indexed newAgent);
    event StakeWithdrawn(address indexed account, uint8 indexed agentId, uint256 amount);
    event ResultProposed(
        uint8 indexed winningAgent,
        bytes32 indexed evidenceHash,
        uint64 finalizesAt
    );
    event ResultRetracted(bytes32 indexed reasonHash);
    event RoundResolved(uint8 indexed winningAgent, bytes32 indexed evidenceHash, uint256 totalPool);
    event RoundCancelled(bytes32 indexed evidenceHash, uint256 refundablePool);
    event PayoutClaimed(address indexed account, uint8 indexed agentId, uint256 stake, uint256 payout);
    event RefundClaimed(address indexed account, uint256 amount);

    constructor(
        uint64 startTimestamp,
        address initialOwner,
        uint128 minimumStakeAmount,
        uint128 maximumStakeAmount,
        uint256 maximumPoolAmount,
        uint64 disputeDuration,
        address participantEligibilityRegistry
    ) Ownable(initialOwner) {
        if (startTimestamp < block.timestamp) revert InvalidStartTime();
        if (
            minimumStakeAmount == 0 ||
            maximumStakeAmount < minimumStakeAmount ||
            maximumPoolAmount < maximumStakeAmount ||
            disputeDuration < 30 minutes
        ) {
            revert InvalidConfiguration();
        }

        startsAt = startTimestamp;
        bettingClosesAt = startTimestamp + BETTING_DURATION;
        challengeEndsAt = startTimestamp + CHALLENGE_DURATION;
        minimumStake = minimumStakeAmount;
        maximumStakePerWallet = maximumStakeAmount;
        maximumTotalPool = maximumPoolAmount;
        resultDisputeDuration = disputeDuration;
        eligibilityRegistry = participantEligibilityRegistry;
    }

    modifier onlyOpen() {
        if (block.timestamp < startsAt || block.timestamp >= bettingClosesAt) {
            revert BettingNotOpen();
        }
        _;
    }

    function phase() public view returns (Phase) {
        if (settlement == Settlement.Resolved) return Phase.Resolved;
        if (settlement == Settlement.Cancelled) return Phase.Cancelled;
        if (block.timestamp < startsAt) return Phase.Scheduled;
        if (block.timestamp < bettingClosesAt) return Phase.Open;
        if (block.timestamp < challengeEndsAt) return Phase.Locked;
        return Phase.AwaitingResolution;
    }

    function placeBet(uint8 agentId) external payable onlyOpen {
        _validateAgent(agentId);
        if (msg.value == 0) revert NoStake();
        if (
            eligibilityRegistry != address(0) &&
            !IWalletEligibilityRegistry(eligibilityRegistry).isEligible(msg.sender)
        ) {
            revert IneligibleParticipant();
        }

        Position storage position = _positions[msg.sender];
        if (position.amount > 0 && position.agentId != agentId) {
            revert PositionOnDifferentAgent();
        }

        uint256 nextAmount = uint256(position.amount) + msg.value;
        if (nextAmount > type(uint128).max) revert NoStake();
        if (nextAmount < minimumStake) revert MinimumStakeRequired();
        if (nextAmount > maximumStakePerWallet) revert MaximumStakeExceeded();
        if (totalPool + msg.value > maximumTotalPool) revert MaximumPoolExceeded();

        position.amount = uint128(nextAmount);
        position.agentId = agentId;
        _agentPools[agentId] += msg.value;
        totalPool += msg.value;

        emit BetPlaced(msg.sender, agentId, msg.value, nextAmount);
    }

    function changeAgent(uint8 newAgentId) external onlyOpen {
        _validateAgent(newAgentId);

        Position storage position = _positions[msg.sender];
        uint256 amount = position.amount;
        if (amount == 0) revert NoStake();

        uint8 previousAgent = position.agentId;
        if (previousAgent == newAgentId) revert PositionOnDifferentAgent();

        _agentPools[previousAgent] -= amount;
        _agentPools[newAgentId] += amount;
        position.agentId = newAgentId;

        emit AgentChanged(msg.sender, previousAgent, newAgentId);
    }

    function withdrawStake(uint256 amount) external onlyOpen nonReentrant {
        Position storage position = _positions[msg.sender];
        if (amount == 0 || amount > position.amount) revert NoStake();

        uint256 nextAmount = uint256(position.amount) - amount;
        if (nextAmount > 0 && nextAmount < minimumStake) revert MinimumStakeRequired();

        position.amount = uint128(nextAmount);
        _agentPools[position.agentId] -= amount;
        totalPool -= amount;

        _sendValue(payable(msg.sender), amount);
        emit StakeWithdrawn(msg.sender, position.agentId, amount);
    }

    /// @notice Proposes a winner and opens a public review window before settlement.
    function proposeResult(uint8 winner, bytes32 evidenceHash) external onlyOwner {
        if (block.timestamp < challengeEndsAt) revert ChallengeStillRunning();
        if (settlement != Settlement.Unresolved) revert RoundAlreadySettled();
        if (resultProposed) revert ResultAlreadyProposed();
        if (evidenceHash == bytes32(0)) revert InvalidEvidence();
        _validateAgent(winner);

        resultProposed = true;
        proposedWinningAgent = winner;
        proposedEvidenceHash = evidenceHash;
        resultFinalizesAt = uint64(block.timestamp) + resultDisputeDuration;

        emit ResultProposed(winner, evidenceHash, resultFinalizesAt);
    }

    /// @notice Retracts an incorrect proposal before it is finalized.
    function retractResult(bytes32 reasonHash) external onlyOwner {
        if (settlement != Settlement.Unresolved) revert RoundAlreadySettled();
        if (!resultProposed) revert ResultNotProposed();
        if (block.timestamp >= resultFinalizesAt) revert ResultDisputeEnded();
        if (reasonHash == bytes32(0)) revert InvalidEvidence();

        resultProposed = false;
        proposedWinningAgent = 0;
        proposedEvidenceHash = bytes32(0);
        resultFinalizesAt = 0;

        emit ResultRetracted(reasonHash);
    }

    /// @notice Finalizes the published result after its dispute window.
    /// @dev Anyone can finalize. If nobody backed the proposed winner, every
    ///      participant can recover their original stake.
    function finalizeResult() external {
        if (settlement != Settlement.Unresolved) revert RoundAlreadySettled();
        if (!resultProposed) revert ResultNotProposed();
        if (block.timestamp < resultFinalizesAt) revert ResultDisputeActive();

        uint8 winner = proposedWinningAgent;
        bytes32 evidenceHash = proposedEvidenceHash;
        resultEvidenceHash = evidenceHash;
        winningAgent = winner;

        uint256 winnerStake = _agentPools[winner];
        if (winnerStake == 0) {
            settlement = Settlement.Cancelled;
            emit RoundCancelled(evidenceHash, totalPool);
            return;
        }

        settlement = Settlement.Resolved;
        remainingPayoutPool = totalPool;
        remainingWinningStake = winnerStake;

        emit RoundResolved(winner, evidenceHash, totalPool);
    }

    /// @notice Cancels an unresolvable round after it has ended, enabling exact refunds.
    function cancel(bytes32 evidenceHash) external onlyOwner {
        if (block.timestamp < challengeEndsAt) revert ChallengeStillRunning();
        if (settlement != Settlement.Unresolved) revert RoundAlreadySettled();
        if (evidenceHash == bytes32(0)) revert InvalidEvidence();
        if (resultProposed && block.timestamp >= resultFinalizesAt) {
            revert ResultDisputeEnded();
        }

        settlement = Settlement.Cancelled;
        resultEvidenceHash = evidenceHash;
        emit RoundCancelled(evidenceHash, totalPool);
    }

    function claim() external nonReentrant returns (uint256 payout) {
        if (settlement != Settlement.Resolved) revert RoundNotResolved();

        Position storage position = _positions[msg.sender];
        uint256 stake = position.amount;
        if (position.claimed) revert PositionAlreadyClaimed();
        if (stake == 0) revert NoStake();
        if (position.agentId != winningAgent) revert WinningAgentRequired();

        payout = (remainingPayoutPool * stake) / remainingWinningStake;
        position.claimed = true;
        position.amount = 0;
        remainingPayoutPool -= payout;
        remainingWinningStake -= stake;

        _sendValue(payable(msg.sender), payout);
        emit PayoutClaimed(msg.sender, winningAgent, stake, payout);
    }

    function claimRefund() external nonReentrant returns (uint256 amount) {
        if (settlement != Settlement.Cancelled) revert RoundNotCancelled();

        Position storage position = _positions[msg.sender];
        amount = position.amount;
        if (position.claimed) revert PositionAlreadyClaimed();
        if (amount == 0) revert NoStake();

        position.claimed = true;
        position.amount = 0;
        _sendValue(payable(msg.sender), amount);

        emit RefundClaimed(msg.sender, amount);
    }

    function payoutOf(address account) external view returns (uint256) {
        Position memory position = _positions[account];
        if (
            settlement != Settlement.Resolved ||
            position.claimed ||
            position.amount == 0 ||
            position.agentId != winningAgent
        ) {
            return 0;
        }
        return (remainingPayoutPool * position.amount) / remainingWinningStake;
    }

    function positionOf(address account) external view returns (Position memory) {
        return _positions[account];
    }

    function agentPool(uint8 agentId) external view returns (uint256) {
        _validateAgent(agentId);
        return _agentPools[agentId];
    }

    function allAgentPools() external view returns (uint256[AGENT_COUNT] memory) {
        return _agentPools;
    }

    /// @dev A round must always retain a resolver until it is settled.
    function renounceOwnership() public pure override {
        revert OwnershipRenunciationDisabled();
    }

    function _validateAgent(uint8 agentId) private pure {
        if (agentId >= AGENT_COUNT) revert InvalidAgent();
    }

    function _sendValue(address payable recipient, uint256 amount) private {
        (bool success, ) = recipient.call{value: amount}("");
        if (!success) revert TransferFailed();
    }

    receive() external payable {
        revert DirectTransferDisabled();
    }

    fallback() external payable {
        revert DirectTransferDisabled();
    }
}
