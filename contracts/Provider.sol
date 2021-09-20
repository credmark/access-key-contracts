// SPDX-License-Identifier: MIT
pragma solidity ^0.8.2;

import "./IProvider.sol";
import "./AccessToken.sol";
import "./AccessGrant.sol";
import "@openzeppelin/contracts/utils/introspection/ERC165.sol";

abstract contract Provider is ERC165, IProvider  {

    AccessToken private store;

    constructor(address tokenStore_){
        store = AccessToken(tokenStore_);
        AccessGrant ag = AccessGrant(store.accessGrant());
    }

    function authorize(address authenticatedRequestor, uint tokenId, bytes32[] memory args) external override returns(bool){
        return true;
    }

    function registerApi(string memory audience) external override returns(uint256) {
        AccessGrant ag = AccessGrant(store.accessGrant());
        return ag.mintAccessGrant(audience);
    }

    function supportsInterface(bytes4 interfaceId) public view virtual override(ERC165, IERC165) returns (bool) {
        return
            interfaceId == type(IProvider).interfaceId ||
            super.supportsInterface(interfaceId);
    }
}