use crate::{Coordinates, GameY};

/// Trait representing a Y game bot (YBot)
/// A YBot is an AI that can choose moves in the game of Y.
/// Implementors of this trait must provide a name and a method to choose a move given the current game state.
pub trait YBot: Send + Sync {
    /// Returns the name of the bot.
    fn name(&self) -> &str;

    /// Chooses a move based on the current game state.
    fn choose_move(&self, board: &GameY) -> Option<Coordinates>;
}
