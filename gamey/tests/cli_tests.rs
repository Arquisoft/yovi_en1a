use gamey::{Command, Mode, parse_command, parse_idx};

// =============================================================================
// parse_command Tests
// =============================================================================

#[test]
fn test_parse_command_place_valid_index() {
    let command = parse_command("5", 10);
    assert_eq!(command, Command::Place { idx: 5 });
}

#[test]
fn test_parse_command_place_zero_index() {
    let command = parse_command("0", 10);
    assert_eq!(command, Command::Place { idx: 0 });
}

#[test]
fn test_parse_command_place_max_valid_index() {
    let command = parse_command("9", 10);
    assert_eq!(command, Command::Place { idx: 9 });
}

#[test]
fn test_parse_command_place_index_out_of_bounds() {
    let command = parse_command("10", 10);
    assert!(matches!(command, Command::Error { .. }));
}

#[test]
fn test_parse_command_place_large_index_out_of_bounds() {
    let command = parse_command("100", 10);
    assert!(matches!(command, Command::Error { .. }));
}

#[test]
fn test_parse_command_resign() {
    let command = parse_command("resign", 10);
    assert_eq!(command, Command::Resign);
}

#[test]
fn test_parse_command_help() {
    let command = parse_command("help", 10);
    assert_eq!(command, Command::Help);
}

#[test]
fn test_parse_command_exit() {
    let command = parse_command("exit", 10);
    assert_eq!(command, Command::Exit);
}

#[test]
fn test_parse_command_show_colors() {
    let command = parse_command("show_colors", 10);
    assert_eq!(command, Command::ShowColors);
}

#[test]
fn test_parse_command_show_coords() {
    let command = parse_command("show_coords", 10);
    assert_eq!(command, Command::Show3DCoords);
}

#[test]
fn test_parse_command_show_idx() {
    let command = parse_command("show_idx", 10);
    assert_eq!(command, Command::ShowIdx);
}

#[test]
fn test_parse_command_save_with_filename() {
    let command = parse_command("save game.json", 10);
    assert_eq!(
        command,
        Command::Save {
            filename: "game.json".to_string()
        }
    );
}

#[test]
fn test_parse_command_save_without_filename() {
    let command = parse_command("save", 10);
    assert!(matches!(command, Command::Error { .. }));
    if let Command::Error { message } = command {
        assert!(message.contains("Filename required"));
    }
}

#[test]
fn test_parse_command_load_with_filename() {
    let command = parse_command("load saved_game.json", 10);
    assert_eq!(
        command,
        Command::Load {
            filename: "saved_game.json".to_string()
        }
    );
}

#[test]
fn test_parse_command_load_without_filename() {
    let command = parse_command("load", 10);
    assert!(matches!(command, Command::Error { .. }));
    if let Command::Error { message } = command {
        assert!(message.contains("Filename required"));
    }
}

#[test]
fn test_parse_command_empty_input() {
    let command = parse_command("", 10);
    assert_eq!(command, Command::None);
}

#[test]
fn test_parse_command_whitespace_only() {
    let command = parse_command("   ", 10);
    assert_eq!(command, Command::None);
}

#[test]
fn test_parse_command_invalid_command() {
    let command = parse_command("invalid_command", 10);
    assert!(matches!(command, Command::Error { .. }));
}

#[test]
fn test_parse_command_negative_number() {
    let command = parse_command("-5", 10);
    assert!(matches!(command, Command::Error { .. }));
}

#[test]
fn test_parse_command_with_leading_whitespace() {
    let command = parse_command("  5", 10);
    assert_eq!(command, Command::Place { idx: 5 });
}

#[test]
fn test_parse_command_with_trailing_whitespace() {
    let command = parse_command("5  ", 10);
    assert_eq!(command, Command::Place { idx: 5 });
}

#[test]
fn test_parse_command_save_with_path() {
    let command = parse_command("save /tmp/game.json", 10);
    assert_eq!(
        command,
        Command::Save {
            filename: "/tmp/game.json".to_string()
        }
    );
}

// =============================================================================
// parse_idx Tests
// =============================================================================

#[test]
fn test_parse_idx_valid_zero() {
    let result = parse_idx("0", 10);
    assert_eq!(result, Ok(0));
}

#[test]
fn test_parse_idx_valid_middle() {
    let result = parse_idx("5", 10);
    assert_eq!(result, Ok(5));
}

#[test]
fn test_parse_idx_valid_max() {
    let result = parse_idx("9", 10);
    assert_eq!(result, Ok(9));
}

#[test]
fn test_parse_idx_out_of_bounds_equal() {
    let result = parse_idx("10", 10);
    assert!(result.is_err());
    assert!(result.unwrap_err().contains("out of bounds"));
}

