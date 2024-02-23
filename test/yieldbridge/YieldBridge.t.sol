pragma solidity 0.8.13;

import "./Setup.sol";

contract TestYieldBridge is SetupYieldBridge {
    function testYieldVaultDeposit() external {
        uint256 depositAmount = 100;

        vm.prank(_admin);
        _token.mint(_raju, depositAmount);

        uint256 rajuBalBefore = _token.balanceOf(_raju);
        uint256 ramuBalBefore = _yieldToken.balanceOf(_ramu);
        uint256 vaultBalBefore = _token.balanceOf(address(_yieldVault));
        uint256 tokenSupplyBefore = _yieldToken.totalSupply();

        assertTrue(rajuBalBefore >= depositAmount, "Raju got no balance");

        vm.startPrank(_raju);
        _token.approve(address(_yieldVault), depositAmount);
        _socket.setLocalSlug(_chainSlug);
        _yieldVault.deposit(
            _ramu,
            depositAmount,
            MSG_GAS_LIMIT,
            address(_fastVaultConnector)
        );

        uint256 rajuBalAfter = _token.balanceOf(_raju);
        uint256 ramuBalAfter = _yieldToken.balanceOf(_ramu);
        uint256 vaultBalAfter = _yieldVault.totalAssets();
        uint256 tokenSupplyAfter = _yieldToken.totalSupply();

        assertEq(rajuBalAfter, rajuBalBefore - depositAmount, "Raju bal sus");
        assertEq(ramuBalAfter, ramuBalBefore + depositAmount, "Ramu bal sus");
        assertEq(
            vaultBalAfter,
            vaultBalBefore + depositAmount,
            "SuperTokenVault bal sus"
        );
        assertEq(
            tokenSupplyAfter,
            tokenSupplyBefore + depositAmount,
            "token supply sus"
        );
    }

    function testYieldVaultWithdraw() external {
        uint256 depositAmount = 100;
        uint256 withdrawAmount = 50;

        vm.prank(_admin);
        _token.mint(_raju, depositAmount);

        vm.startPrank(_raju);
        _token.approve(address(_yieldVault), depositAmount);
        _socket.setLocalSlug(_chainSlug);
        _yieldVault.deposit(
            _raju,
            depositAmount,
            MSG_GAS_LIMIT,
            address(_fastVaultConnector)
        );

        uint256 rajuBalBefore = _yieldToken.balanceOf(_raju);
        uint256 ramuBalBefore = _token.balanceOf(_ramu);
        uint256 vaultBalBefore = _yieldVault.totalAssets();

        assertTrue(rajuBalBefore >= withdrawAmount, "Raju got no balance");

        vm.startPrank(_raju);
        _socket.setLocalSlug(_otherChainSlug);
        _yieldToken.withdraw(
            _ramu,
            withdrawAmount,
            MSG_GAS_LIMIT,
            address(_fastControllerConnector)
        );

        uint256 rajuBalAfter = _yieldToken.balanceOf(_raju);
        uint256 ramuBalAfter = _token.balanceOf(_ramu);
        uint256 vaultBalAfter = _yieldVault.totalAssets();

        assertEq(rajuBalAfter, rajuBalBefore - withdrawAmount, "Raju bal sus");
        assertEq(ramuBalAfter, ramuBalBefore + withdrawAmount, "Ramu bal sus");
        assertEq(
            vaultBalAfter,
            vaultBalBefore - withdrawAmount,
            "SuperTokenVault bal sus"
        );
    }

    function testYieldVaultWithdrawWithYield() external {
        uint256 depositAmount = 100;
        uint256 withdrawAmount = 50;

        vm.prank(_admin);
        _token.mint(_raju, depositAmount);

        vm.startPrank(_raju);
        _token.approve(address(_yieldVault), depositAmount);
        _socket.setLocalSlug(_chainSlug);
        _yieldVault.deposit(
            _raju,
            depositAmount,
            MSG_GAS_LIMIT,
            address(_fastVaultConnector)
        );

        uint256 rajuBalBefore = _yieldToken.balanceOf(_raju);
        uint256 ramuBalBefore = _token.balanceOf(_ramu);
        uint256 vaultBalBefore = _yieldVault.totalAssets();

        assertTrue(rajuBalBefore >= withdrawAmount, "Raju got no balance");

        vm.startPrank(_raju);
        _socket.setLocalSlug(_otherChainSlug);
        _yieldToken.withdraw(
            _ramu,
            withdrawAmount,
            MSG_GAS_LIMIT,
            address(_fastControllerConnector)
        );

        uint256 rajuBalAfter = _yieldToken.balanceOf(_raju);
        uint256 ramuBalAfter = _token.balanceOf(_ramu);
        uint256 vaultBalAfter = _yieldVault.totalAssets();

        assertEq(rajuBalAfter, rajuBalBefore - withdrawAmount, "Raju bal sus");
        assertEq(ramuBalAfter, ramuBalBefore + withdrawAmount, "Ramu bal sus");
        assertEq(
            vaultBalAfter,
            vaultBalBefore - withdrawAmount,
            "SuperTokenVault bal sus"
        );
    }

    function testDisconnectSocket() external {
        hoax(_admin);
        _fastVaultConnector.disconnect();

        uint256 depositAmount = 100;
        _token.mint(_raju, depositAmount);

        vm.startPrank(_raju);
        _token.approve(address(_yieldVault), depositAmount);

        vm.expectRevert();
        _yieldVault.deposit(
            _raju,
            depositAmount,
            MSG_GAS_LIMIT,
            address(_fastVaultConnector)
        );
    }
}
