// SPDX-License-Identifier: MIT
pragma solidity ^0.8.2;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

import "../base/IStakedCredmark.sol";
import "./ICredmarkAccessKey.sol";

contract CredmarkAccessKey is ICredmarkAccessKey, ERC721, Ownable {
    using SafeMath for uint256;
    using Counters for Counters.Counter;

    Counters.Counter private _tokenIdCounter;
    Counters.Counter private _feeIdCounter;

    struct CredmarkAccessFee {
        uint256 fromTimestamp;
        uint256 feePerSecond;
    }

    event FeeChanged(uint256 feeAmount);
    event AccessKeyMinted(uint256 tokenId);
    event AccessKeyBurned(uint256 tokenId);
    event AccessKeyLiquidated(uint256 tokenId);
    event CredmarkAddedToKey(uint256 tokenId, uint256 amount);

    CredmarkAccessFee[] public fees;

    IStakedCredmark public stakedCredmark;
    address public credmarkDAO;
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

        fees[0] = CredmarkAccessFee(block.timestamp, _feeAmount);
        _feeIdCounter.increment();
    }

    modifier isLiquidateable(uint256 tokenId) {
        require( feesAccumulated(tokenId) >= cmkValue(tokenId), "Not liquidiateable");
        _;
    }

    // Configuration Functions
    function setFee(uint256 feeAmount) external override onlyOwner {
        fees[_feeIdCounter.current()] = CredmarkAccessFee(block.timestamp, feeAmount);
        _feeIdCounter.increment();

        emit FeeChanged(feeAmount);
    }

    function approveCmkForSCmk(uint256 cmkAmount) external  override onlyOwner {
        credmark.approve(address(stakedCredmark), cmkAmount);
    }

    function feesAccumulated(uint256 tokenId) public view override returns (uint256 aggFees) {
        uint256 mintedTimestamp = _mintedTimestamp[tokenId];

        // TODO: Test this shit out of this
        for (uint256 i = _feeIdCounter.current() - 1; i >= 0; i--) {

            if( i == _feeIdCounter.current() - 1){
                aggFees += fees[i].feePerSecond.mul(block.timestamp - fees[i].fromTimestamp);
                continue;
            }

            aggFees += fees[i].feePerSecond.mul(fees[i+1].fromTimestamp - max(mintedTimestamp, fees[i].fromTimestamp));
            
            if (fees[i].fromTimestamp <= mintedTimestamp){
                break;
            }
        }
    }

    function cmkValue(uint256 tokenId) public view override returns (uint256) {
        return stakedCredmark.sharesToCmk(_sharesLocked[tokenId]);
    }

    // User Functions
    function mint(uint256 cmkAmount) external override returns (uint256 tokenId) {
        tokenId = _tokenIdCounter.current();
        addCmk(tokenId, cmkAmount);
        _mintedTimestamp[tokenId] = block.timestamp;
        _safeMint(msg.sender, tokenId);
        _tokenIdCounter.increment();

        emit AccessKeyMinted(tokenId);
    }

    function addCmk(uint256 tokenId, uint256 cmkAmount) public override {
        require(_exists(tokenId),"No such token");
        credmark.transferFrom(msg.sender, address(this), cmkAmount);
        uint256 sCmk = stakedCredmark.createShare(cmkAmount);
        _sharesLocked[tokenId] += sCmk;

        emit CredmarkAddedToKey(tokenId, cmkAmount);
    }

    function burn(uint256 tokenId) external override {
        require(msg.sender == ownerOf(tokenId), "Only owner can burn their NFT");
        burnInternal(tokenId);
    }

    function liquidate(uint256 tokenId) external override isLiquidateable(tokenId) {
        uint _feesAccumulated = cmkValue(tokenId);
        burnInternal(tokenId);
        credmark.transfer(msg.sender, _feesAccumulated.div(20));
    }

    function sweep() external override {
        credmark.transfer(address(stakedCredmark), credmark.balanceOf(address(this)).div(2));
        credmark.transfer(credmarkDAO, credmark.balanceOf(address(this)));
    }

    function burnInternal(uint256 tokenId) internal {
        uint256 fee = feesAccumulated(tokenId);

        if (feesAccumulated(tokenId) > cmkValue(tokenId)){
            fee = cmkValue(tokenId);
        }

        stakedCredmark.removeShare(_sharesLocked[tokenId]);
        uint256 returned = cmkValue(tokenId) - fee;
        credmark.transfer(ownerOf(tokenId), returned);

        _sharesLocked[tokenId] = 0;
        _burn(tokenId);

        emit AccessKeyBurned(tokenId);
    }

    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 tokenId
    ) internal override(ERC721) {
        super._beforeTokenTransfer(from, to, tokenId);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721)
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