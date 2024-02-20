pragma solidity 0.8.13;

import "forge-std/Test.sol";
import "solmate/tokens/ERC20.sol";
import "../mocks/MintableToken.sol";
import "../../contracts/superbridge/Controller.sol";
import "../../contracts/superbridge/FiatTokenV2_1/FiatTokenV2_1_Controller.sol";
import "../../contracts/superbridge/ConnectorPlug.sol";
import "../../contracts/superbridge/ExchangeRate.sol";
import "forge-std/console.sol";

interface IMintable {
    function configureMinter(address minter, uint256 amount) external;
}

contract LyraBurnUSDC is Test {
    address me = 0x5fD7D0d6b91CC4787Bcb86ca47e0Bd4ea0346d34;
    address usdc = 0x6879287835A86F50f784313dBEd5E5cCC5bb8481;
    address usdcAdmin = 0x09572935af645fA82F67673FAB0928b2Aa01835b;
    address socket = 0x565810cbfa3Cf1390963E5aFa2fB953795686339;
    address siblingConnector = 0x200AF8FCdD5246D70B369A98143Ac8930A077B7A;
    address fastSwitchboard = 0x8f9EaEe5c5df888aBA3c1Ab19689a0660d042c6d;
    uint256 minMsgGasLimit = 500_000;
    uint256 amount = 1_000_000;
    uint256 limit = 10_000_000_000_000;
    uint256 rate = 115_740;
    uint256 poolId =
        26959946667150639794667015087019630673637144422540572481103610249216;

    function setUp() external {
        uint256 fork = vm.createFork("https://rpc.lyra.finance", 137815);
        vm.selectFork(fork);
    }

    function testNormalController() external {
        Controller controller = Controller(
            0xdf4Dc41c54482B5077572723828d1AfA2266D697
        );
        address connector = 0x0C0858290b6b268a93fB557af06390A3460c5dB6;
        hoax(me);
        vm.expectRevert();
        controller.withdrawFromAppChain(me, amount, minMsgGasLimit, connector);
    }

    function testFiatTokenV2_1_Controller() external {
        ExchangeRate e = new ExchangeRate();
        Controller controller = new FiatTokenV2_1_Controller(usdc, address(e));
        ConnectorPlug connector = new ConnectorPlug(
            address(controller),
            socket,
            1
        );
        connector.connect(siblingConnector, fastSwitchboard);

        _setPoolId(controller, address(connector));
        _setLimitParams(controller, address(connector));

        vm.prank(usdcAdmin);
        IMintable(usdc).configureMinter(address(controller), limit);

        vm.prank(address(connector));
        controller.receiveInbound(abi.encode(me, amount));

        uint256 fees = controller.getMinFees(
            address(connector),
            minMsgGasLimit
        );
        vm.prank(address(me));
        ERC20(usdc).approve(address(controller), amount);
        vm.prank(address(me));
        controller.withdrawFromAppChain{value: fees}(
            me,
            amount,
            minMsgGasLimit,
            address(connector)
        );
    }

    function _setPoolId(Controller controller, address connector) internal {
        address[] memory connectors = new address[](1);
        uint256[] memory poolIds = new uint256[](1);
        connectors[0] = connector;
        poolIds[0] = poolId;
        controller.updateConnectorPoolId(connectors, poolIds);
    }

    function _setLimitParams(
        Controller controller,
        address connector
    ) internal {
        Controller.UpdateLimitParams[]
            memory u = new Controller.UpdateLimitParams[](2);
        u[0] = Controller.UpdateLimitParams(true, connector, limit, rate);
        u[1] = Controller.UpdateLimitParams(false, connector, limit, rate);
        controller.updateLimitParams(u);
        skip(1000);
    }
}
