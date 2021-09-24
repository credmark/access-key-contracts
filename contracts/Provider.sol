// SPDX-License-Identifier: MIT
pragma solidity ^0.8.2;

import "./IProvider.sol";
import "./AccessToken.sol";
import "./AccessGrant.sol";
import "@openzeppelin/contracts/utils/introspection/ERC165.sol";
import "@openzeppelin/contracts/utils/introspection/IERC165.sol";

abstract contract Provider is ERC165, IProvider  {

    AccessToken private _store;

    constructor(address tokenStore_) {
        _store = AccessToken(tokenStore_);
    }

    function authorizeClient(address client, uint tokenId, bytes32[] memory providerArgs) external view override returns(bool) {
        return _store.ownerOf(tokenId) == client;
    }

    function authorizeProvider(address provider, uint accessTokenId) external override view returns(bool) {
        return _store.tokenProvider(accessTokenId) == provider;
    }

    function registerApi(string memory audience) external virtual override returns(uint256) {
        AccessGrant ag = AccessGrant(_store.accessGrant());
        return ag.mintAccessGrant(audience);
    }

    function supportsInterface(bytes4 interfaceId) public view virtual override(IProvider, ERC165) returns (bool) {
        return
            interfaceId == type(IProvider).interfaceId ||
            super.supportsInterface(interfaceId);
    }
}