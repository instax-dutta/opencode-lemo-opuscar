# opencode-lemo-opuscar

[Lemo-Opuscar](https://github.com/lemomo-ai/lemo-opuscar) film styles for
[OpenCode](https://opencode.ai). Your agent directs, draws, scores and mixes a
short film made entirely in code — in one of 43 code-rendered styles.

**This is an adapter.** The upstream library is used unmodified; this repo only
teaches OpenCode how to find it, install it and work with it.

## Install

```sh
git clone https://github.com/instax-dutta/opencode-lemo-opuscar
cd opencode-lemo-opuscar
sh install.sh              # global  -> ~/.config/opencode/
sh install.sh --project    # project -> ./.opencode/
sh install.sh --uninstall  # remove
```

Requires Node 20+. The Lemo-Opuscar library itself is **not** cloned by the
installer — the agent clones it on first use via the `lemo_setup` tool, so
installing stays fast.

Restart OpenCode afterwards.

## What you get

| | |
|---|---|
| **Skill** `lemo-opuscar` | Loads the library and hands over to its guides. Triggers on "make a film/video/short/promo/explainer/animation" in a named style. |
| **Agent** `film-director` | A primary agent for the full job — treatment, voice, score, animation, mix, render. |
| **Command** `/styles` | Lists the 43 styles and suggests two or three that fit your topic. |
| **Tools** | `lemo_setup`, `lemo_styles`, `lemo_status`, `lemo_doctor` |

## Tools

| Tool | What it does |
|---|---|
| `lemo_setup` | Clone or update the library; install a tier (`core`, `voice`, `music`); fetch one demo source. |
| `lemo_styles` | List all 43 styles, or filter by category (e.g. `东方传统`, `Cinema & Eras`). |
| `lemo_status` | Where the library is, which tiers are installed, which system tools are missing. |
| `lemo_doctor` | Diagnose a broken install: bad venv, missing packages, wrong Node version. Changes nothing. |

## Usage

```
/styles
```

```
make a 60-second promo for my API in Blueprint style
```

```
用中国水墨风格做一个关于量子计算的短片
```

The agent will ask **one** round of questions, write a `TREATMENT.md`, then
produce: voice → score → animation → mix → render.

## How it differs from the Claude Code plugin

| | Claude Code | OpenCode (this) |
|---|---|---|
| Skill discovery | `.claude-plugin/marketplace.json` | `.opencode/skills/*/SKILL.md` |
| Agent | markdown subagent | `agent/*.md` in the OpenCode plugin dir, `mode: primary` |
| Commands | `commands/*.md` | `command/*.md` |
| Custom tools | not available | JS plugin, `src/index.js` |
| Interactive questions | `AskUserQuestion` tool | plain chat — the skill says to ask all questions in one message |

Upstream ships a skill and a setup script. This adds the agent, the `/styles`
command, and four tools that make install and diagnosis self-service — including
`lemo_status` and `lemo_doctor`, so a user can find missing system tools before
a long render rather than after.

## Requirements

Node 20+. For rendering: `ffmpeg`, and `uv` or Python 3.11+ (the library sets up
its own venv). `lemo_status` tells you exactly what's missing.

## Credits & licence

- Lemo-Opuscar library — MIT, © [lemomo-ai](https://github.com/lemomo-ai).
  `skills/lemo-opuscar/scripts/setup.sh` is copied **verbatim** from upstream.
- Style guides (`STYLE.md`) are CC BY 4.0. Each demo carries its own `CREDITS`
  for third-party sample, font and music licences.
- Films you make are yours: no LemoLab credit, no watermark.

This adapter: MIT.