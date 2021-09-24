// SPDX-License-Identifier: MIT
pragma solidity ^0.8.2;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";

contract StakePool {
    using Counters for Counters.Counter;
    Counters.Counter private _rewardCounter;
    address public sCMK;

    mapping (uint256 => StakeReward) private _stakeRewards;
    ERC20 public cmk;

    struct StakeReward {
        uint256 amount;
        uint256 duration;
        uint256 startTime;
    } 

    constructor(address _cmk) {
        cmk = ERC20(_cmk);
        sCMK = msg.sender;
        cmk.approve(sCMK, 100000000000000000000000000);
    }

    function addRewards(uint256 amount, uint256 duration, uint256 starttime) public {
        cmk.transferFrom(msg.sender, address(this), amount);
        _stakeRewards[_rewardCounter.current()] = StakeReward(amount, duration, starttime);
        _rewardCounter.increment();
    }

    function addRewards(uint256 amount, uint256 duration) public {
        addRewards(amount, duration, block.timestamp);
    }

    function totalStakedCmk() public view returns (uint){
        uint256 totalBalance = cmk.balanceOf(address(this));
        for(uint i = 0; i < _rewardCounter.current(); i++){
            uint endTime = _stakeRewards[i].startTime + _stakeRewards[i].duration;
            if(endTime > block.timestamp){
                totalBalance = totalBalance - (_stakeRewards[i].amount * (endTime - block.timestamp) / _stakeRewards[i].duration);
            }
        }
        return totalBalance;
    }
}

contract StakedCredmark is ERC20 {
    using SafeMath for uint;

    ERC20 public cmk;
    StakePool public _stakePool;

    constructor(address _cmk)
        ERC20("Staked Credmark", "sCMK")
    {
        cmk = ERC20(_cmk);
        _stakePool = new StakePool(_cmk);
    }

    function enter(uint256 _amount) public {
        uint256 totalCmk = _stakePool.totalStakedCmk();
        uint256 totalShares = totalSupply();
        if (totalShares == 0 || totalCmk == 0) {
            _mint(msg.sender, _amount);
        } 
        else {
            uint256 what = _amount.mul(totalShares).div(totalCmk);
            _mint(msg.sender, what);
        }
        cmk.transferFrom(msg.sender, address(_stakePool), _amount);
    }

    function leave(uint256 _share) public {
        uint256 totalShares = totalSupply();
        uint256 what = _share.mul(_stakePool.totalStakedCmk()).div(totalShares);
        _burn(msg.sender, _share);
        cmk.transferFrom(address(_stakePool), msg.sender, what);
    }
}