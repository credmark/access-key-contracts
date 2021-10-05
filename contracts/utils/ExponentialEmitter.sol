// SPDX-License-Identifier: MIT
pragma solidity ^0.8.2;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "./FractionalExponents.sol";

contract ExponentialEmitter is FractionalExponents {
    using Counters for Counters.Counter;
    Counters.Counter private _rewardCounter;

    uint public halfLife;
    uint public lastEmitted;
    uint private  BALANCE = 1000000;

    constructor(uint _halfLife) {
        halfLife = _halfLife;
        lastEmitted = block.timestamp;
    }

    function getEmittable() public view returns (uint) {
        (uint powerVal, uint8 powerPrecision) = power(10e18, 2, uint32(block.timestamp - lastEmitted), uint32(halfLife));
        return (BALANCE * powerVal * (2 ** powerPrecision)) / 10e18;
    }

    function emitTokens() public {
        lastEmitted = block.timestamp;
        BALANCE = BALANCE - getEmittable();
    }
}