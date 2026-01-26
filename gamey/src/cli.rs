//! Command-line interface for the Y game.
//!
//! This module provides the CLI application for playing Y games interactively.
//! It supports three modes:
//! - Human vs Human: Two players take turns at the same terminal
//! - Human vs Computer: Play against a bot
//! - Server: Run as an HTTP server for bot API

use crate::{
    Coordinates, GameAction, Movement, RandomBot, RenderOptions, YBot, YBotRegistry, game,
};
use crate::{GameStatus, GameY, PlayerId};
use anyhow::Result;
use clap::{Parser, ValueEnum};
use rustyline::DefaultEditor;
use rustyline::error::ReadlineError;
use std::fmt::Display;
use std::sync::Arc;

/// Command-line arguments for the GameY application.
#[derive(Parser, Debug)]
#[command(author, version, about)]
#[command(long_about = "GameY: A command-line implementation of the Game of Y.")]
pub struct CliArgs {
    /// Size of the triangular board (length of one side).
    #[arg(short, long, default_value_t = 7)]
    pub size: u32,

    /// Game mode: human (2-player), computer (vs bot), or server (HTTP API).
    #[arg(short, long, default_value_t = Mode::Human)]
    pub mode: Mode,

    /// The bot to use (only used with --mode=computer), default = random_bot
    #[arg(short, long, default_value = "random_bot")]
    pub bot: String,

    /// Port to run the server on (only used with --mode=server)
    #[arg(short, long, default_value_t = 3000)]
    pub port: u16,
}

/// The game mode determining how the game is played.
#[derive(Debug, Clone, Copy, ValueEnum, PartialEq)]
pub enum Mode {
    /// Play against a computer bot.
    Computer,
    /// Two humans playing at the same terminal.
    Human,
    /// Run as an HTTP server for bot API.
    Server,
}

impl Display for Mode {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        let s = match self {
            Mode::Computer => "computer",
            Mode::Human => "human",
            Mode::Server => "server",
        };
        write!(f, "{}", s)
    }
}

/// Runs the interactive CLI game loop.
///
/// This function parses command-line arguments, initializes the game,
/// and runs the main game loop where players enter moves via the terminal.
pub fn run_cli_game() -> Result<()> {
    let args = CliArgs::parse();
    let mut render_options = crate::RenderOptions::default();
    let mut rl = DefaultEditor::new()?;
    let bots_registry = YBotRegistry::new().with_bot(Arc::new(RandomBot));
    let bot: Arc<dyn YBot> = match bots_registry.find(&args.bot) {
        Some(b) => b,
        None => {
            println!(
                "Bot '{}' not found. Available bots: {:?}",
                args.bot,
                bots_registry.names()
            );
            return Ok(());
        }
    };
    let mut game = game::GameY::new(args.size);
    loop {
        println!("{}", game.render(&render_options));
        let status = game.status();
        match status {
            GameStatus::Finished { winner } => {
                println!("Game over! Winner: {}", winner);
                break;
            }
            GameStatus::Ongoing { next_player } => {
                let player = *next_player;
                let prompt = format!(
                    "Current player: {}, action (help = show commands)? ",
                    next_player
                );
                let readline = rl.readline(&prompt);
                match readline {
                    Err(ReadlineError::Interrupted) => {
                        println!("Interrupted");
                        break;
                    }
                    Err(err) => {
                        println!("Error: {:?}", err);
                        continue;
                    }
                    Ok(realine) => {
                        rl.add_history_entry(realine.as_str())?;
                        process_input(
                            &realine,
                            &mut game,
                            &player,
                            &mut render_options,
                            args.mode,
                            bot.as_ref(),
                        )?;
                    }
                }
            }
        }
    }
    Ok(())
}

/// Processes a single line of user input and updates game state.
fn process_input(
    input: &str,
    game: &mut GameY,
    player: &PlayerId,
    render_options: &mut RenderOptions,
    mode: Mode,
    bot: &dyn YBot,
) -> Result<()> {
    let command = parse_command(input, game.total_cells());
    match command {
        Command::Place { idx } => {
            handle_place_command(game, idx, *player, mode, bot);
        }
        Command::Resign => {
            let movement = Movement::Action {
                player: *player,
                action: GameAction::Resign,
            };
            apply_move(game, movement, "Error adding resign move");
        }
        Command::Show3DCoords => {
            render_options.show_3d_coords = !render_options.show_3d_coords;
        }
        Command::ShowIdx => {
            render_options.show_idx = !render_options.show_idx;
        }
        Command::ShowColors => {
            render_options.show_colors = !render_options.show_colors;
        }
        Command::Help => {
            print_help();
        }
        Command::Exit => {
            println!("Exiting the game.");
            std::process::exit(0);
        }
        Command::None => {
            println!("No command entered.");
        }
        Command::Error { message } => {
            println!("Error parsing command: {}", message);
        }
        Command::Save { filename } => {
            let path = std::path::Path::new(&filename);
            game.save_to_file(path)?;
            tracing::info!("Game saved to {}", filename);
        }
        Command::Load { filename } => {
            let path = std::path::Path::new(&filename);
            *game = GameY::load_from_file(path)?;
            tracing::info!("Game loaded from {}", filename);
        }
    }
    Ok(())
}

