use serde::{Deserialize, Serialize};

/// Y Exchange Notation (YEN) - a compact format for representing Y game states.
///
/// YEN is inspired by FEN (Forsyth-Edwards Notation) used in chess. It provides
/// a simple JSON-serializable format for storing and exchanging game positions.
///
/// # Format
/// - `size`: The board size (length of one side of the triangle)
/// - `turn`: Which player's turn it is (0 or 1)
/// - `players`: Character symbols for each player (e.g., ['B', 'R'] for Blue/Red)
/// - `layout`: A compact string where rows are separated by '/', and cells are
///   represented by player symbols or '.' for empty cells
///
/// # Example
/// ```json
/// {
///   "size": 3,
///   "turn": 0,
///   "players": ["B", "R"],
///   "layout": "B/BR/.R."
/// }
/// ```
#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct YEN {
    /// The board size (length of one side of the triangle).
    size: u32,
    /// The index of the player whose turn it is (0-indexed).
    turn: u32,
    /// Character symbols representing each player.
    players: Vec<char>,
    /// A compact string representation of the board.
    ///
    /// Rows are separated by '/', with cells represented by player symbols
    /// or '.' for empty cells. Example: "B/..R/.B.R"
    layout: String,
}

impl YEN {
    /// Creates a new YEN representation.
    ///
    /// # Arguments
    /// * `size` - The board size
    /// * `turn` - Index of the player to move (0 or 1)
    /// * `players` - Character symbols for each player
    /// * `layout` - The board layout string
    pub fn new(size: u32, turn: u32, players: Vec<char>, layout: String) -> Self {
        YEN {
            size,
            turn,
            players,
            layout,
        }
    }

    /// Returns the board layout string.
    pub fn layout(&self) -> &str {
        &self.layout
    }

    /// Returns the board size.
    pub fn size(&self) -> u32 {
        self.size
    }

    /// Returns the index of the player whose turn it is.
    pub fn turn(&self) -> u32 {
        self.turn
    }

    /// Returns the player symbols.
    pub fn players(&self) -> &[char] {
        &self.players
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_new() {
        let yen = YEN::new(3, 0, vec!['B', 'R'], "B/BR/.R.".to_string());
        assert_eq!(yen.size(), 3);
        assert_eq!(yen.turn(), 0);
        assert_eq!(yen.layout(), "B/BR/.R.");
        assert_eq!(yen.players(), &['B', 'R']);
    }

    #[test]
    fn test_serialize() {
        let yen = YEN::new(3, 0, vec!['B', 'R'], "B/BR/.R.".to_string());
        let json = serde_json::to_string(&yen).unwrap();
        assert!(json.contains("\"size\":3"));
        assert!(json.contains("\"turn\":0"));
        assert!(json.contains("\"layout\":\"B/BR/.R.\""));
    }

    #[test]
    fn test_deserialize() {
        let json = r#"{
            "size": 3,
            "turn": 1,
            "players": ["B", "R"],
            "layout": "B/BR/.R."
        }"#;
        let yen: YEN = serde_json::from_str(json).unwrap();
        assert_eq!(yen.size(), 3);
        assert_eq!(yen.turn(), 1);
        assert_eq!(yen.layout(), "B/BR/.R.");
        assert_eq!(yen.players(), &['B', 'R']);
    }

    #[test]
    fn test_clone() {
        let yen = YEN::new(5, 0, vec!['B', 'R'], "./.././.../.....".to_string());
        let cloned = yen.clone();
        assert_eq!(yen.size(), cloned.size());
        assert_eq!(yen.turn(), cloned.turn());
        assert_eq!(yen.layout(), cloned.layout());
    }

    #[test]
    fn test_empty_board() {
        let yen = YEN::new(2, 0, vec!['B', 'R'], "./../..".to_string());
        assert_eq!(yen.size(), 2);
        assert_eq!(yen.layout(), "./../..");
    }

    #[test]
    fn test_single_cell_board() {
        let yen = YEN::new(1, 0, vec!['B', 'R'], ".".to_string());
        assert_eq!(yen.size(), 1);
        assert_eq!(yen.layout(), ".");
    }

    #[test]
    fn test_roundtrip_serialization() {
        let original = YEN::new(4, 1, vec!['B', 'R'], "B/.R/BBR/....".to_string());
        let json = serde_json::to_string(&original).unwrap();
        let restored: YEN = serde_json::from_str(&json).unwrap();
        assert_eq!(original.size(), restored.size());
        assert_eq!(original.turn(), restored.turn());
        assert_eq!(original.layout(), restored.layout());
        assert_eq!(original.players(), restored.players());
    }
}
