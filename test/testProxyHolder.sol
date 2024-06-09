pragma solidity 0.8.13;
import "forge-std/Test.sol";
import "forge-std/console.sol";

import "../contracts/utils/ProxyTokenHolder.sol";

contract TestInbound is Test {
    ProxyTokenHolder public tokenHolder;
    uint256 fork;
    address constant user = 0x44A44837894B5eDC2Bde64567FC62599b3b88F4C;
    address constant _tokenHolder = 0xeCeBbf5294aF11ff766c1d535Ea8Fa440e44B296;

    function setUp() external {
        fork = vm.createFork("https://sepolia.syndr.com/http");

        tokenHolder = ProxyTokenHolder(_tokenHolder);
    }

    function testTokenHolder() external {
        vm.selectFork(fork);
        vm.prank(user);
        tokenHolder.bridgeTokens{value: 0}(100, user);
    }
}