/// Parses a user input string into a Command.
///
/// # Arguments
/// * `input` - The raw input string from the user
/// * `bound` - The upper bound for valid cell indices (total cells on board)
///
/// # Returns
/// A `Command` variant representing the parsed action.
pub fn parse_command(input: &str, bound: u32) -> Command {
    let parts: Vec<&str> = input.split_whitespace().collect();
    if parts.is_empty() {
        return Command::None;
    }
    match parts[0] {
        "save" => {
            if parts.len() < 2 {
                return Command::Error {
                    message: "Filename required for save command".to_string(),
                };
            }
            Command::Save {
                filename: parts[1].to_string(),
            }
        }
        "load" => {
            if parts.len() < 2 {
                return Command::Error {
                    message: "Filename required for load command".to_string(),
                };
            }
            Command::Load {
                filename: parts[1].to_string(),
            }
        }
        "resign" => Command::Resign,
        "help" => Command::Help,
        "exit" => Command::Exit,
        "show_colors" => Command::ShowColors,
        "show_coords" => Command::Show3DCoords,
        "show_idx" => Command::ShowIdx,
        str => match parse_idx(str, bound) {
            Ok(idx) => Command::Place { idx },
            Err(e) => Command::Error {
                message: format!("Error parsing command: {e}"),
            },
        },
    }
}

/// Prints the help message listing all available commands.
fn print_help() {
    println!("Available commands:");
    println!("  <number>        - Place a piece at the specified index number");
    println!("  resign          - Resign from the game");
    println!("  show_coords     - Toggle showing coordinates on the board");
    println!("  show_idx        - Toggle showing index numbers on the board");
    println!("  show_colors     - Toggle showing colors on the board");
    println!("  save <filename> - Save the current game state to a file");
    println!("  load <filename> - Load a game state from a file");
    println!("  exit            - Exit the game");
    println!("  help            - Show this help message");
}

/// Represents a parsed CLI command.
#[derive(Debug, PartialEq)]
pub enum Command {
    /// Place a piece at the given cell index.
    Place { idx: u32 },
    /// Resign from the game.
    Resign,
    /// No command was entered (empty input).
    None,
    /// An error occurred while parsing the command.
    Error { message: String },
    /// Save the game to a file.
    Save { filename: String },
    /// Load a game from a file.
    Load { filename: String },
    /// Toggle display of 3D coordinates.
    Show3DCoords,
    /// Toggle display of colors.
    ShowColors,
    /// Toggle display of cell indices.
    ShowIdx,
    /// Exit the game.
    Exit,
    /// Show help message.
    Help,
}

/// Parses a string as a cell index and validates it's within bounds.
///
/// # Arguments
/// * `part` - The string to parse as a number
/// * `bound` - The exclusive upper bound (index must be < bound)
///
/// # Returns
/// * `Ok(index)` if parsing succeeds and index is valid
/// * `Err(message)` if parsing fails or index is out of bounds
pub fn parse_idx(part: &str, bound: u32) -> Result<u32, String> {
    let n = part
        .parse::<u32>()
        .map_err(|_| "Invalid index (not a number)".to_string())?;
    if n >= bound {
        return Err(format!("Index out of bounds: {} > {}", n, bound - 1));
    }
    Ok(n)
}

/// Application logic for a Move command (Human + optional Bot response)
fn handle_place_command(
    game: &mut GameY,
    idx: u32,
    player: PlayerId,
    mode: Mode,
    bot: &dyn YBot,
) {
    let coords = Coordinates::from_index(idx, game.board_size());
    let movement = Movement::Placement { player, coords };

    if apply_move(game, movement, "Error adding move") {
        // Only trigger bot if the human move was valid, mode is computer, and game isn't over
        if mode == Mode::Computer && !game.check_game_over() {
            trigger_bot_move(game, bot);
        }
    }
}

/// AI logic extracted to its own function
fn trigger_bot_move(game: &mut GameY, bot: &dyn YBot) {
    if let Some(bot_coords) = bot.choose_move(game) {
        // Assuming next_player() is safe to unwrap here because the game isn't over
        if let Some(bot_player) = game.next_player() {
            let bot_movement = Movement::Placement {
                player: bot_player,
                coords: bot_coords,
            };
            apply_move(game, bot_movement, "Error adding bot move");
        }
    } else {
        println!("No available moves for the bot.");
    }
}

