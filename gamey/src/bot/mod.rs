//! Bot module for the Game of Y.
//!
//! This module provides the infrastructure for creating and managing AI bots
//! that can play the Game of Y. It includes:
//!
//! - [`YBot`] - A trait that defines the interface for all bots
//! - [`YBotRegistry`] - A registry for managing multiple bot implementations
//! - [`GamerBot`] - A specific bot implementation that uses a minimax algorithm to choose moves

pub mod ybot;
pub mod ybot_registry;
pub mod gamer_bot;
pub mod easy_level_bot;
pub use ybot::*;
pub use ybot_registry::*;
pub use gamer_bot::*;
pub use easy_level_bot::*;
