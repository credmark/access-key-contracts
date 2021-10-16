// SPDX-License-Identifier: MIT
pragma solidity ^0.8.2;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./IRewardsPool.sol";

contract RewardsPool is IRewardsPool, Ownable {
    using SafeMath for uint256;
    IERC20 public stakedCredmark;
    IERC20 public credmark;

    uint256 public lastEmitted;
    uint256 public endTime;

    bool public started;

    event RewardsIssued(uint256 amount);

    constructor(IERC20 _credmark, IERC20 _stakedCredmark) {
        stakedCredmark = _stakedCredmark;
        credmark = _credmark;
    }

    function start() public onlyOwner{
        require(!started, "Contract Already Started");
        lastEmitted = block.timestamp;
    }

    function setEndTime(uint _endTime) public onlyOwner {
        if(endTime > 0){
            issueRewards();
        }
        endTime = _endTime;
    }

    function issueRewards() override public {
        uint rewardsAmount = unissuedRewards();
        if (rewardsAmount == 0){
            return;
        }
        credmark.transfer(address(stakedCredmark), rewardsAmount);
        lastEmitted = block.timestamp;
        emit RewardsIssued(rewardsAmount);
    }

    function unissuedRewards() override public view returns (uint) {
        uint mostRecentRewardTime = block.timestamp;
        if(block.timestamp > endTime) {
            mostRecentRewardTime = endTime;
        }
        uint balance = credmark.balanceOf(address(this));
        uint rewardsAmount = balance.mul(block.timestamp - lastEmitted).div(endTime - lastEmitted);
        return rewardsAmount;
    }
}