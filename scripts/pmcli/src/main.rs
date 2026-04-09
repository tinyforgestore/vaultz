// pmcli — CLI for the password manager vault
//
// Usage: cargo run --manifest-path scripts/pmcli/Cargo.toml -- <command> [args]
//
// Master password: set PM_PASSWORD env var or enter at prompt.

use clap::{Parser, Subcommand};

mod commands;
mod constants;
mod db;
mod input;
mod util;

use commands::{add::cmd_add, copy::cmd_copy, delete::cmd_delete, export::cmd_export,
               import::cmd_import, list::cmd_list, show::cmd_show};
use db::{open_db, with_auth};

#[derive(Parser)]
#[command(name = "pmcli", about = "Password manager CLI")]
struct Cli {
    #[command(subcommand)]
    command: Cmd,
}

#[derive(Subcommand)]
enum Cmd {
    /// List all entries
    List,
    /// Show a decrypted entry (requires master password)
    Show { name: String },
    /// Copy a password to clipboard (requires master password)
    Copy { name: String },
    /// Add a new entry interactively (requires master password)
    Add,
    /// Delete an entry (requires master password)
    Delete { name: String },
    /// Export vault as an encrypted .pmvault file
    Export {
        #[arg(long)]
        out: String,
    },
    /// Import a .pmvault file (replaces the current vault)
    Import { file: String },
}

fn main() {
    let cli = Cli::parse();

    match cli.command {
        Cmd::List => cmd_list(&open_db()),
        Cmd::Show { name } => with_auth(|conn, key| cmd_show(conn, &name, key)),
        Cmd::Copy { name } => with_auth(|conn, key| cmd_copy(conn, &name, key)),
        Cmd::Add => with_auth(|conn, key| cmd_add(conn, key)),
        Cmd::Delete { name } => with_auth(|conn, _key| cmd_delete(conn, &name)),
        Cmd::Export { out } => cmd_export(&open_db(), &out),
        Cmd::Import { file } => cmd_import(&file),
    }
}
