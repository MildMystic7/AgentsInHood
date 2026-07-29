// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Ownable2Step} from "@openzeppelin/contracts/access/Ownable2Step.sol";

/// @title AgentsInHood Wallet Eligibility Registry
/// @notice Stores only an on-chain yes/no eligibility flag. No identity data is recorded.
contract WalletEligibilityRegistry is Ownable2Step {
    uint256 public constant MAX_BATCH_SIZE = 100;

    mapping(address account => bool eligible) private _eligibility;

    error BatchTooLarge();
    error InvalidAccount();
    error LengthMismatch();
    error OwnershipRenunciationDisabled();

    event EligibilityUpdated(address indexed account, bool eligible);

    constructor(
        address initialOwner,
        address[] memory initiallyEligible
    ) Ownable(initialOwner) {
        uint256 length = initiallyEligible.length;
        if (length > MAX_BATCH_SIZE) revert BatchTooLarge();
        for (uint256 index = 0; index < length; ++index) {
            _setEligibility(initiallyEligible[index], true);
        }
    }

    function isEligible(address account) external view returns (bool) {
        return _eligibility[account];
    }

    function setEligibility(address account, bool eligible) external onlyOwner {
        _setEligibility(account, eligible);
    }

    function setEligibilityBatch(
        address[] calldata accounts,
        bool[] calldata eligible
    ) external onlyOwner {
        uint256 length = accounts.length;
        if (length != eligible.length) revert LengthMismatch();
        if (length > MAX_BATCH_SIZE) revert BatchTooLarge();

        for (uint256 index = 0; index < length; ++index) {
            _setEligibility(accounts[index], eligible[index]);
        }
    }

    function renounceOwnership() public pure override {
        revert OwnershipRenunciationDisabled();
    }

    function _setEligibility(address account, bool eligible) private {
        if (account == address(0)) revert InvalidAccount();
        _eligibility[account] = eligible;
        emit EligibilityUpdated(account, eligible);
    }
}
