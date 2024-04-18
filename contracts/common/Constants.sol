// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

address constant ETH_ADDRESS = address(
    0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE
);

bytes32 constant NORMAL_CONTROLLER = keccak256("NORMAL_CONTROLLER");
bytes32 constant FIAT_TOKEN_CONTROLLER = keccak256("FIAT_TOKEN_CONTROLLER");

bytes32 constant LIMIT_HOOK = keccak256("LIMIT_HOOK");
bytes32 constant LIMIT_EXECUTION_HOOK = keccak256("LIMIT_EXECUTION_HOOK");
bytes32 constant LIMIT_EXECUTION_YIELD_HOOK = keccak256(
    "LIMIT_EXECUTION_YIELD_HOOK"
);
bytes32 constant LIMIT_EXECUTION_YIELD_TOKEN_HOOK = keccak256(
    "LIMIT_EXECUTION_YIELD_TOKEN_HOOK"
);

bytes32 constant ERC20_VAULT = keccak256("ERC20_VAULT");
bytes32 constant NATIVE_VAULT = keccak256("NATIVE_VAULT");
