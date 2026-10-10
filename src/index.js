/**
 * Lemo-Opuscar for OpenCode.
 *
 * Adds four custom tools around the unmodified Lemo-Opuscar library:
 *
 *   lemo_setup    clone/update the library, install a dependency tier
 *   lemo_styles   list the 43 styles, or filter by category
 *   lemo_status   where the library is, what is installed, what is missing
 *   lemo_doctor   diagnose a broken install
 *
 * The library itself is never modified. This plugin only finds it, installs it,
 * and reports on it -- it does not render anything, so nothing here is
 * load-bearing for a film in progress.
 */

import { tool } from "@opencode-ai/plugin"

const REPO = "https://github.com/lemomo-ai/lemo-opuscar.git"

/** Where the library lives. Mirrors the upstream setup.sh resolution order. */
function resolveLib(env) {
  return env.LEMO_OPUSCAR_HOME || (env.HOME ?? "~") + "/lemo-opuscar"
}

/**
 * Locate setup.sh the same way SKILL.md tells the model to: plugin installed
 * either project-local or standalone. Falls back to the standalone clone.
 */
function setupScript() {
  return [
    "$HOME/opencode-lemo-opuscar/skills/lemo-opuscar/scripts/setup.sh",
    "./.opencode/plugin/lemo-opuscar/skills/lemo-opuscar/scripts/setup.sh",
  ]
}

const CATEGORIES = [
  ["Hand-drawn & Painting", "手绘与绘画"],
  ["East Asian Traditions", "东方传统"],
  ["Print & Printmaking", "印刷与版画"],
  ["Graphic & Type", "图形与排版"],
  ["Information & Keynote", "信息与发布"],
  ["Cartoon & Anime", "卡通与动画"],
  ["Games", "游戏"],
  ["Cinema & Eras", "电影与时代"],
  ["Materials & 3D", "材质与 3D"],
]

