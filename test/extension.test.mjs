import { test } from "node:test";
import assert from "node:assert/strict";
import { resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { mkdtemp, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { execFileSync } from "node:child_process";
import { ThinkingPreview } from "../src/preview.ts";

const modules = process.env.PI_NODE_MODULES;
test("Pi loader: full thinking, title-only summaries, fallback, cleanup and non-UI mode", {skip: !modules}, async t => {
  const base = resolve(modules, "@earendil-works/pi-coding-agent/dist");
  const { loadExtensions } = await import(pathToFileURL(resolve(base, "core/extensions/loader.js")));
  const tui = await import(pathToFileURL(resolve(modules, "@earendil-works/pi-tui/dist/index.js")));
  const root = fileURLToPath(new URL("../", import.meta.url));
  const loaded = await loadExtensions([resolve(root, "index.ts")], root);
  assert.deepEqual(loaded.errors, []);
  const ext = loaded.extensions[0];
  const messages = [];
  const ctx = {hasUI: true, ui: {setWorkingMessage: text => messages.push(text)}};
  const emit = async (type, event = {}, context = ctx) => { for (const handler of ext.handlers.get(type) ?? []) await handler(event, context); };
  t.after(() => emit("session_shutdown"));
  t.mock.timers.enable({apis: ["Date", "setInterval"], now: 0});
  const update = async (type, text = "", contentIndex = 0) => {
    const partial = {role: "assistant", content: [{type: "thinking", thinking: text}]};
    await emit("message_update", {message: partial, assistantMessageEvent: {type, contentIndex, delta: text, partial}});
  };
  await emit("session_start");
  await update("thinking_start");
  assert.equal(messages.at(-1), "Thinking (0s)…");
  t.mock.timers.tick(10_000);
  assert.equal(messages.at(-1), "Thinking (10s)…");
  await update("thinking_delta", "**Checking implementation**\nMore detail");
  assert.match(messages.at(-1), /Checking implementation/);
  assert.ok(!messages.at(-1).includes("\n"));
  await update("text_start"); assert.equal(messages.at(-1), undefined);
  await update("thinking_start");
  await update("thinking_delta", "Reviewing files");
  assert.equal(messages.at(-1), "Thinking (0s): Reviewing files");
  for (const event of ["message_end", "agent_end", "session_switch", "session_shutdown"]) {
    await update("thinking_start");
    await emit(event);
    assert.equal(messages.at(-1), undefined);
    const count = messages.length;
    t.mock.timers.tick(1000);
    assert.equal(messages.length, count);
  }
  const count = messages.length;
  await emit("message_update", {assistantMessageEvent: {type: "thinking_start", contentIndex: 0}}, {hasUI: false});
  assert.equal(messages.length, count);

  const preview = new ThinkingPreview({width: tui.visibleWidth,
    slice: (text, start, width) => tui.sliceByColumn(text, start, width, true), clean: tui.stripTerminalSequences});
  preview.update(0, "\x1b[31m检查中文内容 🧠 👨‍👩‍👧‍👦 é and more text\x1b[0m", 0);
  assert.ok(!preview.text.includes("\x1b"));
  for (const width of [1, 8, 20, 35, 80]) {
    for (let now = 0; now < 5000; now += 200) {
      const text = preview.render(width, now);
      assert.ok(tui.visibleWidth(text) <= Math.max(0, width - 5));
      // The native loader adds one spinner column, a space and horizontal padding.
      if (width >= 8) assert.equal(new tui.Text(`⠹ ${text}`, 1, 0).render(width).length, 1);
    }
  }
});

test("one-time configuration preserves unrelated settings using an isolated Pi directory", {skip: !modules}, async () => {
  const dir = await mkdtemp(resolve(tmpdir(), "pi-thinking-settings-"));
  try {
    await writeFile(resolve(dir, "settings.json"), JSON.stringify({hideThinkingBlock: false, theme: "light", packages: ["example"]}));
    const script = fileURLToPath(new URL("../scripts/configure.mjs", import.meta.url));
    execFileSync(process.execPath, [script], {cwd: dir, env: {...process.env, PI_CODING_AGENT_DIR: dir}});
    const result = JSON.parse(await readFile(resolve(dir, "settings.json"), "utf8"));
    assert.deepEqual(result, {hideThinkingBlock: true, theme: "light", packages: ["example"]});
  } finally { await rm(dir, {recursive: true, force: true}); }
});
