// Input helpers — interactive prompts and password reading

use std::{
    env,
    io::{self, Write},
    process,
};

pub fn read_password(msg: &str) -> String {
    rpassword::prompt_password(msg).unwrap_or_else(|e| {
        eprintln!("Cannot read password: {}", e);
        process::exit(1);
    })
}

pub fn get_master_password() -> String {
    if let Ok(pw) = env::var("PM_PASSWORD") {
        return pw;
    }
    read_password("Master password: ")
}

pub fn prompt(msg: &str) -> String {
    print!("{}", msg);
    io::stdout().flush().ok();
    let mut buf = String::new();
    io::stdin().read_line(&mut buf).ok();
    buf.trim().to_string()
}

pub fn prompt_optional(msg: &str) -> Option<String> {
    let s = prompt(msg);
    if s.is_empty() { None } else { Some(s) }
}

pub fn prompt_usize(msg: &str, min: usize, max: usize) -> usize {
    loop {
        let s = prompt(msg);
        match s.parse::<usize>() {
            Ok(n) if (min..=max).contains(&n) => return n,
            _ => eprintln!("Enter a number from {} to {}", min, max),
        }
    }
}
