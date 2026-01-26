use crate::{Coordinates, GameAction, PlayerId};
use std::fmt::Display;

/// Represents a move that a player can make during the game.
///
/// A movement can either be placing a piece on the board at specific coordinates,
/// or performing a special game action like swapping or resigning.
#[derive(Debug, Clone)]
pub enum Movement {
    /// A piece placement on the board.
    Placement {
        /// The player making the placement.
        player: PlayerId,
        /// The coordinates where the piece is placed.
        coords: Coordinates,
    },
    /// A special game action (not a piece placement).
    Action {
        /// The player performing the action.
        player: PlayerId,
        /// The action being performed.
        action: GameAction,
    },
}

impl Display for Movement {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Movement::Placement { player, coords } => {
                write!(f, "Player {} places at {}", player, coords)
            }
            Movement::Action { player, action } => {
                write!(f, "Player {} performs action {}", player, action)
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_placement_display() {
        let movement = Movement::Placement {
            player: PlayerId::new(0),
            coords: Coordinates::new(1, 2, 3),
        };
        assert_eq!(format!("{}", movement), "Player 0 places at (1, 2, 3)");
    }

    #[test]
    fn test_action_swap_display() {
        let movement = Movement::Action {
            player: PlayerId::new(1),
            action: GameAction::Swap,
        };
        assert_eq!(format!("{}", movement), "Player 1 performs action Swap");
    }

    #[test]
    fn test_action_resign_display() {
        let movement = Movement::Action {
            player: PlayerId::new(0),
            action: GameAction::Resign,
        };
        assert_eq!(format!("{}", movement), "Player 0 performs action Resign");
    }

    #[test]
    fn test_clone() {
        let movement = Movement::Placement {
            player: PlayerId::new(0),
            coords: Coordinates::new(1, 2, 3),
        };
        let cloned = movement.clone();
        assert_eq!(format!("{}", movement), format!("{}", cloned));
    }
}
