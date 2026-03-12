// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract PlasticCredit is ERC721URIStorage, Ownable {
    uint256 private _nextTokenId;

    struct CreditMetadata {
        string plasticType;
        string quantity;
        address collector;
        string gpsCoordinates;
        uint256 timestamp;
        string imageHash;
    }

    mapping(uint256 => CreditMetadata) public creditMetadata;

    event PlasticCreditMinted(uint256 indexed tokenId, address indexed collector, string plasticType, string quantity);

    constructor(address initialOwner) ERC721("EcoLedger Plastic Credit", "EPC") Ownable(initialOwner) {}

    function mintPlasticCredit(
        address collector,
        string memory tokenURI,
        string memory plasticType,
        string memory quantity,
        string memory gpsCoordinates,
        string memory imageHash
    ) public onlyOwner returns (uint256) {
        uint256 tokenId = _nextTokenId++;
        _safeMint(collector, tokenId);
        _setTokenURI(tokenId, tokenURI);

        creditMetadata[tokenId] = CreditMetadata({
            plasticType: plasticType,
            quantity: quantity,
            collector: collector,
            gpsCoordinates: gpsCoordinates,
            timestamp: block.timestamp,
            imageHash: imageHash
        });

        emit PlasticCreditMinted(tokenId, collector, plasticType, quantity);
        return tokenId;
    }

    function getCreditMetadata(uint256 tokenId) public view returns (CreditMetadata memory) {
        return creditMetadata[tokenId];
    }
}
