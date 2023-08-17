pragma solidity ^0.8.13;
import "./MintableToken.sol";
import "./ExchangeRate.sol";
import "./Controller.sol";
import "./ConnectorPlug.sol";
import "./interfaces/IPlug.sol";
import "./interfaces/ISocket.sol";
import "openzeppelin-contracts/contracts/access/Ownable2Step.sol";
struct LimitParams {
    uint256 maxLimit;
    uint256 ratePerSecond;
}
struct Data {
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
    Data data;
}

contract DeployMintableTokenStack is IPlug, Ownable2Step {
    event TokenDeployed(address token);
    event ExchangeRateDeployed(address exchangeRate);
    event ControllerDeployed(address controller, address token);
    event ConnectorDeployedAndConnected(
        address connector,
        address controller,
        uint32 chain
    );

    address public immutable socket;
    ExchangeRate public immutable exchangeRate;
    uint32 public immutable chainSlug;

    error NotSocket();

    constructor(address _socket, uint32 _chainSlug) {
        socket = _socket;
        chainSlug = _chainSlug;
        exchangeRate = new ExchangeRate();
        emit ExchangeRateDeployed(address(exchangeRate));
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

    function deploy(Data memory data) public {
        Controller.UpdateLimitParams[]
            memory updates = new Controller.UpdateLimitParams[](
                data.limitParams.length
            );

        address token = address(
            new MintableToken(
                data.tokenName,
                data.tokenSymbol,
                data.tokenDecimals
            )
        );

        emit TokenDeployed(token);

        Controller controller = new Controller(token, address(exchangeRate));
        emit ControllerDeployed(address(controller), token);

        for (uint8 i = 0; i < data.chains.length; ) {
            if (data.chains[i] != chainSlug) {
                ConnectorPlug connector = new ConnectorPlug(
                    address(controller),
                    socket,
                    data.chains[i]
                );
                connector.connect(
                    data.siblingConnectors[i],
                    data.switchboard[i]
                );
                emit ConnectorDeployedAndConnected(
                    address(connector),
                    address(controller),
                    data.chains[i]
                );

                // TODO: try to find out whether we can do better this in terms of gas savings
                updates[i] = Controller.UpdateLimitParams({
                    isMint: true,
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

        
        controller.updateLimitParams(updates);
        controller.transferOwnership(data.owner);

        MintableToken(token).transferOwnership(address(controller));
    }

    function deployMultiChain(DeployToChains calldata data) external payable {
        for (uint8 i = 0; i < data.data.chains.length; ) {
            if (data.data.chains[i] == chainSlug) {
                deploy(data.data);
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
        if (msg.sender != address(socket)) revert NotSocket();
        Data memory data = abi.decode(payload_, (Data));
        deploy(data);
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
