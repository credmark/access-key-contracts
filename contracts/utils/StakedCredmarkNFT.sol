// SPDX-License-Identifier: MIT
pragma solidity ^0.8.2;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

import "../base/StakedCredmark.sol";

contract StakedCredmarkNFT is ERC721, ERC721Enumerable, AccessControl {
    using SafeMath for uint256;
    using Counters for Counters.Counter;

    Counters.Counter private _tokenIdCounter;

    StakedCredmark public stakedCredmark;
    IERC20 public credmark;

    uint public nftTotalValue;
    mapping (uint => uint) private nftValue;

    uint public mintFeeCmk;
    address public feeCollector;
    uint public maximumValueCmk;
    bool public canAdd;
    bool public canRemove;

    constructor(StakedCredmark _stakedCredmark, IERC20 _credmark) ERC721("StakedCredmarkNFT", "sCMKnft") {
        stakedCredmark = _stakedCredmark;
        credmark = _credmark;
        credmark.approve(address(stakedCredmark), 1000000000000000000000000);
    }

    function mint(uint _cmkAmount) public returns(uint id) {
        require(_cmkAmount >= mintFeeCmk, "Mint Fee Not Exceeded");
        id = _tokenIdCounter.current();
        add(id, _cmkAmount);
        if(mintFeeCmk > 0) {
            credmark.transfer(feeCollector, mintFeeCmk);
        }
        _safeMint(msg.sender, id);
        _tokenIdCounter.increment();
    }

    function burn(uint id) public {
        remove(id, sCmkValueOf(id));
        _burn(id);
    }

    function add(uint _id, uint _cmkAmount) public {
        credmark.transferFrom(msg.sender, address(this), _cmkAmount);
        uint nftTotalSCmkBalance = stakedCredmark.balanceOf(address(this));
        uint sCMKcreated = stakedCredmark.createShare(_cmkAmount - mintFeeCmk);

        if (nftTotalSCmkBalance == 0){
            nftValue[_id] = sCMKcreated;
        } else {
            nftValue[_id] = sCMKcreated.mul(nftTotalValue).div(nftTotalSCmkBalance); 
        }

        nftTotalValue += sCMKcreated;
    }

    function remove(uint _id, uint _sCmkAmount) public {
        uint sCmkValue = sCmkValueOf(_id);
        require(_sCmkAmount <= sCmkValue, "Not Enough sCMK in NFT");
        stakedCredmark.transfer(msg.sender, sCmkValue);
        uint oldNftValue = nftValue[_id];
        nftValue[_id] = oldNftValue.mul(sCmkValue.sub(_sCmkAmount) ).div(sCmkValue);
        nftTotalValue = nftTotalValue - oldNftValue + nftValue[_id];
    }

    function sCmkValueOf(uint _id) public view returns(uint sCmkValue){
        sCmkValue = nftValue[_id].mul(stakedCredmark.balanceOf(address(this))).div(nftTotalValue);
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
}