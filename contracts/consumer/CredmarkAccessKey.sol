// SPDX-License-Identifier: MIT
pragma solidity ^0.8.2;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

import "../base/IStakedCredmark.sol";

contract CredmarkAccessKey is ERC721, ERC721Enumerable, AccessControl, Ownable {
    using SafeMath for uint256;
    using Counters for Counters.Counter;

    Counters.Counter private _tokenIdCounter;
    Counters.Counter private _feeIdCounter;

    struct CredmarkAccessFee {
        uint256 startTime;
        uint256 endTime;
        uint256 fee;
    }

    event FeeChanged(uint256 feeAmount);
    event AccessKeyMinted(uint256 tokenId);
    event AccessKeyBurned(uint256 tokenId);
    event AccessKeyLiquidated(uint256 tokenId);

    mapping(uint256 => CredmarkAccessFee) public _fees;

    IStakedCredmark public stakedCredmark;
    address private credmarkDAO;
    IERC20 public credmark;

    mapping(uint256 => uint256) private _mintedTimestamp;
    mapping(uint256 => uint256) private _sharesLocked;

    constructor(
        IStakedCredmark _stakedCredmark,
        IERC20 _credmark,
        address _credmarkDAO,
        uint256 _feeAmount
    ) ERC721("CredmarkAccessKey", "accessCMK") {
        stakedCredmark = _stakedCredmark;
        credmark = _credmark;
        credmarkDAO = _credmarkDAO;

        _fees[0] = CredmarkAccessFee(block.timestamp, 0, _feeAmount);
        _feeIdCounter.increment();
    }

    // Configuration Functions
    function setFee(uint256 _feeAmount) external onlyOwner {
        _fees[_feeIdCounter.current()] = CredmarkAccessFee(block.timestamp, 0, _feeAmount);
        if (_feeIdCounter.current() > 0) {
            _fees[_feeIdCounter.current() - 1].endTime = block.timestamp;
        }
        _feeIdCounter.increment();

        emit FeeChanged(_feeAmount);
    }

    function approveCmkForSCmk(uint256 _cmkAmount) external onlyOwner {
        credmark.approve(address(stakedCredmark), _cmkAmount);
    }

    function getFee() public view returns (uint256) {
        return _fees[_feeIdCounter.current() - 1].fee;
    }

    function feesAccumulated(uint256 tokenId) public view returns (uint256 aggFees) {
        uint256 mintedTimestamp = _mintedTimestamp[tokenId];
        for (uint256 i = 0; i < _feeIdCounter.current(); i++) {
            if (_fees[i].endTime == 0 || mintedTimestamp < _fees[i].endTime) {
                uint256 start = max(mintedTimestamp, _fees[i].startTime);
                uint256 end = block.timestamp;
                if (_fees[i].endTime > 0) {
                    end = _fees[i].endTime;
                }
                aggFees += _fees[i].fee.mul(end - start);
            }
        }

        if (aggFees > cmkValue(tokenId)) {
            aggFees = cmkValue(tokenId);
        }
    }

    function cmkValue(uint256 tokenId) public view returns (uint256) {
        return stakedCredmark.sharesToCmk(_sharesLocked[tokenId]);
    }

    // User Functions
    function mint(uint256 _cmkAmount) external returns (uint256 tokenId) {
        tokenId = _tokenIdCounter.current();
        addCmk(tokenId, _cmkAmount);
        _mintedTimestamp[tokenId] = block.timestamp;
        _safeMint(msg.sender, tokenId);
        _tokenIdCounter.increment();

        emit AccessKeyMinted(tokenId);
    }

    function addCmk(uint256 tokenId, uint256 _cmkAmount) public {
        credmark.transferFrom(msg.sender, address(this), _cmkAmount);
        uint256 sCmk = stakedCredmark.createShare(_cmkAmount);
        _sharesLocked[tokenId] += sCmk;
    }

    function burn(uint256 tokenId) external {
        require(msg.sender == ownerOf(tokenId), "Only owner can burn their NFT");
        uint256 fee = feesAccumulated(tokenId);
        stakedCredmark.removeShare(_sharesLocked[tokenId]);
        uint256 returned = cmkValue(tokenId) - fee;
        credmark.transfer(msg.sender, returned);
        credmark.transfer(address(stakedCredmark), fee.div(2));
        credmark.transfer(credmarkDAO, fee.div(2));
        _burn(tokenId);

        emit AccessKeyBurned(tokenId);
    }

    // Liquidation Functions
    function isLiquidateable(uint256 tokenId) public view returns (bool) {
        return feesAccumulated(tokenId) >= cmkValue(tokenId);
    }

    function liquidate(uint256 tokenId) external {
        require(isLiquidateable(tokenId), "Not Insolvent");
        uint256 cmkAmount = cmkValue(tokenId);
        stakedCredmark.removeShare(_sharesLocked[tokenId]);
        credmark.transfer(address(stakedCredmark), cmkAmount.div(2));
        credmark.transfer(credmarkDAO, cmkAmount.div(2));
        _burn(tokenId);

        emit AccessKeyLiquidated(tokenId);
    }

    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 tokenId
    ) internal override(ERC721, ERC721Enumerable) {
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

    function max(uint256 a, uint256 b) internal pure returns (uint256) {
        if (a > b) {
            return a;
        }
        return b;
    }
}
