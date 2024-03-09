pragma solidity 0.8.13;

struct UpdateLimitParams {
    bool isMint;
    address connector;
    uint256 maxLimit;
    uint256 ratePerSecond;
}

struct SrcHookCallParams {
    address connector;
    address msgSender;
    TransferInfo transferInfo;
}

struct DstPreHookCallParams {
    address connector;
    bytes connectorCache;
    TransferInfo transferInfo;
}

struct DstPostHookCallParams {
    address connector;
    bytes connectorCache;
    bytes postHookData;
    TransferInfo transferInfo;
}

struct PreRetryHookCallParams {
    address connector;
    CacheData cacheData;
}

struct PostRetryHookCallParams {
    address connector;
    bytes postRetryHookData;
    CacheData cacheData;
}

struct TransferInfo {
    address receiver;
    uint256 amount;
    bytes data;
}

struct CacheData {
    bytes identifierCache;
    bytes connectorCache;
}
