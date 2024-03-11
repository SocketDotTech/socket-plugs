pragma solidity 0.8.13;

import "./Setup.sol";

// contract TestYieldBridge is SetupYieldBridge {
//     function _beforeDeposit(uint256 amount, address to) internal {
//         vm.prank(_admin);
//         _token.mint(to, amount);
//     }

//     function _deposit(
//         uint256 depositAmount,
//         uint32 chainSlug,
//         address depositor,
//         address receiver
//     ) internal {
//         vm.startPrank(depositor);
//         _token.approve(address(_yieldVault), depositAmount);
//         _socket.setLocalSlug(chainSlug);
//         _yieldVault.deposit(
//             receiver,
//             depositAmount,
//             MSG_GAS_LIMIT,
//             address(_fastVaultConnector)
//         );
//     }

//     function _beforeWithdraw(
//         uint256 amount,
//         address to,
//         uint32 chainSlug,
//         address receiver
//     ) internal {
//         _beforeDeposit(amount, to);
//         _deposit(amount, chainSlug, to, receiver);
//     }

//     function _withdraw(
//         uint256 withdrawAmount,
//         uint32 chainSlug,
//         address withdrawer,
//         address receiver
//     ) internal {
//         vm.startPrank(withdrawer);
//         _socket.setLocalSlug(chainSlug);
//         _yieldToken.withdraw(
//             receiver,
//             withdrawAmount,
//             MSG_GAS_LIMIT,
//             address(_fastControllerConnector)
//         );
//     }

//     // deposits
//     function testFirstDeposit() external {
//         uint256 depositAmount = 100;

//         _beforeDeposit(depositAmount, _raju);
//         uint256 rajuBalBefore = _token.balanceOf(_raju);
//         uint256 ramuBalBefore = _yieldToken.balanceOf(_ramu);
//         uint256 vaultBalBefore = _yieldVault.totalAssets();
//         uint256 tokenSupplyBefore = _yieldToken.totalSupply();

//         assertTrue(rajuBalBefore >= depositAmount, "Raju got no balance");

//         _deposit(depositAmount, _chainSlug, _raju, _ramu);

//         uint256 rajuBalAfter = _token.balanceOf(_raju);
//         uint256 ramuBalAfter = _yieldToken.balanceOf(_ramu);
//         uint256 vaultBalAfter = _yieldVault.totalAssets();
//         uint256 tokenSupplyAfter = _yieldToken.totalSupply();

//         assertEq(rajuBalAfter, rajuBalBefore - depositAmount, "Raju bal sus");
//         assertEq(ramuBalAfter, ramuBalBefore + depositAmount, "Ramu bal sus");
//         assertEq(
//             vaultBalAfter,
//             vaultBalBefore + depositAmount,
//             "SuperTokenVault bal sus"
//         );
//         assertEq(
//             tokenSupplyAfter,
//             tokenSupplyBefore + depositAmount,
//             "token supply sus"
//         );
//     }

//     function testSecondDepositWithConstantYield() external {
//         // first deposit
//         uint256 initialDepositAmount = 10;
//         _beforeDeposit(initialDepositAmount, _raju);
//         _deposit(initialDepositAmount, _chainSlug, _raju, _ramu);

//         uint256 depositAmount = 20;
//         _beforeDeposit(depositAmount, _raju);
//         uint256 rajuBalBefore = _token.balanceOf(_raju);
//         uint256 ramuBalBefore = _yieldToken.balanceOf(_ramu);
//         uint256 vaultBalBefore = _yieldVault.totalAssets();
//         uint256 tokenSupplyBefore = _yieldToken.totalSupply();

//         assertTrue(rajuBalBefore >= depositAmount, "Raju got no balance");
//         _deposit(depositAmount, _chainSlug, _raju, _ramu);

//         uint256 rajuBalAfter = _token.balanceOf(_raju);
//         uint256 ramuBalAfter = _yieldToken.balanceOf(_ramu);
//         uint256 vaultBalAfter = _yieldVault.totalAssets();
//         uint256 tokenSupplyAfter = _yieldToken.totalSupply();

