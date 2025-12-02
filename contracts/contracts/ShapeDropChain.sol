// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FHE, euint32, externalEuint32} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/**
 * @title ShapeDropChain – Tetris-like on-chain high score board (public + FHE mirror)
 *
 * Public records power the open leaderboard (front-end sorts).
 * FHE encrypted mirrors allow the user to decrypt their own best values via userDecrypt.
 */
contract ShapeDropChain is ZamaEthereumConfig {
    struct GameRecord {
        uint256 score;
        uint256 lines;
        uint8 difficulty; // 0=easy,1=normal,2=hard
        uint256 timestamp;
    }

    struct GameRecordWithUser {
        address user;
        uint256 score;
        uint256 lines;
        uint8 difficulty;
        uint256 timestamp;
    }

    struct FheMirror {
        euint32 scoreEnc;
        euint32 linesEnc;
    }

    struct EncHistoryRecord {
        euint32 scoreEnc;
        euint32 linesEnc;
        uint8 difficulty;
        uint256 timestamp;
    }

    // difficulty => user => best record
    mapping(uint8 => mapping(address => GameRecord)) private _bestRecords;
    // difficulty => players list (for getAllRecords)
    mapping(uint8 => address[]) private _players;
    // difficulty => user => seen flag
    mapping(uint8 => mapping(address => bool)) private _seen;

    // difficulty => user => FHE encrypted mirrors
    mapping(uint8 => mapping(address => FheMirror)) private _fheMirrors;
    mapping(uint8 => mapping(address => uint256)) private _fheMirrorUpdatedAt;
    mapping(uint8 => address[]) private _encPlayers;
    mapping(uint8 => mapping(address => bool)) private _encSeen;

    // per-user encrypted history (append-only)
    mapping(address => EncHistoryRecord[]) private _encHistory;

    // Anti-cheat lightweight guards (configurable)
    uint256 public constant MAX_SCORE = 20000;
    uint256 public constant MAX_LINES = 300;

    event ScoreUpdated(address indexed user, uint256 score, uint256 lines, uint8 difficulty);
    event EncryptedMirrorUpdated(address indexed user, uint8 difficulty);
    event EncryptedHistoryAppended(address indexed user, uint8 difficulty, uint256 index, uint256 timestamp);
    event EncryptedPlayerAdded(address indexed user, uint8 difficulty);

    function getUserRecord(address user, uint8 difficulty) external view returns (GameRecord memory) {
        return _bestRecords[difficulty][user];
    }

    function getAllRecords(uint8 difficulty) external view returns (GameRecordWithUser[] memory) {
        address[] memory users = _players[difficulty];
        GameRecordWithUser[] memory out = new GameRecordWithUser[](users.length);
        for (uint256 i = 0; i < users.length; i++) {
            GameRecord memory r = _bestRecords[difficulty][users[i]];
            out[i] = GameRecordWithUser({
                user: users[i],
                score: r.score,
                lines: r.lines,
                difficulty: r.difficulty,
                timestamp: r.timestamp
            });
        }
        return out;
    }

    /**
     * @notice Public record submission – only updates if strictly better (higher score).
     */
    function submitScore(uint256 score, uint256 lines, uint8 difficulty) external {
        require(difficulty <= 2, "invalid difficulty");
        require(score <= MAX_SCORE, "score too large");
        require(lines <= MAX_LINES, "lines too large");

        GameRecord storage current = _bestRecords[difficulty][msg.sender];
        if (!_seen[difficulty][msg.sender]) {
            _seen[difficulty][msg.sender] = true;
            _players[difficulty].push(msg.sender);
        }

        if (score > current.score) {
            current.score = score;
            current.lines = lines;
            current.difficulty = difficulty;
            current.timestamp = block.timestamp;
            emit ScoreUpdated(msg.sender, score, lines, difficulty);
        }
    }

    /**
     * @notice Optional encrypted mirror submission (user privacy enhancement).
     * Frontend should call this after submitScore succeeds, using two encrypted inputs:
     * - scoreEnc, scoreProof
     * - linesEnc, linesProof
     *
     * Contract will store the encrypted handles and ACL-authorize the caller and itself.
     */
    function submitScoreEnc(
        externalEuint32 scoreEnc,
        bytes calldata scoreProof,
        externalEuint32 linesEnc,
        bytes calldata linesProof,
        uint8 difficulty
    ) external {
        require(difficulty <= 2, "invalid difficulty");
        // Import encrypted inputs
        euint32 encScore = FHE.fromExternal(scoreEnc, scoreProof);
        euint32 encLines = FHE.fromExternal(linesEnc, linesProof);

        // Store/replace encrypted mirrors
        _fheMirrors[difficulty][msg.sender].scoreEnc = encScore;
        _fheMirrors[difficulty][msg.sender].linesEnc = encLines;
        _fheMirrorUpdatedAt[difficulty][msg.sender] = block.timestamp;
        if (!_encSeen[difficulty][msg.sender]) {
            _encSeen[difficulty][msg.sender] = true;
            _encPlayers[difficulty].push(msg.sender);
            emit EncryptedPlayerAdded(msg.sender, difficulty);
        }

        // ACL: allow contract itself and msg.sender to request decryption
        FHE.allowThis(encScore);
        FHE.allow(encScore, msg.sender);
        FHE.allowThis(encLines);
        FHE.allow(encLines, msg.sender);

        emit EncryptedMirrorUpdated(msg.sender, difficulty);

        // Append to encrypted history
        EncHistoryRecord memory rec = EncHistoryRecord({
            scoreEnc: encScore,
            linesEnc: encLines,
            difficulty: difficulty,
            timestamp: block.timestamp
        });
        _encHistory[msg.sender].push(rec);
        emit EncryptedHistoryAppended(msg.sender, difficulty, _encHistory[msg.sender].length - 1, block.timestamp);
    }

    function getUserRecordEnc(address user, uint8 difficulty) external view returns (euint32 scoreEnc, euint32 linesEnc) {
        FheMirror storage m = _fheMirrors[difficulty][user];
        return (m.scoreEnc, m.linesEnc);
    }

    function getEncHistoryLength(address user) external view returns (uint256) {
        return _encHistory[user].length;
    }

    function getEncHistory(address user) external view returns (
        euint32[] memory scoreEnc,
        euint32[] memory linesEnc,
        uint8[] memory difficulty,
        uint256[] memory timestamp
    ) {
        uint256 n = _encHistory[user].length;
        scoreEnc = new euint32[](n);
        linesEnc = new euint32[](n);
        difficulty = new uint8[](n);
        timestamp = new uint256[](n);
        for (uint256 i = 0; i < n; i++) {
            EncHistoryRecord storage r = _encHistory[user][i];
            scoreEnc[i] = r.scoreEnc;
            linesEnc[i] = r.linesEnc;
            difficulty[i] = r.difficulty;
            timestamp[i] = r.timestamp;
        }
    }

    struct EncWithUser {
        address user;
        euint32 scoreEnc;
        euint32 linesEnc;
        uint256 timestamp;
    }

    function getAllEncRecords(uint8 difficulty) external view returns (EncWithUser[] memory) {
        address[] memory users = _encPlayers[difficulty];
        EncWithUser[] memory out = new EncWithUser[](users.length);
        for (uint256 i = 0; i < users.length; i++) {
            FheMirror storage m = _fheMirrors[difficulty][users[i]];
            out[i] = EncWithUser({
                user: users[i],
                scoreEnc: m.scoreEnc,
                linesEnc: m.linesEnc,
                timestamp: _fheMirrorUpdatedAt[difficulty][users[i]]
            });
        }
        return out;
    }
}


