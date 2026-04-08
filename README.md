# Password Manager

A local-first desktop password manager built with Tauri 2, React 19, and SQLite. All data is stored on your machine — no cloud, no sync, no accounts.

## Features

- **Vault creation** — set a master password on first launch; vault is stored locally in your OS app data directory
- **Master password** — hashed with Argon2 + random salt; never stored in plain text
- **Field-level encryption** — passwords and notes are encrypted at rest with AES-256-GCM; the encryption key is derived from your master password via Argon2 and held only in memory for the session
- **Full CRUD** — create, view, edit, delete passwords and folders
- **Password generator** — configurable length (8–32), uppercase/lowercase/numbers/symbols
- **Favorites** — star passwords for quick access via the Favorites tab
- **Bulk actions** — multi-select, bulk delete, bulk favorite/unfavorite
- **Search** — search by name, username, email, or website
- **Auto-lock** — vault locks automatically after 5 minutes of inactivity
- **Change master password** — re-encrypts all stored fields with the new key
- **Vault export** — exports an AES-256-GCM encrypted `.pmvault` file protected by a separate passphrase
- **Vault import** — restores from a `.pmvault` backup file
- **Destroy vault** — permanently wipes the local database
- **pmcli** — standalone command-line tool for vault inspection and operations (`scripts/pmcli`)

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) 18+
- [pnpm](https://pnpm.io/) 8+
- [Rust](https://www.rust-lang.org/tools/install) (stable toolchain)
- [Tauri prerequisites](https://tauri.app/start/prerequisites/) for your platform

### Install dependencies

```bash
pnpm install
```

### Run in development mode

```bash
pnpm tauri dev
```

### Build for production

```bash
pnpm tauri build
```

The built app will be in `src-tauri/target/release/bundle/`.

## Usage

1. **First launch** — click "Create Vault" and set a master password (8+ characters)
2. **Login** — enter your master password; the vault auto-locks after 5 minutes of inactivity
3. **Add a password** — click the `+` button on the dashboard, fill in the fields, and save
4. **Generate a password** — use the embedded generator inside the create/edit modal
5. **Organize** — create folders and move passwords between them via the tab strip
6. **Favorites** — star passwords for quick access via the Favorites tab
7. **Bulk actions** — click the selection icon in the top bar to enter multi-select mode
8. **Settings** — change your master password, export or destroy your vault
9. **Export** — Settings → Export Vault → choose a passphrase; produces a `.pmvault` file
10. **Import** — on the login screen, click "Import Vault" and enter the export passphrase

## Tech Stack

| Layer | Technology |
|---|---|
| Desktop shell | Tauri 2 |
| Frontend | React 19, Vite 7, React Router 7 |
| State management | Jotai 2 |
| Styling | Vanilla Extract (type-safe CSS-in-JS) |
| UI components | Radix UI Themes 3 |
| Icons | Lucide Icons |
| Database | SQLite via rusqlite (bundled) |
| Password hashing | Argon2 (argon2 crate) |
| Field encryption | AES-256-GCM (aes-gcm crate) |

## Project Structure

```
src/
├── components/
│   ├── App/                  # Root layout, SessionWrapper
│   ├── modals/               # Create/edit/delete dialogs (passwords, folders, vault ops)
│   ├── PasswordCard/         # Password list item
│   ├── PasswordGenerator/    # Inline password generator widget
│   └── Toast/                # Clipboard toast notification
├── pages/
│   ├── LoginPage/
│   ├── Dashboard/
│   ├── PasswordDetailsPage/
│   └── SettingsPage/
├── hooks/                    # Business logic (one hook per page/feature)
│   ├── useClipboard.ts
│   ├── useDashboard.ts
│   ├── useFolderManager.ts
│   ├── useLoginPage.ts
│   ├── usePasswordDetails.ts
│   ├── usePasswordGenerator.ts
│   ├── usePasswordSelection.ts
│   ├── useSessionActivity.ts
│   └── useSettings.ts
├── services/
│   ├── sessionService.ts     # Auth, session timeout, activity tracking
│   └── storageService.ts     # Tauri invoke wrappers for all backend commands
├── store/atoms.ts            # Jotai atoms + async action atoms
├── types/index.ts            # TypeScript interfaces (Password, Folder, …)
├── constants/                # Folder IDs, limits
└── testUtils.tsx             # Jotai + MemoryRouter test provider

src-tauri/src/
├── lib.rs                    # Tauri app setup, plugin registration, command registration
├── state.rs                  # SessionState, DbState, shared helpers (with_db, parse_id)
├── crypto.rs                 # Argon2 hashing, AES-GCM encrypt/decrypt, key derivation
├── database/
│   ├── mod.rs                # Database struct, schema, migrations, test_helpers
│   ├── models.rs             # Rust structs (PasswordEntry, FolderEntry, input types)
│   ├── master.rs             # Master password hash + encryption salt CRUD
│   ├── folders.rs            # Folder CRUD + reassign
│   └── passwords.rs          # Password CRUD, search, bulk delete, encryption helpers
└── commands/
    ├── session/
    │   ├── setup.rs          # initialize_database, database_exists
    │   ├── auth.rs           # login, logout, is_authenticated, activity, timeout
    │   └── master.rs         # verify_master_password, change_master_password
    ├── folders.rs            # get_folders, create_folder, delete_folder
    ├── passwords.rs          # get_passwords, create/update/delete, search
    ├── vault.rs              # export_vault, import_vault, destroy_vault
    └── clipboard.rs          # write_secret_to_clipboard (concealed from clipboard managers)

scripts/
├── pmcli                     # CLI tool: list/get/export vault entries from the terminal
└── verify-vault              # Verify .pmvault file integrity
```

## Testing

### React (Vitest + Testing Library)

```bash
pnpm test          # run once
pnpm test --watch  # watch mode
```

- **157 tests** across 15 files
- Tests are co-located with source files (e.g. `useClipboard.ts` → `useClipboard.test.ts`)
- Tauri APIs are mocked via `__mocks__/@tauri-apps/`
- Jotai store is isolated per test via a custom `renderHookWithProviders` wrapper

### Rust (cargo test)

```bash
cd src-tauri
cargo test
```

- **71 tests** across 12 modules
- Each module has an inline `#[cfg(test)] mod tests` block
- Database tests use an in-memory SQLite helper (`database::test_helpers::in_memory_db`)
- Commands are tested by calling their inner business logic directly (Tauri `State<T>` is not constructable without a runtime)

## Contributing

### Branch naming

```
feature/<description>    # new features
fix/<description>        # bug fixes
```

### Before committing (Rust)

```bash
cargo fmt
cargo clippy
cargo test
```

### Before committing (Frontend)

```bash
pnpm lint
pnpm test --run     # confirm all tests pass
pnpm build          # confirm no TypeScript errors
```

## Data Location

| Platform | Path |
|---|---|
| macOS | `~/Library/Application Support/store.tinyforge.vaultz/passwords.db` |
| Windows | `%APPDATA%\store.tinyforge.vaultz\passwords.db` |
| Linux | `~/.local/share/store.tinyforge.vaultz/passwords.db` |

## License

Personal project — not licensed for distribution.
