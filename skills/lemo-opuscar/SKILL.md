---
name: lemo-opuscar
description: Direct and produce a short film made entirely in code, in one of the styles of the Lemo-Opuscar library (e.g. Impasto Oil Painting 油画厚涂, Watercolor Brush 水彩笔刷, Chinese Ink Wash 中国水墨, Ukiyo-e 浮世绘, Whiteboard Explainer 白板讲解). Use when the user asks for a video, film, short, promo, explainer or animation (视频、短片、动画、宣传片) in a named style; when they want a film made about their own topic and haven't chosen a style (help them choose); or when they ask which film styles there are. Not for editing or converting existing video files.
license: CC-BY-4.0
compatibility: opencode
metadata:
  upstream: lemomo-ai/lemo-opuscar
  upstream-license: MIT
  adapter: opencode
---

# Lemo-Opuscar (OpenCode)

The styles, guides and tools live in the Lemo-Opuscar library
(github.com/lemomo-ai/lemo-opuscar). This skill fetches it and hands you over
to it. This is an OpenCode adapter: the library itself is unmodified.

## What you do

1. **Get the library.** Run `sh "$LIB_SETUP"`. It clones or updates the library
   (default `~/lemo-opuscar`; a clone the user is standing in is used as it is)
   and prints `LIB=<path>` on its last line.
2. **Install the core tools early.** Start `sh "$LIB_SETUP" deps` right away,
   in the background if you can: it takes a few minutes the first time. Add
   `deps voice` or `deps music` later, only if the film needs them
   (`$LIB/TECHNIQUE.md` §1). Report missing system tools in your one round of
   questions; don't install system software yourself.
3. **Follow the library.** Read `$LIB/AGENTS.md` and do what it says: finding the
   style, the one round of questions, the treatment, production and delivery.

## Resolving `$LIB_SETUP`

This file ships inside a plugin repo, so the script path is not fixed. Resolve
it once, at the start:

```bash
# global install (default)
[ -f "${XDG_CONFIG_HOME:-$HOME/.config}/opencode/skills/lemo-opuscar/scripts/setup.sh" ] && \
  LIB_SETUP="${XDG_CONFIG_HOME:-$HOME/.config}/opencode/skills/lemo-opuscar/scripts/setup.sh"

# project-local install
[ -f ./.opencode/skills/lemo-opuscar/scripts/setup.sh ] && \
  LIB_SETUP=./.opencode/skills/lemo-opuscar/scripts/setup.sh

# standalone clone of the adapter repo
[ -f "$HOME/opencode-lemo-opuscar/skills/lemo-opuscar/scripts/setup.sh" ] && \
  LIB_SETUP="$HOME/opencode-lemo-opuscar/skills/lemo-opuscar/scripts/setup.sh"
```

Whichever path exists. Then substitute it for `$LIB_SETUP` in every command
below. If neither exists, the library may still be present — in that case just
use `LIB=$(ls -d ~/lemo-opuscar 2>/dev/null)` and skip step 1.

## What changes in skill mode

| | |
|---|---|
| Project folder | `<name>/` in the folder the user started from (lowercase letters, digits, hyphens; avoid `#` and `?` in the path). Wherever the guides say `films/<name>/`, read this folder |
| Running tools | from `$LIB`, with the project's absolute path: `cd "$LIB" && node core/render/still.mjs "<project>" 1.5 3` |
| Library files in pages | absolute URLs: `/core/lib.js`, `/node_modules/three/…` (the project is served at `/@film/`) |
| Library files in scripts and `build.sh` | `$LIB/…`, with `LIB=<path>` at the top of `build.sh`; never `../..` |
| Demo source | not downloaded. `sh "$LIB_SETUP" demo <slug>`, only after your `TREATMENT.md` is written, to read its techniques; it is not meant to be rendered |

Deliver what `$LIB/DIRECTOR.md` §11 lists, in the project folder, and tell the
user where it is.

## OpenCode specifics

- **Tool calls:** use the `bash` tool for every `sh`/`node`/`npm` invocation.
  There is no separate shell tool in OpenCode.
- **Long renders:** `bash` has a timeout. Start big renders with
  `background: true` and poll with the process tool rather than blocking.
- **No `AskUserQuestion` tool.** The library's "one round of questions"
  (AGENTS.md §Workflow 1) must be asked as one plain chat message containing
  all of the questions at once, then wait for a single reply.
- **Read the guides with `read`.** `AGENTS.md`, `DIRECTOR.md`,
  `TECHNIQUE.md` and `styles/<slug>/STYLE.md` are all plain files under `$LIB`.

## Attribution

Films made with this adapter are the user's own: no LemoLab credit, no
watermark, per AGENTS.md. Style guides and `STYLE.md` files remain CC BY 4.0;
library code is MIT. See the upstream `CREDITS` in each demo for third-party
sample, font and music licences.