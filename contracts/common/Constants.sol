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
bytes32 constant ERC721_VAULT = keccak256("ERC721_VAULT");
bytes32 constant ERC1155_VAULT = keccak256("ERC1155_VAULT");

bytes4 constant ID_ERC721 = 0x80ac58cd; // EIP-165 interface id
bytes4 constant ID_ERC1155 = 0xd9b67a26; // EIP-165 interface id
