pragma solidity 0.8.13;

import "../../src/interfaces/ISocket.sol";
import "../../src/interfaces/IPlug.sol";

contract MockSocket is ISocket {
    uint32 _localSlug;

    struct PlugConfig {
        address siblingPlug;
        address inboundSwitchboard;
        address outboundSwitchboard;
    }
    //  localSlug => localPlug => siblingSlug => config(inboundSwitchboard, outboundSwitchboard, siblingPlug)
    mapping(uint32 => mapping(address => mapping(uint32 => PlugConfig)))
        public plugConfigs;

    error WrongSiblingPlug();
    error PlugDisconnected();

    function chainSlug() external view override returns (uint32) {
        return _localSlug;
    }

    function setLocalSlug(uint32 localSlug_) external {
        _localSlug = localSlug_;
    }

    function connect(
        uint32 siblingChainSlug_,
        address siblingPlug_,
        address inboundSwitchboard_,
        address outboundSwitchboard_
    ) external override {
        PlugConfig storage plugConfig = plugConfigs[_localSlug][msg.sender][
            siblingChainSlug_
        ];

        plugConfig.siblingPlug = siblingPlug_;
        plugConfig.inboundSwitchboard = inboundSwitchboard_;
        plugConfig.outboundSwitchboard = outboundSwitchboard_;
    }

    function outbound(
        uint32 siblingChainSlug_,
        uint256 minMsgGasLimit_,
        bytes32,
        bytes32,
        bytes calldata payload_
    ) external payable override returns (bytes32) {
        PlugConfig memory srcPlugConfig = plugConfigs[_localSlug][msg.sender][
            siblingChainSlug_
        ];

        if (srcPlugConfig.siblingPlug == address(0)) revert PlugDisconnected();

        PlugConfig memory dstPlugConfig = plugConfigs[siblingChainSlug_][
            srcPlugConfig.siblingPlug
        ][_localSlug];

        if (dstPlugConfig.siblingPlug != msg.sender) revert WrongSiblingPlug();
        IPlug(srcPlugConfig.siblingPlug).inbound{gas: minMsgGasLimit_}(
            _localSlug,
            payload_
        );

        return bytes32(0);
    }

    // ignore ISocket function
    function execute(
        ISocket.ExecutionDetails calldata executionDetails_,
        ISocket.MessageDetails calldata messageDetails_
    ) external payable override {}

    // ignore ISocket function
    function getMinFees(
        uint256 minMsgGasLimit_,
        uint256 payloadSize_,
        bytes32 executionParams_,
        bytes32 transmissionParams_,
        uint32 siblingChainSlug_,
        address plug_
    ) external view override returns (uint256 totalFees) {}

    function getPlugConfig(
        address plugAddress_,
        uint32 siblingChainSlug_
    )
        external
        view
        returns (
            address siblingPlug,
            address inboundSwitchboard__,
            address outboundSwitchboard__,
            address capacitor__,
            address decapacitor__
        )
    {
        PlugConfig memory srcPlugConfig = plugConfigs[_localSlug][plugAddress_][
            siblingChainSlug_
        ];

        return (
            srcPlugConfig.siblingPlug,
            address(srcPlugConfig.inboundSwitchboard),
            address(srcPlugConfig.outboundSwitchboard),
            address(0),
            address(0)
        );
    }

    function globalMessageCount() external view returns (uint64) {
        return 0;
    }

    
}
