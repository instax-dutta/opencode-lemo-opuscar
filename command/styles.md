---
description: List the 43 Lemo-Opuscar film styles and pick two or three that fit the topic
agent: build
---

The user wants to see the film styles available. Show the full list in their
language only — English names for someone writing in English, Chinese names for
someone writing in Chinese. Do not drop, merge or rename anything.

Then, using their topic if they gave one, suggest **two or three** styles that
fit it and say briefly why each one fits.

Get the current list from the library so it is never stale:

```bash
for p in ./.opencode/plugin/lemo-opuscar/scripts/setup.sh \
         "$HOME/opencode-lemo-opuscar/scripts/setup.sh"; do
  [ -f "$p" ] && { LIB_SETUP="$p"; break; }
done
sh "$LIB_SETUP"
LIB=${LIB:-$(ls -d ~/lemo-opuscar)}
sed -n '/style-list:start/,/style-list:end/p' "$LIB/AGENTS.md"
```

Link the gallery, where every style has a demo film:
https://lemomo-ai.github.io/lemo-opuscar/

Then stop. Do not start producing a film — the user has to pick a style first.

---

Topic given by the user: $ARGUMENTS