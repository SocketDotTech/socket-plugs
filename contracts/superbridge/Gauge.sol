pragma solidity 0.8.13;

abstract contract Gauge {
    struct LimitParams {
        uint256 lastUpdateTimestamp;
        uint256 ratePerSecond;
        uint256 maxLimit;
        uint256 lastUpdateLimit;
    }

    error AmountOutsideLimit();

    function _getCurrentLimit(
        LimitParams storage _params
    ) internal view returns (uint256 _limit) {
        uint256 timeElapsed = block.timestamp - _params.lastUpdateTimestamp;
        uint256 limitIncrease = timeElapsed * _params.ratePerSecond;

        if (limitIncrease + _params.lastUpdateLimit > _params.maxLimit) {
            _limit = _params.maxLimit;
        } else {
            _limit = limitIncrease + _params.lastUpdateLimit;
        }
    }

    function _consumePartLimit(
        uint256 amount_,
        LimitParams storage _params
    ) internal returns (uint256 consumedAmount, uint256 pendingAmount) {
        uint256 currentLimit = _getCurrentLimit(_params);
        _params.lastUpdateTimestamp = block.timestamp;
        if (currentLimit >= amount_) {
            _params.lastUpdateLimit = currentLimit - amount_;
            consumedAmount = amount_;
            pendingAmount = 0;
        } else {
            _params.lastUpdateLimit = 0;
            consumedAmount = currentLimit;
            pendingAmount = amount_ - currentLimit;
        }
    }

    function _consumeFullLimit(
        uint256 amount_,
        LimitParams storage _params
    ) internal {
        uint256 currentLimit = _getCurrentLimit(_params);
        if (currentLimit >= amount_) {
            _params.lastUpdateTimestamp = block.timestamp;
            _params.lastUpdateLimit = currentLimit - amount_;
        } else {
            revert AmountOutsideLimit();
        }
    }
}
