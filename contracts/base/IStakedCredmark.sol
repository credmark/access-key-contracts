// SPDX-License-Identifier: MIT
pragma solidity ^0.8.2;

interface IStakedCredmark{
    function setRewardsPool(address rewardsPool) external;
    function cmkTotalSupply() external view returns (uint256);
    function cmkBalanceOf(address account) external view returns (uint256);
    function sharesToCmk(uint amount) external view returns (uint cmkAmount);
    function cmkToShares(uint amount) external view returns (uint sharesAmount);
    function createShare(uint256 _amount) external returns (uint);
    function removeShare(uint256 _share) external;
}