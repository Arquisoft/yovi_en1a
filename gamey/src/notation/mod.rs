//! Game notation formats for serializing and deserializing Y game states.
//!
//! This module provides notation formats for representing Y game positions
//! in a compact, portable way. Currently supported:
//!
//! - [`YEN`]: Y Exchange Notation - a JSON-based format inspired by chess FEN

pub mod yen;
pub use yen::*;
