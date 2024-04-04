// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "forge-std/Test.sol";
import "../../contracts/token/yield-token/YieldToken.sol";

contract TestYieldToken is Test {
    YieldToken token;
    bytes32 constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 constant HOOK_ROLE = keccak256("HOOK_ROLE");
    // keccak256("Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)");
    bytes32 public constant PERMIT_TYPEHASH =
        0x6e71edae12b1b97f4d1f60370fef10105fa2faae0126114a169c64845d6126c9;

    address admin = vm.addr(0x1);
    address minter = vm.addr(0x2);
    address hook = vm.addr(0x3);
    address alice = vm.addr(0x4);
    address bob = vm.addr(0x5);

    function setUp() public {
        vm.startPrank(admin);
        token = new YieldToken("moon", "MOON", 18);
        token.grantRole(MINTER_ROLE, minter);
        token.grantRole(HOOK_ROLE, hook);
        vm.stopPrank();
    }

    function _mint(address receiver, uint256 amount) internal {
        if (amount == 0) return;
        uint256 totalU = token.totalUnderlyingAssets() + amount;

        hoax(minter);
        token.mint(receiver, amount);
        hoax(hook);
        token.updateTotalUnderlyingAssets(totalU);
    }

    function _burn(address from, uint256 amount) internal {
        if (amount == 0) return;
        uint256 totalU = token.totalUnderlyingAssets() - amount;

        hoax(hook);
        token.updateTotalUnderlyingAssets(totalU);
        hoax(minter);
        token.burn(from, amount);
    }

    function testName() external {
        assertEq("moon", token.name());
    }

    function testSymbol() external {
        assertEq("MOON", token.symbol());
    }

    function testMint() public {
        _mint(alice, 2e18);
        assertEq(token.totalSupply(), token.balanceOf(alice));
    }

    function testBurn() public {
        _mint(alice, 10e18);
        assertEq(token.balanceOf(alice), 10e18);

        _burn(alice, 8e18);

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

    function testDecreaseAllowance() external {
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

    function testPermit(uint256 amount_) external {
        uint256 ownerPrivateKey = 1000;
        address owner = vm.addr(ownerPrivateKey);

        uint256 amount = token.convertToShares(amount_);
        bytes32 digest = keccak256(
            abi.encodePacked(
                "\x19\x01",
                token.DOMAIN_SEPARATOR(),
                keccak256(
                    abi.encode(
                        PERMIT_TYPEHASH,
                        owner,
                        alice,
                        amount,
                        token.nonces(owner),
                        1 days
                    )
                )
            )
        );
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(ownerPrivateKey, digest);

        token.permit(owner, alice, amount, 1 days, v, r, s);
        assertEq(token.allowance(owner, alice), amount);
    }

    function testFailBurnFromZero() external {
        _burn(address(0), 1e18);
    }

    function testFailBurnInsufficientBalance() external {
        testMint();
        _burn(alice, 3e18);
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
        vm.assume(amount < type(uint128).max);

        _mint(to, amount);
        assertEq(token.totalSupply(), token.balanceOf(to));
    }

    function testFuzzBurn(
        address from,
        uint256 mintAmount,
        uint256 burnAmount
    ) external {
        vm.assume(from != address(0)); // from address must not zero
        vm.assume(mintAmount < type(uint128).max);
        burnAmount = bound(burnAmount, 0, mintAmount); // if burnAmount > mintAmount then bound burnAmount to 0 to mintAmount

        _mint(from, mintAmount);
        _burn(from, burnAmount);

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
        vm.assume(amount < type(uint128).max);

        _mint(address(this), amount);

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
        vm.assume(approval < type(uint128).max);

        amount = bound(amount, 0, approval);
        _mint(from, amount);

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

        _mint(to, mintAmount);
        _burn(to, burnAmount);
    }

    function testFailTransferInsufficientBalance(
        address to,
        uint256 mintAmount,
        uint256 sendAmount
    ) external {
        sendAmount = bound(sendAmount, mintAmount + 1, type(uint256).max);
        _mint(address(this), mintAmount);
        token.transfer(to, sendAmount);
    }

    function testFailFuzzTransferFromInsufficientApprove(
        address from,
        address to,
        uint256 approval,
        uint256 amount
    ) external {
        amount = bound(amount, approval + 1, type(uint256).max);

        _mint(from, amount);
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
        _mint(from, mintAmount);
        vm.prank(from);
        token.approve(address(this), type(uint256).max);

        token.transferFrom(from, to, sentAmount);
    }

    function testFuzzMintAmountCalc(address to, uint256 amount) external {
        vm.assume(to != address(0));
        vm.assume(to != address(this));
        vm.assume(amount < type(uint128).max);

        uint256 supply = 100;
        _mint(admin, supply);

        uint256 currentTotalU = token.totalUnderlyingAssets();
        hoax(hook);
        token.updateTotalUnderlyingAssets(currentTotalU + amount);

        uint256 mintAmount = token.calculateMintAmount(amount);
        uint256 expected = (amount * supply) / currentTotalU;
        assertEq(expected, mintAmount);
    }

    function testFuzzShareCalc(address to, uint256 amount) external {
        vm.assume(to != address(0));
        vm.assume(to != address(this));
        vm.assume(amount < type(uint128).max);

        uint256 supply = 100;
        _mint(admin, supply);

        uint256 shares = token.convertToShares(amount);
        uint256 expected = (amount * supply) / token.totalUnderlyingAssets();
        assertEq(expected, shares);
    }

    function testFuzzAssetCalc(address to, uint256 amount) external {
        vm.assume(to != address(0));
        vm.assume(to != address(this));
        vm.assume(amount < type(uint128).max);

        uint256 supply = 100;
        _mint(admin, supply);

        uint256 asset = token.convertToAssets(amount);
        uint256 expected = (amount * token.totalUnderlyingAssets()) / supply;
        assertEq(expected, asset);
    }
}
