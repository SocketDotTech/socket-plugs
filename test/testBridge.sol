pragma solidity 0.8.13;
import "forge-std/Test.sol";
import "forge-std/console.sol";

import "../contracts/hub/Controller.sol";
import "../contracts/hub/Vault.sol";

contract TestInbound is Test {
    Controller public controller;
    Vault public vault;
    uint256 fork;
    address constant user = 0x44A44837894B5eDC2Bde64567FC62599b3b88F4C;
    address constant _connector = 0x0D806Ad65fd85Ee3f86c9a7ea31708b657AB5928;
    address constant hub = 0x59789e155D5973b59986CeB5d522b780Ca425ae8;

    function setUp() external {
        // fork = vm.createFork(
        //     "https://l2-aevo-testnet-k1zx5a2ajj.t.conduit.xyz/"
        // );

        vault = Vault(hub);
    }

    function testBridgeMsg() external {
        vm.selectFork(fork);
        vm.prank(user);
        vault.bridge(
            address(user),
            0,
            500000,
            _connector,
            new bytes(0),
            new bytes(0)
        );
    }
}
