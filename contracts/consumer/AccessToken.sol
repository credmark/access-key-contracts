// SPDX-License-Identifier: MIT
pragma solidity ^0.8.2;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Burnable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "./AccessGrant.sol";

contract AccessToken is ERC721, ERC721Burnable, AccessControl {
    using Counters for Counters.Counter;

    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant REGISTRAR_ROLE = keccak256("REGISTRAR_ROLE");

    Counters.Counter private _tokenIdCounter;

    mapping (uint => uint) _tokenAccessGrants;

    AccessGrant private _accessGrant;
    function accessGrant() external view returns(address){
        return address(_accessGrant);
    }

    constructor() ERC721("AccessToken", "ACCESSTOKEN") {
        _accessGrant = new AccessGrant();
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _setupRole(MINTER_ROLE, msg.sender);
    }

    function mint(address to, uint accessGrantId) public {
        require(msg.sender == _accessGrant.ownerOf(accessGrantId), "Cannot issue tokens for this token Provider");
        _safeMint(to, _tokenIdCounter.current());
        _tokenAccessGrants[_tokenIdCounter.current()] = accessGrantId;
        _tokenIdCounter.increment();
    }

    function burn(uint tokenId) public override {
        require(msg.sender == _accessGrant.ownerOf(_tokenAccessGrants[tokenId]), "Cannot burn tokens for this token Provider");
        _burn(tokenId);
        delete _tokenAccessGrants[tokenId];
    }

    function tokenProvider(uint tokenId) external view returns (address) {
        return _accessGrant.ownerOf(_tokenAccessGrants[tokenId]);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

}