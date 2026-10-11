/**
 * Test harness for the plugin's custom tools.
 *
 * OpenCode has no plugin test runner, so this drives the exported plugin with a
 * mock host: `$` is a tagged template that shells out, `client.app.log` is a
 * no-op. Run with `npm test`.
 *
 * These tests read the real filesystem (a cloned Lemo-Opuscar library if one
 * exists at $HOME/lemo-opuscar) and are written to pass either way: the tools
 * must report state correctly whether or not the library is present.
 */

import cp from "node:child_process"
import assert from "node:assert/strict"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"

const LIB = process.env.LEMO_OPUSCAR_HOME || path.join(os.homedir(), "lemo-opuscar")
const HAS_LIB = fs.existsSync(path.join(LIB, "AGENTS.md"))

const $ = (strings, ...vals) => {
  const cmd = strings.reduce((a, s, i) => a + s + (vals[i] ?? ""), "")
  return { text: async () => cp.execSync(cmd, { encoding: "utf8", shell: "/bin/sh" }) }
}

let passed = 0
let failed = 0

async function test(name, fn) {
  try {
    await fn()
    console.log(`  ok  ${name}`)
    passed++
  } catch (e) {
    console.log(`FAIL  ${name}\n      ${e.message}`)
    failed++
  }
}

const { LemoOpuscar, setupCandidates } = await import("../src/index.js")
const plugin = await LemoOpuscar({ $, client: { app: { log: async () => {} } }, directory: process.cwd() })
const t = plugin.tool

console.log(`\nlemo-opuscar plugin tests  (library: ${HAS_LIB ? LIB : "not cloned"})\n`)

await test("exposes exactly the four documented tools", () => {
  assert.deepEqual(Object.keys(t).sort(), ["lemo_doctor", "lemo_setup", "lemo_status", "lemo_styles"])
})

await test("lemo_status reports a library path", async () => {
  const out = await t.lemo_status.execute({})
  assert.match(out, /LIB=/)
  assert.match(out, /library: (present|MISSING)/)
})

await test("lemo_status reports system tools", async () => {
  const out = await t.lemo_status.execute({})
  assert.match(out, /system node: (ok|MISSING)/)
})

await test("lemo_doctor always reports library state", async () => {
  const out = await t.lemo_doctor.execute({})
  assert.match(out, /OK library|BAD library/)
})

await test("lemo_doctor checks the node major version", async () => {
  const out = await t.lemo_doctor.execute({})
  assert.match(out, /node 20\+|node version/)
})

await test("lemo_setup refuses a demo with no slug", async () => {
  const out = await t.lemo_setup.execute({ action: "demo" })
  assert.match(out, /needs a slug/)
})

await test("lemo_setup rejects an unknown action", async () => {
  const out = await t.lemo_setup.execute({ action: "nonsense" })
  assert.match(out, /unknown action/)
})

await test("lemo_styles returns the list or a helpful error", async () => {
  const out = await t.lemo_styles.execute({})
  if (HAS_LIB) {
    assert.match(out, /style-list:start/)
  } else {
    assert.match(out, /Run lemo_setup first/)
  }
})

await test("lemo_styles filters by category when a library exists", async () => {
  if (!HAS_LIB) return console.log("      (skipped: no library)")
  const out = await t.lemo_styles.execute({ category: "东方传统" })
  assert.match(out, /东方传统 East Asian Traditions/)
  assert.doesNotMatch(out, /Hand-drawn & Painting/)
})

await test("lemo_styles reports no match for a bogus category", async () => {
  if (!HAS_LIB) return console.log("      (skipped: no library)")
  const out = await t.lemo_styles.execute({ category: "Nonexistent Style" })
  assert.match(out, /No style matched/)
  assert.match(out, /Known categories/, "a bogus category should list the valid ones")
})

// --- setup.sh resolution -------------------------------------------------
// install.sh writes the skill to <config>/skills/lemo-opuscar/scripts/setup.sh
// (and ./.opencode/skills/... for a project install). If the plugin cannot find
// that file, lemo_setup silently degrades into an error string and no tool that
// depends on it can work. These tests run against the real filesystem.

/** Candidate roots, mirroring what install.sh actually writes. */
const CONFIG_HOME = process.env.XDG_CONFIG_HOME || path.join(os.homedir(), ".config")
const INSTALLED_SETUP_PATHS = [
  path.join(CONFIG_HOME, "opencode/skills/lemo-opuscar/scripts/setup.sh"),
  path.join(process.cwd(), ".opencode/skills/lemo-opuscar/scripts/setup.sh"),
  path.join(os.homedir(), "opencode-lemo-opuscar/skills/lemo-opuscar/scripts/setup.sh"),
]

await test("plugin's setup.sh candidates match where install.sh writes", () => {
  // A path the installer never creates must not be the only one we look for.
  const bogus = ["./.opencode/plugin/lemo-opuscar/skills/lemo-opuscar/scripts/setup.sh"]
  for (const b of bogus) {
    assert.ok(
      !setupCandidates().some((c) => c.includes(b)),
      `plugin still resolves setup.sh via a path install.sh never writes: ${b}`
    )
  }
})

await test("lemo_setup finds setup.sh on an installed system", async () => {
  if (!INSTALLED_SETUP_PATHS.some((p) => fs.existsSync(p)))
    return console.log("      (skipped: adapter not installed)")
  const out = await t.lemo_setup.execute({ action: "setup" })
  assert.doesNotMatch(
    String(out),
    /setup\.sh not found/,
    "lemo_setup could not find setup.sh despite the adapter being installed"
  )
})

// `setup.sh deps` takes only voice/music as arguments; the core tier is implicit.
// Passing "core" makes upstream print a usage error and install nothing.
//
// Assert on the generated command string, not on its output: a broken setup.sh
// path also produces output that merely lacks the usage message, so checking
// the output would pass for the wrong reason.
await test("lemo_setup deps core sends a bare 'deps', not 'deps core'", async () => {
  const seen = await captureSetupCommand({ action: "deps", tier: "core" })
  assert.match(seen, /sh "\$p" deps( |;|$)/)
  assert.doesNotMatch(seen, /deps core/, "upstream rejects 'core' as an argument")
})

await test("lemo_setup deps still forwards voice and music tiers", async () => {
  // Never actually pull the (large) voice models: inspect the command only.
  const seen = await captureSetupCommand({ action: "deps", tier: "voice" })
  assert.match(seen, /sh "\$p" deps voice/)
})

/**
 * Run a lemo_setup action against a stubbed shell and return the shell command
 * the plugin built, so tests can assert on the command without running it.
 */
async function captureSetupCommand(args) {
  let cmd = null
  const stub = (strings, ...vals) => {
    cmd = strings.reduce((a, s, i) => a + s + (vals[i] ?? ""), "")
    return { text: async () => "" }
  }
  const p = await LemoOpuscar({ $: stub, client: { app: { log: async () => {} } }, directory: process.cwd() })
  await p.tool.lemo_setup.execute(args)
  return cmd
}

console.log(`\n${passed} passed, ${failed} failed\n`)
process.exit(failed === 0 ? 0 : 1)