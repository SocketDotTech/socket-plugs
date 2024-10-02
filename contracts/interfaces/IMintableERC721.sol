// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

interface IMintableERC721 {
    function mint(address receiver_, uint256 id_) external;

    function burn(address burner_, uint256 id_) external;
}