//         assertEq(rajuBalAfter, rajuBalBefore - depositAmount, "Raju bal sus");
//         assertEq(ramuBalAfter, ramuBalBefore + depositAmount, "Ramu bal sus");
//         assertEq(
//             vaultBalAfter,
//             vaultBalBefore + depositAmount,
//             "SuperTokenVault bal sus"
//         );
//         assertEq(
//             tokenSupplyAfter,
//             tokenSupplyBefore + depositAmount,
//             "token supply sus"
//         );
//     }

//     function testSecondDepositWithIncreasedYield() external {
//         uint256 initialDepositAmount = 100;
//         _beforeDeposit(initialDepositAmount, _raju);
//         _deposit(initialDepositAmount, _chainSlug, _raju, _raju);

//         uint256 depositAmount = 100;
//         _beforeDeposit(depositAmount, _raju);
//         uint256 rajuBalBefore = _token.balanceOf(_raju);
//         uint256 ramuBalBefore = _yieldToken.balanceOf(_ramu);
//         uint256 vaultBalBefore = _yieldVault.totalAssets();

//         // add 10% yield
//         uint256 strategyYield = 10;
//         _beforeDeposit(strategyYield, address(_strategy));

//         uint256 expectedMintAmount = (initialDepositAmount * depositAmount) /
//             (initialDepositAmount + strategyYield);
//         uint256 expectedBalance = ((initialDepositAmount +
//             depositAmount +
//             strategyYield) * expectedMintAmount) /
//             (expectedMintAmount + initialDepositAmount);

//         _deposit(depositAmount, _chainSlug, _raju, _ramu);

//         uint256 rajuBalAfter = _token.balanceOf(_raju);
//         uint256 ramuBalAfter = _yieldToken.balanceOf(_ramu);
//         uint256 vaultBalAfter = _yieldVault.totalAssets();
//         uint256 tokenSupplyAfter = _yieldToken.totalSupply();

//         assertEq(rajuBalAfter, rajuBalBefore - depositAmount, "Raju bal sus");
//         assertEq(ramuBalAfter, ramuBalBefore + expectedBalance, "Ramu bal sus");
//         assertEq(
//             vaultBalAfter,
//             vaultBalBefore + depositAmount + strategyYield,
//             "SuperTokenVault bal sus"
//         );
//         assertEq(
//             tokenSupplyAfter,
//             depositAmount * 2 + strategyYield,
//             "token supply sus"
//         );
//     }

//     // todo
//     // function testSecondDepositWithDecreasedYield() external {
//     //     uint256 depositAmount = 100;

//     //     _beforeDeposit(depositAmount, _raju);
//     //     _deposit(depositAmount, _chainSlug, _raju, _raju);

//     //     uint256 rajuBalBefore = _token.balanceOf(_raju);
//     //     uint256 ramuBalBefore = _yieldToken.balanceOf(_ramu);
//     //     uint256 vaultBalBefore = _yieldVault.totalAssets();
//     //     uint256 tokenSupplyBefore = _yieldToken.totalSupply();

//     //     assertTrue(rajuBalBefore >= depositAmount, "Raju got no balance");

//     // }

//     // withdraws
//     function testWithdrawWithNoYieldChange() external {
//         uint256 depositAmount = 100;
//         uint256 withdrawAmount = 50;

//         _beforeDeposit(depositAmount, _raju);
//         _deposit(depositAmount, _chainSlug, _raju, _raju);

//         uint256 rajuBalBefore = _yieldToken.balanceOf(_raju);
//         uint256 ramuBalBefore = _token.balanceOf(_ramu);
//         uint256 vaultBalBefore = _yieldVault.totalAssets();
//         assertTrue(rajuBalBefore >= withdrawAmount, "Raju got no balance");

//         _withdraw(withdrawAmount, _otherChainSlug, _raju, _ramu);