#[test]
fn test_parse_idx_out_of_bounds_larger() {
    let result = parse_idx("100", 10);
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
fn test_parse_idx_negative_number() {
    let result = parse_idx("-1", 10);
    assert!(result.is_err());
    assert!(result.unwrap_err().contains("not a number"));
}

#[test]
fn test_parse_idx_float_number() {
    let result = parse_idx("5.5", 10);
    assert!(result.is_err());
}

#[test]
fn test_parse_idx_empty_string() {
    let result = parse_idx("", 10);
    assert!(result.is_err());
}

#[test]
fn test_parse_idx_bound_of_one() {
    let result = parse_idx("0", 1);
    assert_eq!(result, Ok(0));

    let result = parse_idx("1", 1);
    assert!(result.is_err());
}

#[test]
fn test_parse_idx_large_valid_number() {
    let result = parse_idx("999", 1000);
    assert_eq!(result, Ok(999));
}

// =============================================================================
// Mode enum Tests
// =============================================================================

#[test]
fn test_mode_display_computer() {
    let mode = Mode::Computer;
    assert_eq!(format!("{}", mode), "computer");
}

#[test]
fn test_mode_display_human() {
    let mode = Mode::Human;
    assert_eq!(format!("{}", mode), "human");
}

#[test]
fn test_mode_display_server() {
    let mode = Mode::Server;
    assert_eq!(format!("{}", mode), "server");
}

#[test]
fn test_mode_equality() {
    assert_eq!(Mode::Computer, Mode::Computer);
    assert_eq!(Mode::Human, Mode::Human);
    assert_eq!(Mode::Server, Mode::Server);
    assert_ne!(Mode::Computer, Mode::Human);
    assert_ne!(Mode::Human, Mode::Server);
}

// =============================================================================
// CliArgs parsing Tests (using clap's try_parse_from)
// =============================================================================

use clap::Parser;
use gamey::CliArgs;

#[test]
fn test_cli_args_default_values() {
    let args = CliArgs::try_parse_from(["gamey"]).unwrap();
    assert_eq!(args.size, 7);
    assert_eq!(args.mode, Mode::Human);
    assert_eq!(args.bot, "random_bot");
    assert_eq!(args.port, 3000);
}

#[test]
fn test_cli_args_custom_size() {
    let args = CliArgs::try_parse_from(["gamey", "--size", "10"]).unwrap();
    assert_eq!(args.size, 10);
}

#[test]
fn test_cli_args_custom_size_short() {
    let args = CliArgs::try_parse_from(["gamey", "-s", "5"]).unwrap();
    assert_eq!(args.size, 5);
}

#[test]
fn test_cli_args_mode_computer() {
    let args = CliArgs::try_parse_from(["gamey", "--mode", "computer"]).unwrap();
    assert_eq!(args.mode, Mode::Computer);
}

#[test]
fn test_cli_args_mode_human() {
    let args = CliArgs::try_parse_from(["gamey", "--mode", "human"]).unwrap();
    assert_eq!(args.mode, Mode::Human);
}

#[test]
fn test_cli_args_mode_server() {
    let args = CliArgs::try_parse_from(["gamey", "--mode", "server"]).unwrap();
    assert_eq!(args.mode, Mode::Server);
}

#[test]
fn test_cli_args_mode_short() {
    let args = CliArgs::try_parse_from(["gamey", "-m", "computer"]).unwrap();
    assert_eq!(args.mode, Mode::Computer);
}

#[test]
fn test_cli_args_custom_bot() {
    let args = CliArgs::try_parse_from(["gamey", "--bot", "smart_bot"]).unwrap();
    assert_eq!(args.bot, "smart_bot");
}

#[test]
fn test_cli_args_custom_bot_short() {
    let args = CliArgs::try_parse_from(["gamey", "-b", "my_bot"]).unwrap();
    assert_eq!(args.bot, "my_bot");
}

#[test]
fn test_cli_args_custom_port() {
    let args = CliArgs::try_parse_from(["gamey", "--port", "8080"]).unwrap();
    assert_eq!(args.port, 8080);
}

#[test]
fn test_cli_args_custom_port_short() {
    let args = CliArgs::try_parse_from(["gamey", "-p", "9000"]).unwrap();
    assert_eq!(args.port, 9000);
}

#[test]
fn test_cli_args_combined_options() {
    let args = CliArgs::try_parse_from([
        "gamey",
        "-s",
        "9",
        "-m",
        "computer",
        "-b",
        "advanced_bot",
        "-p",
        "5000",
    ])
    .unwrap();
    assert_eq!(args.size, 9);
    assert_eq!(args.mode, Mode::Computer);
    assert_eq!(args.bot, "advanced_bot");
    assert_eq!(args.port, 5000);
}

#[test]
fn test_cli_args_invalid_mode() {
    let result = CliArgs::try_parse_from(["gamey", "--mode", "invalid"]);
    assert!(result.is_err());
}

#[test]
fn test_cli_args_invalid_size_not_number() {
    let result = CliArgs::try_parse_from(["gamey", "--size", "abc"]);
    assert!(result.is_err());
}

#[test]
fn test_cli_args_invalid_port_not_number() {
    let result = CliArgs::try_parse_from(["gamey", "--port", "not_a_port"]);
    assert!(result.is_err());
}

#[test]
fn test_cli_args_help_flag() {
    let result = CliArgs::try_parse_from(["gamey", "--help"]);
    assert!(result.is_err()); // --help causes an error (but it's intentional)
}

#[test]
fn test_cli_args_version_flag() {
    let result = CliArgs::try_parse_from(["gamey", "--version"]);
    assert!(result.is_err()); // --version causes an error (but it's intentional)
}
