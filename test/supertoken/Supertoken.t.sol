// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

import "forge-std/Test.sol";
import "../../contracts/token/SuperToken.sol";

contract SuperTokenTest is Test {
    SuperToken public superToken;
    address public owner;
    address public initialSupplyHolder;
    address public user;
    address public controller;

    uint256 constant INITIAL_SUPPLY = 1000000 ether;

    function setUp() public {
        owner = address(this);
        initialSupplyHolder = address(0x1);
        user = address(0x2);
        controller = address(0x3);

        superToken = new SuperToken(
            "Aavegotchi Socket GHST",
            "sGHST",
            18,
            initialSupplyHolder,
            owner,
            INITIAL_SUPPLY
        );

        superToken.grantRole(superToken.CONTROLLER_ROLE(), controller);
    }

    function testInitialState() public {
        assertEq(superToken.name(), "Aavegotchi Socket GHST");
        assertEq(superToken.symbol(), "sGHST");
        assertEq(superToken.decimals(), 18);
        assertEq(superToken.balanceOf(initialSupplyHolder), INITIAL_SUPPLY);
        assertTrue(superToken.hasRole(superToken.RESCUE_ROLE(), owner));
    }

    function testBurn() public {
        vm.prank(controller);
        superToken.burn(initialSupplyHolder, 1000 ether);
        assertEq(
            superToken.balanceOf(initialSupplyHolder),
            INITIAL_SUPPLY - 1000 ether
        );
    }

    function testMint() public {
        vm.prank(controller);
        superToken.mint(user, 500 ether);
        assertEq(superToken.balanceOf(user), 500 ether);
    }

    function testUnauthorizedBurn() public {
        vm.prank(user);
        vm.expectRevert(
            abi.encodeWithSelector(
                AccessControl.NoPermit.selector,
                superToken.CONTROLLER_ROLE()
            )
        );
        superToken.burn(initialSupplyHolder, 1000 ether);
    }

    function testUnauthorizedMint() public {
        vm.prank(user);
        vm.expectRevert(
            abi.encodeWithSelector(
                AccessControl.NoPermit.selector,
                superToken.CONTROLLER_ROLE()
            )
        );
        superToken.mint(user, 500 ether);
    }

    function testDeposit() public {
        vm.deal(user, 1 ether);
        vm.prank(user);
        superToken.deposit{value: 1 ether}();
        assertEq(superToken.balanceOf(user), 1 ether);
        assertEq(address(superToken).balance, 1 ether);
    }

    function testWithdraw() public {
        vm.deal(address(superToken), 1 ether);
        vm.prank(controller);
        superToken.mint(user, 1 ether);

        uint256 initialBalance = user.balance;
        vm.prank(user);
        superToken.withdraw(1 ether);

        assertEq(superToken.balanceOf(user), 0);
        assertEq(user.balance, initialBalance + 1 ether);
        assertEq(address(superToken).balance, 0);
    }

    function testReceive() public {
        vm.deal(user, 1 ether);
        vm.prank(user);
        (bool success, ) = address(superToken).call{value: 1 ether}("");
        assertTrue(success);
        assertEq(superToken.balanceOf(user), 1 ether);
        assertEq(address(superToken).balance, 1 ether);
    }
}
