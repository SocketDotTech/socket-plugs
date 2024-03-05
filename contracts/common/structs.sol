pragma solidity 0.8.13;

struct UpdateLimitParams {
    bool isMint;
    address connector;
    uint256 maxLimit;
    uint256 ratePerSecond;
}

struct SrcHookCall {
    address connector;
    address msgSender;
    TransferInfo transferInfo;
}

struct DstPreHookCall {
    address connector;
    bytes connectorCache;
    TransferInfo transferInfo;
}

struct DstPostHookCall {
    address connector;
    bytes postHookData;
    bytes connectorCache;
    TransferInfo transferInfo;
}

struct PreRetryHookCall {
    address connector;
    CacheData cacheData;
}

struct PostRetryHookCall {
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