export const LemoOpuscar = async ({ $, client, directory }) => {
  await client.app
    .log({
      body: {
        service: "lemo-opuscar",
        level: "info",
        message: "plugin loaded",
        extra: { repo: REPO, directory },
      },
    })
    .catch(() => {})

  const run = async (cmd) => {
    try {
      return await $`${cmd}`.text()
    } catch (e) {
      return `ERROR: ${e?.message ?? e}`
    }
  }

  /**
   * Run setup.sh from whichever install location exists. A plain shell snippet
   * rather than a tagged template, because the path must be chosen at runtime
   * by testing which file exists. if/elif rather than `&& break`, because
   * `break` outside a loop is not portable across /bin/sh implementations.
   */
  const runSetup = async (args = "") => {
    const [standalone, projectLocal] = setupScript()
    const cmd =
      `if [ -f ${standalone} ]; then p=${standalone}; ` +
      `elif [ -f ${projectLocal} ]; then p=${projectLocal}; ` +
      `else p=; fi; ` +
      `if [ -n "$p" ]; then sh "$p" ${args}; ` +
      `else echo "ERROR: setup.sh not found. Install this plugin, or clone the library manually."; fi`
    return await run(cmd)
  }

  return {
    tool: {
      lemo_setup: tool({
        description:
          "Clone or update the Lemo-Opuscar style library and optionally install a " +
          "dependency tier. Tier 'core' is required before any render; 'voice' and " +
          "'music' are only needed when the film uses them. Use this once at the start.",
        args: {
          action: tool.schema
            .enum(["setup", "deps", "demo"])
            .describe("setup=clone/update, deps=install packages, demo=fetch one demo source"),
          tier: tool.schema
            .enum(["core", "voice", "music"])
            .optional()
            .describe("for action=deps: which tier to install (default core)"),
          slug: tool.schema
            .string()
            .optional()
            .describe("for action=demo: the style slug, e.g. watercolor"),
        },
        async execute(args) {
          if (args.action === "setup") {
            return await runSetup()
          }
          if (args.action === "deps") {
            const tier = args.tier ?? "core"
            return await runSetup(`deps ${tier}`)
          }
          if (args.action === "demo") {
            if (!args.slug) return "demo needs a slug. See styles/README.md for the list."
            return await runSetup(`demo ${args.slug}`)
          }
          return `unknown action ${args.action}`
        },
      }),

      lemo_styles: tool({
        description:
          "List the 43 Lemo-Opuscar film styles, optionally filtered by category " +
          "(e.g. 'Cinema & Eras', '东方传统'). Use when the user asks which styles " +
          "exist or has not chosen one.",
        args: {
          category: tool.schema
            .string()
            .optional()
            .describe("category name or index; omit for all"),
        },
        async execute(args) {
          const lib = resolveLib(process.env)
          const out = await run(`sed -n '/style-list:start/,/style-list:end/p' ${lib}/AGENTS.md`)
          if (!out || out.startsWith("ERROR") || !out.includes("style-list")) {
            return `Could not read the library at ${lib}. Run lemo_setup first.\n\nKnown categories: ${CATEGORIES.map((c, i) => `${i}: ${c[0]} (${c[1]})`).join(", ")}`
          }
          if (!args.category) return out

          const needle = args.category.trim().toLowerCase()
          const lines = out.split("\n")
          const start = lines.findIndex((l) => l.includes("(") && l.includes(":"))
          if (start === -1) return out
          const matches = lines
            .slice(start + 1, start + 10)
            .filter((l) => l.toLowerCase().includes(needle))
          return matches.length ? matches.join("\n") : `No category matched "${args.category}".`
        },
      }),

      lemo_status: tool({
        description:
          "Report where the Lemo-Opuscar library is, which dependency tiers are " +
          "installed, and which system tools are missing. Run this before a first " +
          "render to find out what to tell the user to install.",
        args: {},
        async execute() {
          const lib = resolveLib(process.env)
          const parts = []
          parts.push(await run(`echo "LIB=${lib}"; [ -f ${lib}/AGENTS.md ] && echo "library: present" || echo "library: MISSING (run lemo_setup)"`))
          parts.push(await run(`echo "styles: $(ls -1 ${lib}/styles 2>/dev/null | grep -vE '^(README.md|_template)$' | wc -l)"`))
          parts.push(await run(`for t in core voice music; do [ -f ${lib}/.venv/.lemo-$t ] && echo "tier $t: installed" || echo "tier $t: not installed"; done`))
          parts.push(await run(`for c in node ffmpeg uv python3; do command -v $c >/dev/null && echo "system $c: ok" || echo "system $c: MISSING"; done`))
          return parts.join("\n")
        },
      }),

      lemo_doctor: tool({
        description:
          "Diagnose a broken Lemo-Opuscar install: broken venv, missing Node " +
          "packages, missing browser, or a library clone that is not a library. " +
          "Reports the cause and the fix; changes nothing.",
        args: {},
        async execute() {
          const lib = resolveLib(process.env)
          const out = []
          out.push(await run(`[ -f ${lib}/AGENTS.md ] && echo "OK library" || echo "BAD library missing at ${lib}"`))
          out.push(await run(`[ -x ${lib}/.venv/bin/python ] && ${lib}/.venv/bin/python -V || echo "BAD venv missing or broken (delete ${lib}/.venv and re-run setup)"`))
          out.push(await run(`[ -f ${lib}/node_modules/.lemo-ok ] && echo "OK node packages" || echo "BAD node packages (run lemo_setup with action=deps)"`))
          out.push(
            await run(
              `[ -d ${lib}/node_modules/playwright-core ] && echo "OK playwright-core" || echo "BAD playwright-core missing"`
            )
          )
          const nodeMajor = await run(`node -p 'process.versions.node.split(".")[0]' 2>/dev/null || echo 0`)
          out.push(nodeMajor.trim() >= "20" ? "OK node 20+" : `BAD node version: ${nodeMajor.trim()} (need >= 20)`)
          return out.join("\n")
        },
      }),
    },
  }
}

export default LemoOpuscar