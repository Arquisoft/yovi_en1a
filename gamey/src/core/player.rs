use std::fmt::Display;

/// Represents a player in the game with an identifier and a name.
#[derive(Debug, Clone)]
pub struct Player {
    id: PlayerId,
    name: String,
}

impl Player {
    /// Creates a new player with the given identifier and name.
    pub fn new(id: PlayerId, name: String) -> Self {
        Self { id, name }
    }

    /// Returns the player's identifier.
    pub fn id(&self) -> PlayerId {
        self.id
    }

    /// Returns the player's name.
    pub fn name(&self) -> &str {
        &self.name
    }
}

impl Display for Player {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "Player {}: {}", self.id, self.name)
    }
}

/// A unique identifier for a player.
///
/// This is a lightweight wrapper around a `u32` that provides type safety
/// for player identification throughout the game.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub struct PlayerId(u32);

impl PlayerId {
    /// Creates a new player identifier with the given value.
    pub fn new(id: u32) -> Self {
        Self(id)
    }

    /// Returns the underlying numeric identifier.
    pub fn id(&self) -> u32 {
        self.0
    }
}

impl Display for PlayerId {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.0)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_player_id_new() {
        let id = PlayerId::new(42);
        assert_eq!(id.id(), 42);
    }

    #[test]
    fn test_player_id_display() {
        let id = PlayerId::new(1);
        assert_eq!(format!("{}", id), "1");
    }

    #[test]
    fn test_player_id_equality() {
        let id1 = PlayerId::new(1);
        let id2 = PlayerId::new(1);
        let id3 = PlayerId::new(2);
        assert_eq!(id1, id2);
        assert_ne!(id1, id3);
    }

    #[test]
    fn test_player_new() {
        let id = PlayerId::new(0);
        let player = Player::new(id, "Alice".to_string());
        assert_eq!(player.id(), id);
        assert_eq!(player.name(), "Alice");
    }

    #[test]
    fn test_player_display() {
        let id = PlayerId::new(1);
        let player = Player::new(id, "Bob".to_string());
        assert_eq!(format!("{}", player), "Player 1: Bob");
    }

    #[test]
    fn test_player_clone() {
        let id = PlayerId::new(0);
        let player = Player::new(id, "Charlie".to_string());
        let cloned = player.clone();
        assert_eq!(player.id(), cloned.id());
        assert_eq!(player.name(), cloned.name());
    }
}
