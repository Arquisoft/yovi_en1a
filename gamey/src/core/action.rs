use std::fmt::Display;

/// Represents special game actions that are not regular piece placements.
///
/// These actions allow players to perform non-placement moves during the game.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum GameAction {
    /// The swap rule: allows the second player to swap colors after the first move.
    /// This is commonly used in games like Hex and Y to balance first-move advantage.
    Swap,
    /// The player resigns the game, conceding victory to the opponent.
    Resign,
}

impl Display for GameAction {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            GameAction::Swap => write!(f, "Swap"),
            GameAction::Resign => write!(f, "Resign"),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_display_swap() {
        assert_eq!(format!("{}", GameAction::Swap), "Swap");
    }

    #[test]
    fn test_display_resign() {
        assert_eq!(format!("{}", GameAction::Resign), "Resign");
    }

    #[test]
    fn test_equality() {
        assert_eq!(GameAction::Swap, GameAction::Swap);
        assert_eq!(GameAction::Resign, GameAction::Resign);
        assert_ne!(GameAction::Swap, GameAction::Resign);
    }

    #[test]
    fn test_clone() {
        let action = GameAction::Swap;
        let cloned = action.clone();
        assert_eq!(action, cloned);
    }
}
