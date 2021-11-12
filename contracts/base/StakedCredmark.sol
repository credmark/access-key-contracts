// SPDX-License-Identifier: MIT
pragma solidity ^0.8.2;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./IRewardsPool.sol";
import "./IStakedCredmark.sol";

contract StakedCredmark is IStakedCredmark, Ownable, ERC20("StakedCredmark", "sCMK") {
    IERC20 public credmark;

    constructor(IERC20 _credmark) {
        credmark = _credmark;
    }

    IRewardsPool private _rewardsPool;

    mapping(address => uint256) private _shareBalances;
    uint256 private _shareTotalSupply;

    uint32 private _lastIssuedRewards;
    uint32 private constant REWARDS_PERIOD_S = 3600 * 8;

    function setRewardsPool(address rewardsPool) external override onlyOwner {
        _rewardsPool = IRewardsPool(rewardsPool);
    }

    function cmkTotalSupply() public view override returns (uint256) {
        return credmark.balanceOf(address(this));
    }

    function cmkBalanceOf(address account) public view override returns (uint256) {
        return sharesToCmk(balanceOf(account));
    }

    function sharesToCmk(uint256 amount) public view override returns (uint256 cmkAmount) {
        if (totalSupply() == 0 || cmkTotalSupply() == 0) {
            cmkAmount = amount;
        } else {
            cmkAmount = (amount * cmkTotalSupply()) / totalSupply();
        }
    }

    function cmkToShares(uint256 amount) public view override returns (uint256 sharesAmount) {
        if (totalSupply() == 0 || cmkTotalSupply() == 0) {
            sharesAmount = amount;
        } else {
            sharesAmount = (amount * totalSupply()) / cmkTotalSupply();
        }
    }

    function issueRewards() internal {
        if (address(_rewardsPool) != address(0) && block.timestamp - _rewardsPool.getLastEmitted() > 24 hours) {
            _rewardsPool.issueRewards();
        }
    }

    function createShare(uint256 _amount) external override returns (uint256 sCmk) {
        issueRewards();
        sCmk = cmkToShares(_amount);
        _mint(msg.sender, sCmk);
        credmark.transferFrom(msg.sender, address(this), _amount);
    }

    function removeShare(uint256 _share) external override {
        if(block.timestamp > _lastIssuedRewards + REWARDS_PERIOD_S){
            issueRewards();
        }

        uint256 cmk = sharesToCmk(_share);
        _burn(msg.sender, _share);
        credmark.transfer(msg.sender, cmk);
    }
}
