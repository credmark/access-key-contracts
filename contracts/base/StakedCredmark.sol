// SPDX-License-Identifier: MIT
pragma solidity ^0.8.2;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./IRewardsPool.sol";
import "./IStakedCredmark.sol";

contract StakedCredmark is IStakedCredmark, Ownable, ERC20("StakedCredmark", "sCMK"){
    using SafeMath for uint256;
    IERC20 public credmark;

    constructor(IERC20 _credmark) {
        credmark = _credmark;
    }

    IRewardsPool _rewardsPool;

    mapping(address => uint) private _shareBalances;
    uint256 private _shareTotalSupply;

    function setRewardsPool(address rewardsPool) override public onlyOwner {
        _rewardsPool = IRewardsPool(rewardsPool);
    }

    function cmkTotalSupply() override public view returns (uint256) {
        return credmark.balanceOf(address(this));
    }

    function cmkBalanceOf(address account) override public view returns (uint256) {
        return sharesToCmk(balanceOf(account));
    }

    function sharesToCmk(uint amount) override public view returns (uint cmkAmount) {
        if (totalSupply() == 0 || cmkTotalSupply() == 0) {
            cmkAmount = amount; 
        } else {
            cmkAmount = amount.mul(cmkTotalSupply()).div(totalSupply());
        }
    }

    function cmkToShares(uint amount) override public view returns (uint sharesAmount) {
        if (totalSupply() == 0 || cmkTotalSupply() == 0) {
            sharesAmount = amount; 
        } else {
            sharesAmount = amount.mul(totalSupply()).div(cmkTotalSupply());
        }
    }

    function issueRewards() internal {
        if(address(_rewardsPool) != address(0)) {
            IRewardsPool(_rewardsPool).issueRewards();
        }
    }
 
    function createShare(uint256 _amount) override public returns (uint sCmk) {
        sCmk = cmkToShares(_amount);
        _mint(msg.sender, sCmk);
        credmark.transferFrom(msg.sender, address(this), _amount);
    }

    function removeShare(uint256 _share) override public {
        issueRewards();
        uint256 cmk = sharesToCmk(_share);
        _burn(msg.sender, _share);
        credmark.transfer(msg.sender, cmk);
    }
}