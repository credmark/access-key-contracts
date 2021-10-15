// SPDX-License-Identifier: MIT

interface IRewardsPool {
    function issueRewards() external;
    function unissuedRewards() external view returns(uint);
}