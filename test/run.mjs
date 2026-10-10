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

const { LemoOpuscar } = await import("../src/index.js")
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
  assert.match(out, /No category matched|style-list:start/)
})

console.log(`\n${passed} passed, ${failed} failed\n`)
process.exit(failed === 0 ? 0 : 1)