//         uint256 rajuBalAfter = _yieldToken.balanceOf(_raju);
//         uint256 ramuBalAfter = _token.balanceOf(_ramu);
//         uint256 vaultBalAfter = _yieldVault.totalAssets();

//         assertEq(rajuBalAfter, rajuBalBefore - withdrawAmount, "Raju bal sus");
//         assertEq(ramuBalAfter, ramuBalBefore + withdrawAmount, "Ramu bal sus");
//         assertEq(
//             vaultBalAfter,
//             vaultBalBefore - withdrawAmount,
//             "SuperTokenVault bal sus"
//         );
//     }

//     function testWithdrawAll() external {
//         uint256 depositAmount = 100;
//         uint256 withdrawAmount = depositAmount;

//         _beforeDeposit(depositAmount, _raju);
//         _deposit(depositAmount, _chainSlug, _raju, _raju);

//         uint256 rajuBalBefore = _yieldToken.balanceOf(_raju);
//         uint256 ramuBalBefore = _token.balanceOf(_ramu);
//         uint256 vaultBalBefore = _yieldVault.totalAssets();
//         assertTrue(rajuBalBefore >= withdrawAmount, "Raju got no balance");

//         _withdraw(withdrawAmount, _otherChainSlug, _raju, _ramu);

//         uint256 rajuBalAfter = _yieldToken.balanceOf(_raju);
//         uint256 ramuBalAfter = _token.balanceOf(_ramu);
//         uint256 vaultBalAfter = _yieldVault.totalAssets();

//         assertEq(rajuBalAfter, rajuBalBefore - withdrawAmount, "Raju bal sus");
//         assertEq(ramuBalAfter, ramuBalBefore + withdrawAmount, "Ramu bal sus");
//         assertEq(
//             vaultBalAfter,
//             vaultBalBefore - withdrawAmount,
//             "SuperTokenVault bal sus"
//         );
//     }

//     // todo fix
//     function testWithdrawWithIncreasedYield() external {
//         uint256 depositAmount = 100;
//         uint256 withdrawAmount = 50;

//         _beforeWithdraw(depositAmount, _raju, _chainSlug, _raju);
//         uint256 strategyYield = 10;
//         _beforeDeposit(strategyYield, address(_strategy));
//         _yieldVault.syncToAppChain(MSG_GAS_LIMIT, address(_fastVaultConnector));

//         uint256 rajuBalBefore = _yieldToken.balanceOf(_raju);
//         uint256 ramuBalBefore = _token.balanceOf(_ramu);
//         uint256 vaultBalBefore = _yieldVault.totalAssets();

//         assertTrue(rajuBalBefore >= withdrawAmount, "Raju got no balance");
//         console.log(rajuBalBefore);

//         _withdraw(withdrawAmount, _otherChainSlug, _raju, _ramu);

//         uint256 rajuBalAfter = _yieldToken.balanceOf(_raju);
//         uint256 ramuBalAfter = _token.balanceOf(_ramu);
//         uint256 vaultBalAfter = _yieldVault.totalAssets();

//         console.log(rajuBalAfter);

//         assertEq(rajuBalAfter, rajuBalBefore - withdrawAmount, "Raju bal sus");
//         assertEq(ramuBalAfter, ramuBalBefore + withdrawAmount, "Ramu bal sus");
//         assertEq(
//             vaultBalAfter,
//             vaultBalBefore - withdrawAmount + strategyYield,
//             "SuperTokenVault bal sus"
//         );
//     }

//     // todo
//     // function testWithdrawWithDecreasedYield() external {}

//     // admin
//     function testDisconnectSocket() external {
//         hoax(_admin);
//         _fastVaultConnector.disconnect();

//         uint256 depositAmount = 100;
//         _token.mint(_raju, depositAmount);

//         vm.startPrank(_raju);
//         _token.approve(address(_yieldVault), depositAmount);

//         vm.expectRevert();
//         _yieldVault.deposit(
//             _raju,
//             depositAmount,
//             MSG_GAS_LIMIT,
//             address(_fastVaultConnector)
//         );
//     }
// }
