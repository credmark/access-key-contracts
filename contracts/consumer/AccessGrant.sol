// SPDX-License-Identifier: MIT
pragma solidity ^0.8.2;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Burnable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/utils/introspection/ERC165.sol";
import "./IProvider.sol";

contract AccessGrant is ERC721, ERC721Burnable, AccessControl {
    using Counters for Counters.Counter;

    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant PROVIDER_ROLE = keccak256("PROVIDER_ROLE");
    bytes32 public constant REGISTRAR_ROLE  = keccak256("REGISTRAR_ROLE");
    bytes4 public constant PROVIDER_INTERFACE = type(IProvider).interfaceId;

    Counters.Counter private _accessGrantIdCounter;
    mapping(uint => string) private _audiences;
    mapping(address => bool) private _registeredProviders;

    modifier isRegisteredProvider() {
      require( _registeredProviders[msg.sender], "Calling Contract is not a registered provider");
      _;
    }
    
    constructor() ERC721("AccessGrant", "AccessGrant") {
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _setupRole(REGISTRAR_ROLE, msg.sender);
        _setupRole(MINTER_ROLE, msg.sender);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    function registerProvider(address providerAddress) public onlyRole(REGISTRAR_ROLE) {
        require(IERC165(providerAddress).supportsInterface(PROVIDER_INTERFACE), "Address does not implement IProvider");
        _registeredProviders[providerAddress] = true;
    }

    function mintAccessGrant(string memory audience) public isRegisteredProvider returns (uint256)  {
        uint newAccessGrantId = _accessGrantIdCounter.current();
        _audiences[newAccessGrantId] = audience;
        _safeMint(msg.sender, newAccessGrantId);
        _accessGrantIdCounter.increment();
        return newAccessGrantId;
    }
}