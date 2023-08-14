pragma solidity ^0.8.13;
import "./MintableToken.sol";
import "./ExchangeRate.sol";
import "./Controller.sol";
import "./ConnectorPlug.sol";

struct LimitParams {
    uint256 maxLimit;
    uint256 ratePerSecond;
}


contract DeployMintableTokenStack {

    event TokenDeployed(address token);
    event ExchangeRateDeployed(address exchangeRate);
    event ControllerDeployed(address controller, address token, address exchangeRate);
    event ConnectorDeployedAndConnected(address connector, address controller, uint32 chain);

    address immutable public socket;
   
    constructor(address _socket) {
        socket = _socket;
    }

    function deploy(string calldata tokenName, string calldata tokenSymbol, uint8 tokenDecimals, uint32[] calldata chains, address switchboard, address[] calldata siblingConnectors, LimitParams[] calldata limitParams) external {
        
        Controller.UpdateLimitParams[] memory updates = new Controller.UpdateLimitParams[](limitParams.length);
        
        address token = address(new MintableToken(tokenName, tokenSymbol, tokenDecimals));
        emit TokenDeployed(token);
        
        address exchangeRate = address(new ExchangeRate());
        emit ExchangeRateDeployed(exchangeRate);

        Controller controller = new Controller(token, exchangeRate);
        emit ControllerDeployed(address(controller), token, exchangeRate);

        for(uint8 i = 0; i < chains.length;) {

            ConnectorPlug connector = new ConnectorPlug(address(controller), socket, chains[i]);
            connector.connect(siblingConnectors[i], switchboard);
            emit ConnectorDeployedAndConnected(address(connector), address(controller), chains[i]);
            
            // TODO: try to find out whether we can do better this in terms of gas savings
            updates[i] = Controller.UpdateLimitParams({
                isMint: true,
                connector: address(connector),
                maxLimit: limitParams[i].maxLimit,
                ratePerSecond: limitParams[i].ratePerSecond
            });
            
            unchecked {
                i++;
            }
        }

        controller.updateLimitParams(updates);
     
    }

}
