#!/bin/sh
# Install opencode-lemo-opuscar for OpenCode.
#
#   sh install.sh              global  -> ~/.config/opencode/
#   sh install.sh --project    project -> ./.opencode/   (current directory)
#   sh install.sh --uninstall  remove it again
#
# Installs the JS plugin, the skill, the agent and the command. The Lemo-Opuscar
# library itself is NOT cloned here -- the `lemo_setup` tool does that on first
# use, so installing this plugin stays fast and offline-friendly.
set -e

# Flags may appear in any order and may combine, e.g. --project --uninstall.
TARGET=global
UNINSTALL=
for arg in "$@"; do
  case "$arg" in
    --project|-p) TARGET=project ;;
    --uninstall|-u) UNINSTALL=1 ;;
    --help|-h) sed -n '2,12p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    "") ;;
    *) echo "unknown option: $arg (try --help)"; exit 1 ;;
  esac
done

SRC=$(cd "$(dirname "$0")" && pwd -P)
if [ "$TARGET" = project ]; then
  DST="${PWD}/.opencode"
  LABEL="project ($DST)"
else
  DST="${XDG_CONFIG_HOME:-$HOME/.config}/opencode"
  LABEL="global ($DST)"
fi

if [ -n "$UNINSTALL" ]; then
  for p in plugin/lemo-opuscar.js skills/lemo-opuscar agent/film-director.md command/styles.md; do
    if [ -e "$DST/$p" ]; then rm -rf "$DST/$p" && echo "removed $DST/$p"; fi
  done
  # .opencode/node_modules/@opencode-lemo-opuscar is ours; leave other plugins alone
  rm -rf "$DST/node_modules/@opencode-lemo-opuscar" 2>/dev/null || true
  echo "uninstalled from $LABEL"
  exit 0
fi

command -v node >/dev/null || { echo "✗ node is required (Node 20+)"; exit 1; }
NODE_MAJOR=$(node -p 'process.versions.node.split(".")[0]')
[ "$NODE_MAJOR" -ge 20 ] 2>/dev/null || { echo "✗ Node 20+ required, found $(node -v)"; exit 1; }

mkdir -p "$DST/plugin" "$DST/skills" "$DST/agent" "$DST/command"

# JS plugin
cp "$SRC/src/index.js" "$DST/plugin/lemo-opuscar.js"
echo "installed plugin   -> $DST/plugin/lemo-opuscar.js"

# skill (setup.sh is copied verbatim from upstream, MIT)
mkdir -p "$DST/skills/lemo-opuscar/scripts"
cp "$SRC/skills/lemo-opuscar/SKILL.md" "$DST/skills/lemo-opuscar/SKILL.md"
cp "$SRC/skills/lemo-opuscar/scripts/setup.sh" "$DST/skills/lemo-opuscar/scripts/setup.sh"
chmod +x "$DST/skills/lemo-opuscar/scripts/setup.sh"
echo "installed skill    -> $DST/skills/lemo-opuscar/"

# agent + command
cp "$SRC/agent/film-director.md" "$DST/agent/film-director.md"
cp "$SRC/command/styles.md" "$DST/command/styles.md"
echo "installed agent    -> $DST/agent/film-director.md"
echo "installed command  -> $DST/command/styles.md"

cat <<EOF

Installed to $LABEL.

Next:
  1. Restart OpenCode.
  2. Ask it "list the film styles" or run /styles.
  3. To make a film: ask for a film in a named style. The agent calls
     lemo_setup, which clones the library and installs the core packages.

Check the install any time with the lemo_status or lemo_doctor tool.
EOF