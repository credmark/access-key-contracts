// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

interface IProvider {

    /**
     * @dev method to register this api with the tokenStore that will be the ERC721 transferrable keys.
     */
    function registerApi(string memory audience) external returns(uint256);

    /** 
     * @dev method to authorize an authenticated Requestor address via it's token id and the state args to grant access to 
     * resources via the provider
     */
    function authorize(address authenticatedRequestor, uint token, bytes32[] memory args) external returns(bool);
}
