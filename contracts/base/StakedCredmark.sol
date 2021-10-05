// SPDX-License-Identifier: MIT
pragma solidity ^0.8.2;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";

contract StakedCredmark is ERC20("StakedCredmark", "sCMK"){
    using SafeMath for uint256;
    IERC20 public credmark;

    constructor(IERC20 _credmark) {
        credmark = _credmark;
    }

    function stake(uint256 _amount) public returns(uint sCmkAmount) {
        uint256 totalCredmark = credmark.balanceOf(address(this));
        uint256 totalShares = totalSupply();
        if (totalShares == 0 || totalCredmark == 0) {
            sCmkAmount = _amount; 
        } else {
            sCmkAmount = _amount.mul(totalShares).div(totalCredmark);
        }
        _mint(msg.sender, sCmkAmount);
        credmark.transferFrom(msg.sender, address(this), _amount);
    }

    function unstake(uint256 _share) public {
        uint256 totalShares = totalSupply();
        uint256 what = _share.mul(credmark.balanceOf(address(this))).div(totalShares);
        _burn(msg.sender, _share);
        credmark.transfer(msg.sender, what);
    }
}