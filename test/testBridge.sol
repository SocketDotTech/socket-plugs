pragma solidity 0.8.13;
import "forge-std/Test.sol";
import "forge-std/console.sol";

import "../contracts/bridge/Controller.sol";
import "../contracts/bridge/Vault.sol";

contract TestInbound is Test {
    Controller public controller;
    Vault public vault;
    uint256 fork;
    address constant user = 0x44A44837894B5eDC2Bde64567FC62599b3b88F4C;
    address constant _connector = 0x0f7d2F0b5C6973cC378ceD768bbb54d75B48a461;
    address constant hub = 0x70659628aCd497ee492b9D5fFe3d6A0a9B60Ec82;

    function setUp() external {
        // fork = vm.createFork(
        //     "https://l2-aevo-testnet-k1zx5a2ajj.t.conduit.xyz/"
        // );

        vault = Vault(hub);
    }

    // function testBridgeMsg() external {
    //     vm.selectFork(fork);
    //     vm.prank(user);
    //     vault.bridge(
    //         address(user),
    //         0,
    //         500000,
    //         _connector,
    //         new bytes(0),
    //         new bytes(0)
    //     );
    // }
}
