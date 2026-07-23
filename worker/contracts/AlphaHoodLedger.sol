// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title AlphaHoodLedger
/// @notice An append-only, on-chain record of AlphaHood agent trade decisions.
/// @dev Deliberately minimal: this contract never holds, custodies, or moves
/// any value. It only emits events. Even if the operator key were ever
/// compromised, the worst case is someone can write fake log entries — there
/// is no fund-draining surface here, unlike a contract that holds a balance.
contract AlphaHoodLedger {
    /// @notice The only address allowed to log trades (the worker's wallet).
    address public immutable operator;

    event TradeLogged(
        string agentId,
        string action, // "BUY" | "SELL"
        string symbol,
        uint256 usdCents, // trade size in whole US cents (avoids on-chain floats)
        string reasoning, // short rationale, truncated off-chain before logging
        uint256 timestamp
    );

    constructor() {
        operator = msg.sender;
    }

    modifier onlyOperator() {
        require(msg.sender == operator, "AlphaHoodLedger: not operator");
        _;
    }

    /// @notice Records one agent decision permanently on-chain.
    function logTrade(
        string calldata agentId,
        string calldata action,
        string calldata symbol,
        uint256 usdCents,
        string calldata reasoning
    ) external onlyOperator {
        emit TradeLogged(agentId, action, symbol, usdCents, reasoning, block.timestamp);
    }
}
