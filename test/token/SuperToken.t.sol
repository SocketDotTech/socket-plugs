// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "forge-std/Test.sol";
import "../../contracts/token/SuperToken.sol";

contract TestSuperToken is Test {
    SuperToken token;
    bytes32 constant CONTROLLER_ROLE = keccak256("CONTROLLER_ROLE");

    address admin = vm.addr(0x1);
    address alice = vm.addr(0x2);
    address bob = vm.addr(0x3);

    function setUp() public {
        token = new SuperToken("Moon", "MOON", 18, admin, admin, 0);

        hoax(admin);
        token.grantRole(CONTROLLER_ROLE, admin);
    }

    function testName() external {
        assertEq("Moon", token.name());
    }

    function testSymbol() external {
        assertEq("MOON", token.symbol());
    }

    function testMint() public {
        hoax(admin);
        token.mint(alice, 2e18);
        assertEq(token.totalSupply(), token.balanceOf(alice));
    }

    function testBurn() public {
        hoax(admin);
        token.mint(alice, 10e18);
        assertEq(token.balanceOf(alice), 10e18);

        hoax(admin);
        token.burn(alice, 8e18);

        assertEq(token.totalSupply(), 2e18);
        assertEq(token.balanceOf(alice), 2e18);
    }

    function testApprove() public {
        assertTrue(token.approve(alice, 1e18));
        assertEq(token.allowance(address(this), alice), 1e18);
    }

    function testIncreaseAllowance() external {
        assertEq(token.allowance(address(this), alice), 0);
        assertTrue(token.approve(alice, 2e18));
        assertEq(token.allowance(address(this), alice), 2e18);
    }

    function testDescreaseAllowance() external {
        testApprove();
        assertTrue(token.approve(alice, 0.5e18));
        assertEq(token.allowance(address(this), alice), 0.5e18);
    }

    function testTransfer() external {
        testMint();
        vm.startPrank(alice);
        token.transfer(bob, 0.5e18);
        assertEq(token.balanceOf(bob), 0.5e18);
        assertEq(token.balanceOf(alice), 1.5e18);
        vm.stopPrank();
    }

    function testTransferFrom() external {
        testMint();
        vm.prank(alice);
        token.approve(address(this), 1e18);
        assertTrue(token.transferFrom(alice, bob, 0.7e18));
        assertEq(token.allowance(alice, address(this)), 1e18 - 0.7e18);
        assertEq(token.balanceOf(alice), 2e18 - 0.7e18);
        assertEq(token.balanceOf(bob), 0.7e18);
    }

    function testFailBurnFromZero() external {
        hoax(admin);
        token.burn(address(0), 1e18);
    }

    function testFailBurnInsufficientBalance() external {
        testMint();

        hoax(admin);
        token.burn(alice, 3e18);
    }

    function testFailTransferFromZeroAddress() external {
        testBurn();
        vm.prank(address(0));
        token.transfer(alice, 1e18);
    }

    function testFailTransferInsufficientBalance() external {
        testMint();
        vm.prank(alice);
        token.transfer(bob, 3e18);
    }

    function testFailTransferFromInsufficientApprove() external {
        testMint();
        vm.prank(alice);
        token.approve(address(this), 1e18);
        token.transferFrom(alice, bob, 2e18);
    }

    function testFailTransferFromInsufficientBalance() external {
        testMint();
        vm.prank(alice);
        token.approve(address(this), type(uint).max);

        token.transferFrom(alice, bob, 3e18);
    }

    /*****************************/
    /*      Fuzz Testing         */
    /*****************************/

    function testFuzzMint(address to, uint256 amount) external {
        vm.assume(to != address(0));

        hoax(admin);
        token.mint(to, amount);
        assertEq(token.totalSupply(), token.balanceOf(to));
    }

    function testFuzzBurn(
        address from,
        uint256 mintAmount,
        uint256 burnAmount
    ) external {
        vm.assume(from != address(0)); // from address must not zero
        burnAmount = bound(burnAmount, 0, mintAmount); // if burnAmount > mintAmount then bound burnAmount to 0 to mintAmount

        vm.startPrank(admin);
        token.mint(from, mintAmount);
        token.burn(from, burnAmount);
        vm.stopPrank();

        assertEq(token.totalSupply(), mintAmount - burnAmount);
        assertEq(token.balanceOf(from), mintAmount - burnAmount);
    }

    function testFuzzApprove(address to, uint256 amount) external {
        vm.assume(to != address(0));
        assertTrue(token.approve(to, amount));
        assertEq(token.allowance(address(this), to), amount);
    }

    function testFuzzTransfer(address to, uint256 amount) external {
        vm.assume(to != address(0));
        vm.assume(to != address(this));
        hoax(admin);
        token.mint(address(this), amount);

        assertTrue(token.transfer(to, amount));
        assertEq(token.balanceOf(address(this)), 0);
        assertEq(token.balanceOf(to), amount);
    }

    function testFuzzTransferFrom(
        address from,
        address to,
        uint256 approval,
        uint256 amount
    ) external {
        vm.assume(from != address(0));
        vm.assume(to != address(0));

        amount = bound(amount, 0, approval);
        hoax(admin);
        token.mint(from, amount);

        vm.prank(from);
        assertTrue(token.approve(address(this), approval));

        assertTrue(token.transferFrom(from, to, amount));
        assertEq(token.totalSupply(), amount);

        if (approval == type(uint256).max) {
            assertEq(token.allowance(from, address(this)), approval);
        } else {
            assertEq(token.allowance(from, address(this)), approval - amount);
        }

        if (from == to) {
            assertEq(token.balanceOf(from), amount);
        } else {
            assertEq(token.balanceOf(from), 0);
            assertEq(token.balanceOf(to), amount);
        }
    }

    function testFailFuzzBurnInsufficientBalance(
        address to,
        uint256 mintAmount,
        uint256 burnAmount
    ) external {
        burnAmount = bound(burnAmount, mintAmount + 1, type(uint256).max);

        token.mint(to, mintAmount);
        token.burn(to, burnAmount);
    }

    function testFailTransferInsufficientBalance(
        address to,
        uint256 mintAmount,
        uint256 sendAmount
    ) external {
        sendAmount = bound(sendAmount, mintAmount + 1, type(uint256).max);

        token.mint(address(this), mintAmount);
        token.transfer(to, sendAmount);
    }

    function testFailFuzzTransferFromInsufficientApprove(
        address from,
        address to,
        uint256 approval,
        uint256 amount
    ) external {
        amount = bound(amount, approval + 1, type(uint256).max);

        token.mint(from, amount);
        vm.prank(from);
        token.approve(address(this), approval);
        token.transferFrom(from, to, amount);
    }

    function testFailFuzzTransferFromInsufficientBalance(
        address from,
        address to,
        uint256 mintAmount,
        uint256 sentAmount
    ) external {
        sentAmount = bound(sentAmount, mintAmount + 1, type(uint256).max);

        token.mint(from, mintAmount);
        vm.prank(from);
        token.approve(address(this), type(uint256).max);

        token.transferFrom(from, to, sentAmount);
    }
}
