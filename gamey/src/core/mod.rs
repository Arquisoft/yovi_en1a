//! Core game types and logic for the Y game.
//!
//! This module contains the fundamental types for representing and playing Y:
//! - [`Coordinates`]: Barycentric coordinates on the triangular board
//! - [`GameY`]: The main game state and logic
//! - [`GameStatus`]: Whether the game is ongoing or finished
//! - [`Player`] and [`PlayerId`]: Player representation
//! - [`Movement`]: A move (placement or action) in the game
//! - [`GameAction`]: Special actions like swap or resign
//! - [`RenderOptions`]: Configuration for board rendering

pub mod action;
pub mod coord;
pub mod game;
pub mod movement;
pub mod player;
mod player_set;
pub mod render_options;

pub use action::*;
pub use coord::*;
pub use game::*;
pub use movement::*;
pub use player::*;
pub use render_options::*;

type SetIdx = usize;
