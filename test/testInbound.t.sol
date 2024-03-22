pragma solidity 0.8.13;
import "forge-std/Test.sol";
import "forge-std/console.sol";


import "../contracts/hub/Controller.sol";


contract TestInbound is Test {
    Controller public controller;
    uint256 fork;
    address constant _connector = 0x17DF75CA38a39ba65B68ed935A86D1D61BB46c80;
    function setUp() external {
        
         fork =  vm.createFork("https://l2-aevo-testnet-k1zx5a2ajj.t.conduit.xyz/");
        controller = Controller(0x0FFee9dBEC6cd9C0dcB851c9A53e38104aAadbCD);

    }
    function testInbound() external {

        vm.selectFork(fork);
        vm.startPrank(_connector);
        controller.receiveInbound(uint32(0x00AA37DC),
        bytes(hex"00000000000000000000000044a44837894b5edc2bde64567fc62599b3b88f4c000000000000000000000000000000000000000000000000000000000000000000aa37dc17df75ca38a39ba65b68ed935a86d1d61bb46c80000000000000005a00000000000000000000000000000000000000000000000000000000000000800000000000000000000000000000000000000000000000000000000000000000")
        );
    }
}

