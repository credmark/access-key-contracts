// SPDX-License-Identifier: MIT
pragma solidity ^0.8.2;

interface IStakedCredmark {
    function setRewardsPool(address rewardsPool) external;

    function cmkBalance() external view returns (uint256);

    function cmkBalanceOf(address account) external view returns (uint256);

    function sharesToCmk(uint256 amount) external view returns (uint256 cmkAmount);

    function cmkToShares(uint256 amount) external view returns (uint256 sharesAmount);

    function createShare(uint256 _amount) external returns (uint256);

    function removeShare(uint256 _share) external;
}
