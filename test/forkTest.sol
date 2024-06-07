pragma solidity 0.8.13;
import "forge-std/Test.sol";
import "forge-std/console.sol";

import "../contracts/bridge/Controller.sol";
import {UpdateLimitParams} from "../contracts/common/Structs.sol";
import "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import {LyraTSADepositHook, LimitHook} from "../contracts/hooks/LyraTSAHooks.sol";
import "../contracts/bridge/Base.sol";

contract LyraForkTest is Test {
    address caller = 0xFDC28fA368c33DEC7853d63B65FC5Cfe01B212fc;
    address plug = 0x96EB7012Dad44CF191B5B7d7E72eF2699EC2B250;
    address tokenRecipient = 0x6666fe8F577F202Ec729BF653ec25Af5403cbd76;

    //    address fallbackRecipient = 0x1111111111111111111111111111111111111111;
    //    IERC20 token = IERC20(0x7ef0873bBf91B8Ecac22c0e9466b17c6Cc14B1bd);
    //    IERC20 TSA = IERC20(0x79AC9B13810D31066Be547EdA46C40264b39397D);
    //    LyraTSADepositHook hook =
    //        LyraTSADepositHook(payable(0x55328b5036EB15DdCA2a91468F1C70Dcae29b7Ab));
    //    Controller public controller =
    //        Controller(0xbEc0B31bbfA62364EBF6e27454978E33c5d9F4eE);
    //    address connectorPlug = 0x8FF3f8bc7884fe59425F090d5ec6A570472DfF88;

    function setUp() external {}

    function testFork() external {
        vm.deal(address(caller), 1 ether);
        vm.startPrank(caller);

        (bool success, ) = plug.call(
            abi.encodeWithSignature(
                "inbound(uint32,bytes)",
                901,
                hex"000000000000000000000000ce199d54792fdf64d762ca7524b3e6b2daa648530000000000000000000000000000000000000000000000003782dace9d90000000066eee96eb7012dad44cf191b5b7d7e72ef2699ec2b25000000000000002b200000000000000000000000000000000000000000000000000000000000000800000000000000000000000000000000000000000000000000000000000000000"
            )
        );
        assertTrue(success, "function call failed");
    }
}
