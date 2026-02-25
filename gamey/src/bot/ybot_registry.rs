//! Registry for managing YBot implementations.
//!
//! The [`YBotRegistry`] provides a centralized way to register and retrieve
//! bot implementations by name.

use std::{collections::HashMap, sync::Arc};

use crate::YBot;

/// A registry that stores and manages [`YBot`] implementations.
///
/// The registry allows bots to be registered and retrieved by their name,
/// making it easy to dynamically select bots at runtime.
///
/// # Example
///
/// ```
/// use std::sync::Arc;
/// use gamey::{YBotRegistry, RandomBot};
///
/// let registry = YBotRegistry::new()
///     .with_bot(Arc::new(RandomBot));
///
/// let bot = registry.find("random_bot");
/// assert!(bot.is_some());
/// ```
pub struct YBotRegistry {
    bots: HashMap<String, Arc<dyn YBot>>,
}

impl YBotRegistry {
    /// Creates a new empty registry.
    pub fn new() -> Self {
        YBotRegistry {
            bots: HashMap::new(),
        }
    }

    /// Adds a bot to the registry and returns the registry for chaining.
    ///
    /// The bot is registered under its name (as returned by [`YBot::name`]).
    pub fn with_bot(mut self, bot: Arc<dyn YBot>) -> Self {
        self.bots.insert(bot.name().to_string(), bot);
        self
    }

    /// Finds a bot by name.
    ///
    /// Returns `Some(bot)` if a bot with the given name exists, `None` otherwise.
    pub fn find(&self, name: &str) -> Option<Arc<dyn YBot>> {
        self.bots.get(name).cloned()
    }

    /// Returns a list of all registered bot names.
    pub fn names(&self) -> Vec<String> {
        self.bots.keys().cloned().collect()
    }
}

impl Default for YBotRegistry {
    fn default() -> Self {
        YBotRegistry::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::{Coordinates, GameY, RandomBot};

    /// A mock bot for testing purposes.
    struct MockBot {
        name: String,
    }

    impl MockBot {
        fn new(name: &str) -> Self {
            MockBot {
                name: name.to_string(),
            }
        }
    }

    impl YBot for MockBot {
        fn name(&self) -> &str {
            &self.name
        }

        fn choose_move(&self, _board: &GameY) -> Option<Coordinates> {
            None
        }
    }

    #[test]
    fn test_new_registry_is_empty() {
        let registry = YBotRegistry::new();
        assert!(registry.names().is_empty());
    }

    #[test]
    fn test_default_registry_is_empty() {
        let registry = YBotRegistry::default();
        assert!(registry.names().is_empty());
    }

    #[test]
    fn test_with_bot_adds_bot() {
        let registry = YBotRegistry::new().with_bot(Arc::new(MockBot::new("test_bot")));

        assert_eq!(registry.names().len(), 1);
        assert!(registry.find("test_bot").is_some());
    }

    #[test]
    fn test_with_bot_chaining() {
        let registry = YBotRegistry::new()
            .with_bot(Arc::new(MockBot::new("bot1")))
            .with_bot(Arc::new(MockBot::new("bot2")));

        assert_eq!(registry.names().len(), 2);
        assert!(registry.find("bot1").is_some());
        assert!(registry.find("bot2").is_some());
    }

    #[test]
    fn test_find_nonexistent_bot_returns_none() {
        let registry = YBotRegistry::new();
        assert!(registry.find("nonexistent").is_none());
    }

    #[test]
    fn test_with_random_bot() {
        let registry = YBotRegistry::new().with_bot(Arc::new(RandomBot));

        assert!(registry.find("random_bot").is_some());
    }

    #[test]
    fn test_duplicate_name_overwrites() {
        let bot1 = Arc::new(MockBot::new("same_name"));
        let bot2 = Arc::new(MockBot::new("same_name"));

        let registry = YBotRegistry::new().with_bot(bot1).with_bot(bot2);

        assert_eq!(registry.names().len(), 1);
    }
}
