// SPDX-License-Identifier: MIT
pragma solidity ^0.8.2;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

import "../base/IStakedCredmark.sol";

contract CredmarkAccessKey is ERC721, ERC721Enumerable, AccessControl {
    using SafeMath for uint256;
    using Counters for Counters.Counter;

    Counters.Counter private _tokenIdCounter;
    Counters.Counter private _feeIdCounter;

    struct CredmarkAccessFee {
        uint startTime;
        uint endTime;
        uint fee;
    }

    mapping (uint => CredmarkAccessFee) public _fees;

    IStakedCredmark public stakedCredmark;
    address private credmarkDAO;
    IERC20 public credmark;

    mapping (uint => uint) private _mintedTimestamp;
    mapping (uint => uint) private _sharesLocked;

    constructor(IStakedCredmark _stakedCredmark, IERC20 _credmark, address _credmarkDAO) ERC721("CredmarkAccessKey", "accessCMK") {
        stakedCredmark = _stakedCredmark;
        credmark = _credmark;
        credmarkDAO = _credmarkDAO;
    }

    // Configuration Functions

    function setFee(uint _feeAmount) public {
        _fees[_feeIdCounter.current()] = CredmarkAccessFee(block.timestamp,_feeAmount,0);
        if (_feeIdCounter.current() > 0){
            _fees[_feeIdCounter.current() - 1].endTime = block.timestamp;
        }
        _feeIdCounter.increment();
    }

    function feesAccumulated(uint tokenId) public view returns (uint aggFees){

        uint mintedTimestamp = _mintedTimestamp[tokenId];
        for (uint i =0; i<_feeIdCounter.current(); i++){
            if(_fees[i].endTime == 0 || mintedTimestamp < _fees[i].endTime){
                uint start = max(mintedTimestamp, _fees[i].startTime);
                uint end = block.timestamp;
                if(_fees[i].endTime > 0) {
                    end = _fees[i].endTime;
                }
                aggFees += _fees[i].fee.mul(end - start);
            }
        }

        if (aggFees > cmkValue(tokenId)){
            aggFees = cmkValue(tokenId);
        }
    }

    function cmkValue(uint tokenId) public view returns (uint) {
        return stakedCredmark.sharesToCmk(_sharesLocked[tokenId]);
    }


    // User Functions
    function mint(uint _cmkAmount) public returns(uint tokenId) {
        tokenId = _tokenIdCounter.current();
        addCmk(tokenId, _cmkAmount);
        _mintedTimestamp[tokenId] = block.timestamp;
        _safeMint(msg.sender, tokenId);
        _tokenIdCounter.increment();
    }

    function addCmk(uint tokenId, uint _cmkAmount) public {
        credmark.transferFrom(msg.sender, address(this), _cmkAmount);
        uint sCmk = stakedCredmark.createShare(_cmkAmount);
        _sharesLocked[tokenId] += sCmk;
    }

    function burn(uint tokenId) public {
        require(msg.sender == ownerOf(tokenId), "Only the NFT owner can burn their NFT");
        uint fee = feesAccumulated(tokenId);
        stakedCredmark.removeShare(_sharesLocked[tokenId]);
        uint returned = cmkValue(tokenId) - fee;
        credmark.transfer(msg.sender, returned);
        credmark.transfer(address(stakedCredmark), fee.div(2));
        credmark.transfer(credmarkDAO, fee.div(2));
        _burn(tokenId);
    }

    // Liquidation Functions
    function isLiquidateable(uint tokenId) public view returns (bool){
        return feesAccumulated(tokenId) >= cmkValue(tokenId);
    }

    function liquidate(uint tokenId) public {
        require(isLiquidateable(tokenId), "Not Insolvent");
        uint cmkAmount = cmkValue(tokenId);
        stakedCredmark.removeShare(_sharesLocked[tokenId]);
        credmark.transfer(address(stakedCredmark), cmkAmount.div(2));
        credmark.transfer(credmarkDAO, cmkAmount.div(2));
        _burn(tokenId);
    }

    function _beforeTokenTransfer(address from, address to, uint256 tokenId)
        internal
        override(ERC721, ERC721Enumerable)
    {
        super._beforeTokenTransfer(from, to, tokenId);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721Enumerable, AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    function max(uint a, uint b) pure internal returns (uint) {
        if (a>b) {
            return a;
        }
        return b;
    }
}