// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

struct SrcPreHookNFTCallParams {
    address connector;
    address msgSender;
    NFTTransferInfo transferInfo;
}

struct SrcPostHookNFTCallParams {
    address connector;
    bytes options;
    bytes postHookData;
    NFTTransferInfo transferInfo;
}

struct DstPreHookNFTCallParams {
    address connector;
    bytes connectorCache;
    NFTTransferInfo transferInfo;
}

struct DstPostHookNFTCallParams {
    address connector;
    bytes32 messageId;
    bytes connectorCache;
    bytes postHookData;
    NFTTransferInfo transferInfo;
}

struct NFTTransferInfo {
    address receiver;
    uint256 tokenId;
    uint256 amount;
    bytes extraData;
}
