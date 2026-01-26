//! GameY - A Rust implementation of the Game of Y.
//!
//! Y is a connection game played on a triangular board where two players
//! compete to connect all three sides of the triangle with their pieces.
//!
//! # Modules
//!
//! - [`core`]: Core game types including board, coordinates, and game logic
//! - [`bot`]: Bot implementations for computer opponents
//! - [`bot_server`]: HTTP server for bot API
//! - [`cli`]: Command-line interface for interactive play
//! - [`notation`]: Game notation formats (YEN)
//! - [`gamey_error`]: Error types for the library
//!
//! # Example
//!
//! ```
//! use gamey::{GameY, Coordinates, Movement, PlayerId};
//!
//! // Create a new game with board size 5
//! let mut game = GameY::new(5);
//!
//! // Make a move
//! let movement = Movement::Placement {
//!     player: PlayerId::new(0),
//!     coords: Coordinates::new(2, 1, 1),
//! };
//! game.add_move(movement).unwrap();
//! ```

pub mod bot;
pub mod cli;
pub mod core;
pub mod gamey_error;
pub mod notation;
pub mod bot_server;
pub use bot::*;
pub use cli::*;
pub use core::*;
pub use gamey_error::*;
pub use notation::*;
pub use bot_server::*;
