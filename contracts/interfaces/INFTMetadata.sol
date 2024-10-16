// SPDX-License-Identifier: MIT
pragma solidity ^0.8.3;

interface INFTMetadata {
    function setMetadata(
        uint256 tokenId,
        bytes memory data,
        bool isMint
    ) external;
}
