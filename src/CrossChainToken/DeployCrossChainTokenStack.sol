pragma solidity ^0.8.13;
import "../interfaces/IPlug.sol";
import "../interfaces/ISocket.sol";
import "solmate/auth/Owned.sol";
import "./CrossChainToken.sol";
import "./CrossChainConnector.sol";

struct LimitParams {
    uint256 maxLimit;
    uint256 ratePerSecond;
}
struct DeploymentInfo {
    string tokenName;
    string tokenSymbol;
    address owner;
    uint32[] chains;
    uint8 tokenDecimals;
    address[] switchboard;
    LimitParams[] limitParams;
}
struct DeployToChains {
    uint256[] gasLimits;
    uint256[] values;
    uint256 initialSupply;
    DeploymentInfo data;
}

contract DeployCrossChainTokenStack is IPlug, Owned {
    event TokenDeployed(address token, address owner);
    event ControllerDeployed(address controller, address token);
    event ConnectorDeployedAndConnected(
        address connector,
        address controller,
        uint32 chain
    );

    address public immutable socket;
    uint32 public immutable chainSlug;

    constructor(
        address _owner,
        address _socket,
        uint32 _chainSlug
    ) Owned(_owner) {
        socket = _socket;
        chainSlug = _chainSlug;
    }

    function connect(
        address siblingPlug_,
        address switchboard_,
        uint32 siblingChainSlug_
    ) external onlyOwner {
        ISocket(socket).connect(
            siblingChainSlug_,
            siblingPlug_,
            switchboard_,
            switchboard_
        );
    }

    function deploy(
        DeploymentInfo memory data,
        uint256 initialSupply,
        address switchboard
    ) public {
        CrossChainToken.UpdateLimitParams[]
            memory updates = new CrossChainToken.UpdateLimitParams[](
                data.limitParams.length * 2
            );


        bytes32 tokenSalt = keccak256(
                abi.encodePacked(
                    data.tokenName,
                    data.tokenSymbol,
                    data.tokenDecimals,
                    data.owner,
                    msg.sender,
                    "token"
                )
        );

        CrossChainToken cct = new CrossChainToken{salt:tokenSalt}(
            data.tokenName,
            data.tokenSymbol,
            data.tokenDecimals,
            data.owner,
            address(this),
            initialSupply
        );

       
        emit TokenDeployed(address(cct), data.owner);

        for (uint8 i = 0; i < data.chains.length; ) {
            if (data.chains[i] != chainSlug) {
                bytes32 connectorSalt = keccak256(
                    abi.encodePacked(
                        data.tokenName,
                        data.tokenSymbol,
                        data.tokenDecimals,
                        data.owner,
                        msg.sender,
                        chainSlug < data.chains[i] ? chainSlug : data.chains[i],
                        chainSlug < data.chains[i] ? data.chains[i] : chainSlug,
                        "connector"
                    )
                );
               CrossChainConnector connector = new CrossChainConnector{
                    salt: connectorSalt
                }(address(cct), socket, data.chains[i]);

                connector.connect(address(connector), switchboard, switchboard);
                emit ConnectorDeployedAndConnected(
                    address(connector),
                    address(cct),
                    data.chains[i]
                );

                updates[(2 * i)] = CrossChainToken.UpdateLimitParams({
                    isMint: true,
                    connector: address(connector),
                    maxLimit: data.limitParams[i].maxLimit,
                    ratePerSecond: data.limitParams[i].ratePerSecond
                });

                updates[(2 * i) + 1] = CrossChainToken.UpdateLimitParams({
                    isMint: false,
                    connector: address(connector),
                    maxLimit: data.limitParams[i].maxLimit,
                    ratePerSecond: data.limitParams[i].ratePerSecond
                });

                connector.transferOwnership(data.owner);
            }

            unchecked {
                i++;
            }
        }

        cct.updateLimitParams(updates);
        cct.transferOwnership(data.owner);
    }

    function deployMultiChain(DeployToChains calldata data) external payable {
        for (uint8 i = 0; i < data.data.chains.length; ) {
            if (data.data.chains[i] == chainSlug) {
                deploy(data.data, data.initialSupply, data.data.switchboard[i]);
            } else {
                _outbound(
                    data.gasLimits[i],
                    abi.encode(data.data, data.data.switchboard[i]),
                    data.data.chains[i],
                    data.values[i]
                );
            }

            unchecked {
                i++;
            }
        }
    }

    function inbound(
        uint32 /* siblingChainSlug_ */, // cannot be connected for any other slug, immutable variable
        bytes calldata payload_
    ) external payable override {
        if (msg.sender != address(socket)) revert();
        (DeploymentInfo memory data, address switchboard) = abi.decode(
            payload_,
            (DeploymentInfo, address)
        );
        deploy(data, 0, switchboard);
    }

    function _outbound(
        uint256 msgGasLimit_,
        bytes memory payload_,
        uint32 siblingChainSlug_,
        uint256 value_
    ) internal {
        ISocket(socket).outbound{value: value_}(
            siblingChainSlug_,
            msgGasLimit_,
            bytes32(0),
            bytes32(0),
            payload_
        );
    }
}
