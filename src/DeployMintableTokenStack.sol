pragma solidity ^0.8.13;
import "./MintableToken.sol";
import "./ExchangeRate.sol";
import "./ControllerV2.sol";
import "./ConnectorPlugV2.sol";
import "./interfaces/IPlug.sol";
import "./interfaces/ISocket.sol";
import "solmate/auth/Owned.sol";
import "./interfaces/ICREATE3Factory.sol";

// TODO: discuss and remove 2step ownership
// TODO: make sure create 3 is creating correct connection
// TODO: check if someone cant deploy a token with the same name and symbol and do harmfull things
// FIXME: add natspec
// TODO: gas optimization left
// TODO: checks addition left

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
    address[] siblingConnectors;
    LimitParams[] limitParams;
}
struct DeployToChains {
    uint256[] gasLimits;
    uint256 initialSupply;
    DeploymentInfo data;
}

contract DeployMintableTokenStack is IPlug, Owned {
    event TokenDeployed(address token, address owner);
    event ControllerDeployed(address controller, address token);
    event ConnectorDeployedAndConnected(
        address connector,
        address controller,
        uint32 chain
    );

    address public immutable socket;
    ExchangeRate public immutable exchangeRate;
    uint32 public immutable chainSlug;
    ICREATE3Factory public immutable CREATE3;
    constructor(
        address _socket,
        uint32 _chainSlug,
        ExchangeRate _exchangeRate,
        ICREATE3Factory _CREATE3
    ) Owned(msg.sender) {
        socket = _socket;
        chainSlug = _chainSlug;
        exchangeRate = _exchangeRate;
        CREATE3 = _CREATE3;
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

    function deploy(DeploymentInfo memory data, uint256 initialSupply) public {
        ControllerV2.UpdateLimitParams[]
            memory updates = new ControllerV2.UpdateLimitParams[](
                data.limitParams.length * 2
            );

        address token = CREATE3.deploy(
            keccak256(
                abi.encodePacked(
                    data.tokenName,
                    data.tokenSymbol,
                    data.tokenDecimals,
                    data.owner
                )
            ),
            abi.encodePacked(
                type(MintableToken).creationCode,
                abi.encode(data.tokenName, data.tokenSymbol, data.tokenDecimals, address(this))
            )
        );
        emit TokenDeployed(token, data.owner);

        address controllerAddress = CREATE3.deploy(
            keccak256(abi.encodePacked(token, address(exchangeRate), data.owner)),
            abi.encodePacked(
                type(ControllerV2).creationCode,
                abi.encode(token, address(exchangeRate), address(this))
            )
        );
        ControllerV2 controller = ControllerV2(controllerAddress);
        emit ControllerDeployed(controllerAddress, token);

        for (uint8 i = 0; i < data.chains.length; ) {
            if (data.chains[i] != chainSlug) {
                address connectorAddress = CREATE3.deploy(
                    keccak256(abi.encodePacked(controllerAddress, socket, i, data.owner)),
                    abi.encodePacked(
                        type(ConnectorPlugV2).creationCode,
                        abi.encode(controllerAddress, socket, data.chains[i], address(this))
                    )
                );
                ConnectorPlugV2 connector = ConnectorPlugV2(connectorAddress);
                connector.connect(
                    data.siblingConnectors[i],
                    data.switchboard[i]
                );
                emit ConnectorDeployedAndConnected(
                    connectorAddress,
                    controllerAddress,
                    data.chains[i]
                );

                // TODO: try to find out whether we can do better this in terms of gas savings
                updates[ (2*i) ] = ControllerV2.UpdateLimitParams({
                    isMint: true,
                    connector: connectorAddress,
                    maxLimit: data.limitParams[i].maxLimit,
                    ratePerSecond: data.limitParams[i].ratePerSecond
                });
                // TODO: ask arth if its needed
                updates[ (2*i) + 1] = ControllerV2.UpdateLimitParams({
                    isMint: false,
                    connector: connectorAddress,
                    maxLimit: data.limitParams[i].maxLimit,
                    ratePerSecond: data.limitParams[i].ratePerSecond
                });

                connector.transferOwnership(data.owner);
            }

            unchecked {
                i++;
            }
        }

        controller.updateLimitParams(updates);
        controller.transferOwnership(data.owner);
        MintableToken(token).mint(data.owner, initialSupply);
        MintableToken(token).transferOwnership(controllerAddress);
    }

    function deployMultiChain(DeployToChains calldata data) external payable {
        for (uint8 i = 0; i < data.data.chains.length; ) {
            if (data.data.chains[i] == chainSlug) {
                deploy(data.data, data.initialSupply);
            } else {
                _outbound(
                    data.gasLimits[i],
                    abi.encode(data.data),
                    data.data.chains[i]
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
        DeploymentInfo memory data = abi.decode(payload_, (DeploymentInfo));
        deploy(data, 0);
    }

    function _outbound(
        uint256 msgGasLimit_,
        bytes memory payload_,
        uint32 siblingChainSlug_
    ) internal {
        ISocket(socket).outbound{value: msg.value}(
            siblingChainSlug_,
            msgGasLimit_,
            bytes32(0),
            bytes32(0),
            payload_
        );
    }
}
