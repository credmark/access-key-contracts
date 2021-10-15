// SPDX-License-Identifier: MIT
pragma solidity ^0.8.2;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "./IRewardsPool.sol";

contract RewardsPool is IRewardsPool {
    using SafeMath for uint256;
    IERC20 public stakedCredmark;
    IERC20 public credmark;

    uint256 public lastEmitted;
    uint256 public endTime;

    event RewardsIssued(uint256 amount);

    constructor(IERC20 _credmark, IERC20 _stakedCredmark, uint _endTime) {
        stakedCredmark = _stakedCredmark;
        credmark = _credmark;
        endTime = _endTime;
        lastEmitted = block.timestamp;
    }

    function issueRewards() public {
        uint rewardsAmount = unissuedRewards();
        credmark.transfer(address(stakedCredmark), rewardsAmount);
        lastEmitted = block.timestamp;
        emit RewardsIssued(rewardsAmount);
    }

    function unissuedRewards() public view  returns (uint) {
        uint mostRecentRewardTime = block.timestamp;
        if(block.timestamp > endTime) {
            mostRecentRewardTime = endTime;
        }
        uint balance = credmark.balanceOf(address(this));
        uint rewardsAmount = balance.mul(block.timestamp - lastEmitted).div(endTime - lastEmitted);
        return rewardsAmount;
    }
}