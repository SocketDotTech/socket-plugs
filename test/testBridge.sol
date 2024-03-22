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
    address constant _connector = 0x19fF5EB35BbF1525B29ae96167B0c94aC5387DEd;

    function setUp() external {
        fork = vm.createFork(
            "https://aged-practical-general.optimism-sepolia.quiknode.pro/344829e65181310b0218877e756185c9c4d36508/"
        );
        controller = Controller(0x0FFee9dBEC6cd9C0dcB851c9A53e38104aAadbCD);
        vault = Vault(0x862568fABF9eaca1d419c93Ca5d9D59b4608137c);
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
