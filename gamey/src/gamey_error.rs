//! Error types for the GameY library.
//!
//! This module defines all error types that can occur during game operations,
//! including I/O errors, parsing errors, and game rule violations.

use thiserror::Error;

use crate::{Coordinates, Movement, PlayerId};

/// Errors that can occur during Y game operations.
///
/// This enum covers all possible error conditions including:
/// - File I/O and serialization errors
/// - Invalid game state or moves
/// - YEN format parsing errors
#[derive(Debug, Error)]
pub enum GameYError {
    /// An I/O operation failed.
    #[error("I/O error {message}: {error}")]
    IoError {
        /// Description of the I/O operation that failed.
        message: String,
        /// The underlying error message.
        error: String,
    },

    /// JSON serialization or deserialization failed.
    #[error("Serde JSON error: {error}")]
    SerdeError {
        /// The underlying serde_json error.
        error: serde_json::Error,
    },

    /// Wrong number of coordinates provided.
    #[error("Invalid coordinates: expected {expected} coords, found {found}")]
    BadCoordsNumber {
        /// Expected number of coordinates (usually 3).
        expected: usize,
        /// Actual number of coordinates provided.
        found: usize,
    },

    /// A coordinate value is outside the valid range for the board.
    #[error("Coordinate {id_coord}={coord} is out of range for board size {board_size}")]
    CoordOutOfRange {
        /// Which coordinate is out of range ('x', 'y', or 'z').
        id_coord: char,
        /// The invalid coordinate value.
        coord: u32,
        /// The board size that defines the valid range.
        board_size: u32,
    },

    /// Attempted to place a piece on an already occupied cell.
    #[error("Player {player} tries to place a stone on an occupied position: {coordinates}")]
    Occupied {
        /// The coordinates of the occupied cell.
        coordinates: Coordinates,
        /// The player who attempted the placement.
        player: PlayerId,
    },

    /// Invalid character found in a YEN layout string.
    #[error("Invalid character '{char}' in layout at row {row}, column {col}")]
    InvalidCharInLayout {
        /// The invalid character.
        char: char,
        /// Row index where the character was found.
        row: usize,
        /// Column index where the character was found.
        col: usize,
    },

    /// Attempted to make a move in a finished game.
    #[error("Attempt to play movement {movement} in a finished game")]
    GameOver {
        /// The movement that was attempted.
        movement: Movement,
    },

    /// Wrong player attempted to make a move.
    #[error("Wrong player in movement: Expected player {expected}, found player {found}")]
    InvalidPlayerTurn {
        /// The player who should move.
        expected: PlayerId,
        /// The player who attempted to move.
        found: PlayerId,
    },

    /// Invalid number of players specified.
    #[error("Invalid number of players: {num_players}, expected {expected}")]
    InvalidNumPlayers {
        /// The invalid number of players.
        num_players: u32,
        /// The expected number of players.
        expected: u32,
    },

    /// YEN layout has wrong number of rows.
    #[error("Invalid YEN layout: expected {expected} rows, found {found} rows")]
    InvalidYENLayout {
        /// Expected number of rows.
        expected: u32,
        /// Actual number of rows found.
        found: u32,
    },

    /// A specific line in the YEN layout has wrong number of cells.
    #[error("Invalid YEN layout line: expected {expected} rows, found {found} rows at line {line}")]
    InvalidYENLayoutLine {
        /// Expected number of cells in the line.
        expected: u32,
        /// Actual number of cells found.
        found: u32,
        /// The line number with the error.
        line: u32,
    },

    /// Server operation failed.
    #[error("Server error: {message}")]
    ServerError {
        /// Description of what went wrong.
        message: String,
    },
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_io_error_display() {
        let err = GameYError::IoError {
            message: "Failed to read".to_string(),
            error: "file not found".to_string(),
        };
        let msg = format!("{}", err);
        assert!(msg.contains("I/O error"));
        assert!(msg.contains("Failed to read"));
        assert!(msg.contains("file not found"));
    }

    #[test]
    fn test_bad_coords_number_display() {
        let err = GameYError::BadCoordsNumber {
            expected: 3,
            found: 2,
        };
        let msg = format!("{}", err);
        assert!(msg.contains("expected 3"));
        assert!(msg.contains("found 2"));
    }

    #[test]
    fn test_coord_out_of_range_display() {
        let err = GameYError::CoordOutOfRange {
            id_coord: 'x',
            coord: 10,
            board_size: 5,
        };
        let msg = format!("{}", err);
        assert!(msg.contains("x=10"));
        assert!(msg.contains("board size 5"));
    }

    #[test]
    fn test_occupied_display() {
        let err = GameYError::Occupied {
            coordinates: Coordinates::new(1, 2, 3),
            player: PlayerId::new(0),
        };
        let msg = format!("{}", err);
        assert!(msg.contains("Player 0"));
        assert!(msg.contains("occupied"));
    }

    #[test]
    fn test_invalid_char_in_layout_display() {
        let err = GameYError::InvalidCharInLayout {
            char: 'X',
            row: 1,
            col: 2,
        };
        let msg = format!("{}", err);
        assert!(msg.contains("'X'"));
        assert!(msg.contains("row 1"));
        assert!(msg.contains("column 2"));
    }

    #[test]
    fn test_invalid_player_turn_display() {
        let err = GameYError::InvalidPlayerTurn {
            expected: PlayerId::new(0),
            found: PlayerId::new(1),
        };
        let msg = format!("{}", err);
        assert!(msg.contains("Expected player 0"));
        assert!(msg.contains("found player 1"));
    }

    #[test]
    fn test_invalid_num_players_display() {
        let err = GameYError::InvalidNumPlayers {
            num_players: 3,
            expected: 2,
        };
        let msg = format!("{}", err);
        assert!(msg.contains("3"));
        assert!(msg.contains("expected 2"));
    }

    #[test]
    fn test_invalid_yen_layout_display() {
        let err = GameYError::InvalidYENLayout {
            expected: 5,
            found: 3,
        };
        let msg = format!("{}", err);
        assert!(msg.contains("expected 5"));
        assert!(msg.contains("found 3"));
    }

    #[test]
    fn test_invalid_yen_layout_line_display() {
        let err = GameYError::InvalidYENLayoutLine {
            expected: 4,
            found: 2,
            line: 3,
        };
        let msg = format!("{}", err);
        assert!(msg.contains("expected 4"));
        assert!(msg.contains("found 2"));
        assert!(msg.contains("line 3"));
    }

    #[test]
    fn test_server_error_display() {
        let err = GameYError::ServerError {
            message: "Failed to bind to port 3000".to_string(),
        };
        let msg = format!("{}", err);
        assert!(msg.contains("Server error"));
        assert!(msg.contains("Failed to bind to port 3000"));
    }

    #[test]
    fn test_error_is_debug() {
        let err = GameYError::IoError {
            message: "test".to_string(),
            error: "error".to_string(),
        };
        let debug = format!("{:?}", err);
        assert!(debug.contains("IoError"));
    }
}
