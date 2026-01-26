//! GameY binary entry point.
//!
//! This is the main executable for the GameY application. It supports three modes:
//!
//! - **Human mode** (default): Two players take turns at the terminal
//! - **Computer mode**: Play against a bot
//! - **Server mode**: Run as an HTTP server exposing the bot API
//!
//! # Usage
//!
//! ```bash
//! # Play human vs human (default)
//! gamey
//!
//! # Play against the random bot
//! gamey --mode computer
//!
//! # Start the bot server on port 3000
//! gamey --mode server --port 3000
//! ```

use clap::Parser;
use gamey::{self, CliArgs, Mode, run_bot_server, run_cli_game};
use tracing_subscriber::prelude::*;

/// Main entry point for the GameY application.
///
/// Parses command-line arguments and runs either the CLI game or the HTTP server
/// depending on the selected mode.
#[tokio::main]
async fn main() {
    tracing_subscriber::registry().init();
    let args = CliArgs::parse();

    if args.mode == Mode::Server {
        if let Err(e) = run_bot_server(args.port).await {
            eprintln!("Error: {}", e);
            std::process::exit(1);
        }
    } else {
        run_cli_game().expect("End CLI game");
    }
}
