// SPDX-License-Identifier: MIT
pragma solidity ^0.8.2;

import "./CredmarkAccessKey.sol";

contract CredmarkAccessProvider {

    CredmarkAccessKey dataAccess;

    constructor(CredmarkAccessKey _dataAccess) {
        dataAccess = _dataAccess;
    }

    function authorize(address authenticatedAddress, uint tokenId) external view returns (bool authorized) {
        authorized = authenticatedAddress == dataAccess.ownerOf(tokenId) && 
            !dataAccess.isLiquidateable(tokenId);
    }
}