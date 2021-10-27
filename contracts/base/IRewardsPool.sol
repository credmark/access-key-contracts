// SPDX-License-Identifier: MIT
pragma solidity ^0.8.2;

interface IRewardsPool {
    function getLastEmitted() external view returns (uint256);

    function issueRewards() external;

    function unissuedRewards() external view returns (uint256);
}
