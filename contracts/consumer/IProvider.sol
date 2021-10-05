// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/introspection/ERC165.sol";
interface IProvider is IERC165 {

    /**
     * @dev method to register this api with the tokenStore that will be the ERC721 transferrable keys.
     */
    function registerApi(string memory audience) external returns(uint256);

    /** 
     * @dev method to authorize a clients address via it's token id and the state args to grant access to 
     * resources via the provider
     */
    function authorizeClient(address client, uint tokenId, bytes32[] memory providerArgs) external returns(bool);
    
    /**
        @dev a function the client can use to ensure that the offchain service they received came from a registered provider
     */
    function authorizeProvider(address provider, uint accessToken) external returns(bool);

    function supportsInterface(bytes4 interfaceId) external view override(IERC165) returns (bool);
}
