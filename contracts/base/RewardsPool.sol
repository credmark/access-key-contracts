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

    modifier hasStarted() {
        require(started, "Pool has not started");
        _;
    }

    constructor(IERC20 _credmark, IERC20 _stakedCredmark) {
        stakedCredmark = _stakedCredmark;
        credmark = _credmark;
    }

    function start(uint256 _endTime) external onlyOwner {
        require(!started, "Contract Already Started");
        require(_endTime > block.timestamp, "End time is not in future");

        lastEmitted = block.timestamp;
        endTime = _endTime;
        started = true;
    }

    function setEndTime(uint256 _endTime) external onlyOwner {
        require(_endTime > block.timestamp, "End time is not in future");

        if (endTime > 0) {
            issueRewards();
        }

        endTime = _endTime;
    }

    function getLastEmitted() external view override returns (uint256) {
        return lastEmitted;
    }

    function issueRewards() public override hasStarted {
        uint256 rewardsAmount = unissuedRewards();
        if (rewardsAmount == 0) {
            return;
        }
        credmark.transfer(address(stakedCredmark), rewardsAmount);
        lastEmitted = block.timestamp;
        emit RewardsIssued(rewardsAmount);
    }

    function unissuedRewards() public view override hasStarted returns (uint256) {
        if (endTime <= lastEmitted) {
            return 0;
        }

        uint256 lastRewardTime = block.timestamp;
        if (block.timestamp > endTime) {
            lastRewardTime = endTime;
        }

        uint256 balance = credmark.balanceOf(address(this));
        uint256 rewardsAmount = balance.mul(lastRewardTime - lastEmitted).div(endTime - lastEmitted);
        return rewardsAmount;
    }
}
