#!/usr/bin/env bash
# migrate-pass.sh — import all pass entries into Vaultz's SQLite DB
# Maps pass subdirectories to folders (creates them if missing, max 10)
set -euo pipefail

# Allow pinentry to prompt in this terminal; agent caches after first unlock
export GPG_TTY=$(tty)

DB="$HOME/Library/Application Support/store.tinyforge.vaultz/passwords.db"
STORE="${PASSWORD_STORE_DIR:-$HOME/.password-store}"

esc() { echo "$1" | sed "s/'/''/g"; }

# Returns folder_id for a given name, creating it if needed (max 10 folders enforced by app)
get_or_create_folder() {
  local name="$1"
  local escaped
  escaped="$(esc "$name")"

  local existing
  existing=$(sqlite3 "$DB" "SELECT id FROM folders WHERE name = '$escaped' LIMIT 1;")
  if [ -n "$existing" ]; then
    echo "$existing"
    return
  fi

  local count
  count=$(sqlite3 "$DB" "SELECT COUNT(*) FROM folders;")
  if [ "$count" -ge 10 ]; then
    echo "  [warn] folder limit reached (10), using General for: $name" >&2
    sqlite3 "$DB" "SELECT id FROM folders ORDER BY id LIMIT 1;"
    return
  fi

  sqlite3 "$DB" "INSERT INTO folders (name, icon, is_default) VALUES ('$escaped', 'folder', 0);"
  sqlite3 "$DB" "SELECT last_insert_rowid();"
}

DEFAULT_FOLDER_ID=$(sqlite3 "$DB" "SELECT id FROM folders ORDER BY id LIMIT 1;")

find "$STORE" -name '*.gpg' | sort | while read -r file; do
  rel="${file#$STORE/}"
  entry="${rel%.gpg}"
  service=$(basename "$entry")
  dir=$(dirname "$entry")

  if [ "$dir" = "." ]; then
    folder_id="$DEFAULT_FOLDER_ID"
  else
    top_dir=$(echo "$dir" | cut -d'/' -f1)
    folder_id=$(get_or_create_folder "$top_dir")
  fi

  echo "Importing: $entry → folder_id=$folder_id"
  content=$(pass show "$entry") || { echo "  skipped (GPG failed)"; continue; }

  password=$(echo "$content" | head -1)
  rest=$(echo "$content" | tail -n +2)

  # grep exits 1 on no match — || true prevents set -e from killing the script
  username=$(echo "$rest" | grep -iE '^(username|login|user):' | head -1 | sed 's/^[^:]*: *//' || true)
  email=$(echo "$rest"    | grep -iE '^(email):'               | head -1 | sed 's/^[^:]*: *//' || true)
  url=$(echo "$rest"      | grep -iE '^(url|website|uri):'     | head -1 | sed 's/^[^:]*: *//' || true)
  notes=$(echo "$rest"    | grep -ivE '^(username|login|user|email|url|website|uri):' | tr '\n' ' ' | sed 's/ *$//' || true)

  sqlite3 "$DB" \
    "INSERT INTO passwords (name, username, email, password, website, notes, folder_id)
     VALUES ('$(esc "$service")',
             $([ -n "$username" ] && echo "'$(esc "$username")'" || echo 'NULL'),
             $([ -n "$email"    ] && echo "'$(esc "$email")'"    || echo 'NULL'),
             '$(esc "$password")',
             $([ -n "$url"      ] && echo "'$(esc "$url")'"      || echo 'NULL'),
             $([ -n "$notes"    ] && echo "'$(esc "$notes")'"    || echo 'NULL'),
             $folder_id);"

  echo "  done"
done

echo "Migration complete."
