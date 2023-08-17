pragma solidity ^0.8.13;
import "./MintableToken.sol";
import "./ExchangeRate.sol";
import "./Controller.sol";
import "./ConnectorPlug.sol";

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

contract DeployMintableTokenStack {

    event TokenDeployed(address token);
    event ExchangeRateDeployed(address exchangeRate);
    event ControllerDeployed(address controller, address token);
    event ConnectorDeployedAndConnected(address connector, address controller, uint32 chain);

    address immutable public socket;
    ExchangeRate immutable public exchangeRate;
   
    constructor(address _socket) {
        socket = _socket;
        exchangeRate = new ExchangeRate();
        emit ExchangeRateDeployed(address(exchangeRate));
    }

    function deploy(Data calldata data) external {
        
        Controller.UpdateLimitParams[] memory updates = new Controller.UpdateLimitParams[](data.limitParams.length);
        
        address token = address(new MintableToken(data.tokenName, data.tokenSymbol, data.tokenDecimals));
        
        emit TokenDeployed(token);

        Controller controller = new Controller(token, address(exchangeRate));
        emit ControllerDeployed(address(controller), token);

        for(uint8 i = 0; i < data.chains.length;) {

            ConnectorPlug connector = new ConnectorPlug(address(controller), socket, data.chains[i]);
            connector.connect(data.siblingConnectors[i], data.switchboard[i]);
            emit ConnectorDeployedAndConnected(address(connector), address(controller), data.chains[i]);
            
            // TODO: try to find out whether we can do better this in terms of gas savings
            updates[i] = Controller.UpdateLimitParams({
                isMint: true,
                connector: address(connector),
                maxLimit: data.limitParams[i].maxLimit,
                ratePerSecond: data.limitParams[i].ratePerSecond
            });

            connector.transferOwnership(data.owner);
            
            unchecked {
                i++;
            }
        }

        controller.updateLimitParams(updates);

        controller.transferOwnership(data.owner);
        MintableToken(token).transferOwnership(data.owner);

     
    }

}