/// Generic helper to apply a move and handle the Result printing
/// Returns true if the move was successful
fn apply_move(game: &mut GameY, movement: Movement, error_msg: &str) -> bool {
    match game.add_move(movement) {
        Ok(()) => true,
        Err(e) => {
            println!("{}: {}", error_msg, e);
            false
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_mode_display_computer() {
        assert_eq!(format!("{}", Mode::Computer), "computer");
    }

    #[test]
    fn test_mode_display_human() {
        assert_eq!(format!("{}", Mode::Human), "human");
    }

    #[test]
    fn test_mode_display_server() {
        assert_eq!(format!("{}", Mode::Server), "server");
    }

    #[test]
    fn test_parse_idx_valid() {
        assert_eq!(parse_idx("5", 10), Ok(5));
        assert_eq!(parse_idx("0", 10), Ok(0));
        assert_eq!(parse_idx("9", 10), Ok(9));
    }

    #[test]
    fn test_parse_idx_out_of_bounds() {
        let result = parse_idx("10", 10);
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("out of bounds"));
    }

    #[test]
    fn test_parse_idx_not_a_number() {
        let result = parse_idx("abc", 10);
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("not a number"));
    }

    #[test]
    fn test_parse_idx_negative() {
        let result = parse_idx("-1", 10);
        assert!(result.is_err());
    }

    #[test]
    fn test_parse_command_place() {
        let cmd = parse_command("5", 10);
        assert_eq!(cmd, Command::Place { idx: 5 });
    }

    #[test]
    fn test_parse_command_resign() {
        let cmd = parse_command("resign", 10);
        assert_eq!(cmd, Command::Resign);
    }

    #[test]
    fn test_parse_command_help() {
        let cmd = parse_command("help", 10);
        assert_eq!(cmd, Command::Help);
    }

    #[test]
    fn test_parse_command_exit() {
        let cmd = parse_command("exit", 10);
        assert_eq!(cmd, Command::Exit);
    }

    #[test]
    fn test_parse_command_show_colors() {
        let cmd = parse_command("show_colors", 10);
        assert_eq!(cmd, Command::ShowColors);
    }

    #[test]
    fn test_parse_command_show_coords() {
        let cmd = parse_command("show_coords", 10);
        assert_eq!(cmd, Command::Show3DCoords);
    }

    #[test]
    fn test_parse_command_show_idx() {
        let cmd = parse_command("show_idx", 10);
        assert_eq!(cmd, Command::ShowIdx);
    }

    #[test]
    fn test_parse_command_save() {
        let cmd = parse_command("save game.json", 10);
        assert_eq!(
            cmd,
            Command::Save {
                filename: "game.json".to_string()
            }
        );
    }

    #[test]
    fn test_parse_command_load() {
        let cmd = parse_command("load game.json", 10);
        assert_eq!(
            cmd,
            Command::Load {
                filename: "game.json".to_string()
            }
        );
    }

    #[test]
    fn test_parse_command_save_no_filename() {
        let cmd = parse_command("save", 10);
        match cmd {
            Command::Error { message } => {
                assert!(message.contains("Filename required"));
            }
            _ => panic!("Expected Error command"),
        }
    }

    #[test]
    fn test_parse_command_load_no_filename() {
        let cmd = parse_command("load", 10);
        match cmd {
            Command::Error { message } => {
                assert!(message.contains("Filename required"));
            }
            _ => panic!("Expected Error command"),
        }
    }

    #[test]
    fn test_parse_command_empty() {
        let cmd = parse_command("", 10);
        assert_eq!(cmd, Command::None);
    }

    #[test]
    fn test_parse_command_whitespace() {
        let cmd = parse_command("   ", 10);
        assert_eq!(cmd, Command::None);
    }

    #[test]
    fn test_parse_command_invalid_number() {
        let cmd = parse_command("abc", 10);
        match cmd {
            Command::Error { message } => {
                assert!(message.contains("Error parsing"));
            }
            _ => panic!("Expected Error command"),
        }
    }

    #[test]
    fn test_parse_command_out_of_bounds() {
        let cmd = parse_command("100", 10);
        match cmd {
            Command::Error { message } => {
                assert!(message.contains("out of bounds"));
            }
            _ => panic!("Expected Error command"),
        }
    }

    #[test]
    fn test_command_debug() {
        let cmd = Command::Place { idx: 5 };
        let debug = format!("{:?}", cmd);
        assert!(debug.contains("Place"));
        assert!(debug.contains("5"));
    }
}

