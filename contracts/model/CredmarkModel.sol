// SPDX-License-Identifier: MIT
pragma solidity ^0.8.2;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

import "../base/IStakedCredmark.sol";

contract CredmarkModel is ERC721, ERC721Enumerable, AccessControl {
    using SafeMath for uint256;
    using Counters for Counters.Counter;

    Counters.Counter private _tokenIdCounter;

    IStakedCredmark public stakedCredmark;
    IERC20 public credmark;

    enum ValidationStatus {
        SUBMITTED,
        INCLUDED,
        UNDER_INVESTIGATION,
        RETRACTED
    }

    struct ModelInfo {
        ValidationStatus validationStatus;
        uint256 modelHash;
    }

    event ModelMinted(uint256 tokenId, uint modelHash);
    event CredmarkAddedToModel(uint256 tokenId, uint256 amount);

    mapping(uint => ModelInfo) private _statuses;
    mapping(uint256 => uint256) private _sharesLocked;
    mapping(uint256 => uint256) private _hashToId;

    uint minimumCollateral;

    constructor(IStakedCredmark _stakedCredmark, IERC20 _credmark) ERC721("CredmarkModel", "modelCMK") {
        stakedCredmark = _stakedCredmark;
        credmark = _credmark;
    }

    // User Functions
    function mint(address to, uint256 cmkAmount, uint modelHash) external returns (uint256 tokenId) {
        require(cmkAmount > minimumCollateral, "Require More CMK to Mint Model");
        require(_hashToId[modelHash] == 0x0, "Non Unique Model Hash");

        tokenId = _tokenIdCounter.current();
        addCmk(tokenId, cmkAmount);

        _safeMint(to, tokenId);
        _hashToId[modelHash] = tokenId;
        _statuses[tokenId] = ModelInfo(ValidationStatus.SUBMITTED, modelHash);

        _tokenIdCounter.increment();

        emit ModelMinted(tokenId, modelHash);
    }

    function addCmk(uint256 tokenId, uint256 cmkAmount) public  {
        require(_exists(tokenId),"No such token");
        credmark.transferFrom(msg.sender, address(this), cmkAmount);
        uint256 sCmk = stakedCredmark.createShare(cmkAmount);
        _sharesLocked[tokenId] += sCmk;

        emit CredmarkAddedToModel(tokenId, cmkAmount);
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