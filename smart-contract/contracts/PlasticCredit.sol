// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title PlasticCredit
 * @dev ERC-721 NFT representing a verified plastic collection event on EcoLedger.
 * Each token is minted by the platform (owner) on behalf of a collector (waste picker).
 */
contract PlasticCredit is ERC721URIStorage, Ownable {
    uint256 private _nextTokenId;

    struct CreditMetadata {
        string  plasticType;
        string  quantity;
        address collector;
        string  gpsCoordinates;
        uint256 timestamp;
        string  imageHash;
        uint256 ecoReward;        // ECO tokens earned (in wei-equivalent units)
        string  recyclabilityGrade;
    }

    mapping(uint256 => CreditMetadata) public creditMetadata;

    // ── Events ────────────────────────────────────────────────────────────────
    event PlasticCreditMinted(
        uint256 indexed tokenId,
        address indexed collector,
        string  plasticType,
        string  quantity,
        uint256 ecoReward
    );

    // ── Constructor ───────────────────────────────────────────────────────────
    constructor(address initialOwner)
        ERC721("EcoLedger Plastic Credit", "EPC")
        Ownable(initialOwner)
    {}

    // ── Mint ──────────────────────────────────────────────────────────────────
    /**
     * @dev Mint a new PlasticCredit NFT. Only the contract owner (EcoLedger platform) can mint.
     * @param collector          Wallet address of the waste picker who submitted the plastic
     * @param tokenURI           Metadata URI (IPFS or backend URL)
     * @param plasticType        Type of plastic (PET, HDPE, PVC, LDPE, PP, PS)
     * @param quantity           Weight/quantity string e.g. "2.45 kg"
     * @param gpsCoordinates     GPS string e.g. "19.0760,72.8777"
     * @param imageHash          MD5/SHA256 hash of the submitted plastic image
     * @param ecoReward          ECO token reward amount (integer units)
     * @param recyclabilityGrade A+/A/B/C/D recyclability rating
     */
    function mintPlasticCredit(
        address collector,
        string  memory tokenURI,
        string  memory plasticType,
        string  memory quantity,
        string  memory gpsCoordinates,
        string  memory imageHash,
        uint256 ecoReward,
        string  memory recyclabilityGrade
    ) public onlyOwner returns (uint256) {
        uint256 tokenId = _nextTokenId++;
        _safeMint(collector, tokenId);
        _setTokenURI(tokenId, tokenURI);

        creditMetadata[tokenId] = CreditMetadata({
            plasticType:        plasticType,
            quantity:           quantity,
            collector:          collector,
            gpsCoordinates:     gpsCoordinates,
            timestamp:          block.timestamp,
            imageHash:          imageHash,
            ecoReward:          ecoReward,
            recyclabilityGrade: recyclabilityGrade
        });

        emit PlasticCreditMinted(tokenId, collector, plasticType, quantity, ecoReward);
        return tokenId;
    }

    // ── Views ─────────────────────────────────────────────────────────────────
    function getCreditMetadata(uint256 tokenId)
        public view returns (CreditMetadata memory)
    {
        return creditMetadata[tokenId];
    }

    function getTotalMinted() public view returns (uint256) {
        return _nextTokenId;
    }

    function getCollectorTokens(address collector)
        public view returns (uint256[] memory)
    {
        uint256 total = _nextTokenId;
        uint256 count = 0;
        for (uint256 i = 0; i < total; i++) {
            if (creditMetadata[i].collector == collector) count++;
        }
        uint256[] memory result = new uint256[](count);
        uint256 idx = 0;
        for (uint256 i = 0; i < total; i++) {
            if (creditMetadata[i].collector == collector) {
                result[idx++] = i;
            }
        }
        return result;
    }
}
