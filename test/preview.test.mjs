import { test } from "node:test";
import assert from "node:assert/strict";
import { ThinkingPreview } from "../src/preview.ts";

const columns = {width: text => text.length, slice: (text, start, width) => text.slice(start, start + width), clean: text => text};

test("empty thinking, elapsed time, immediate tail, new titles and stop", () => {
  const preview = new ThinkingPreview(columns);
  assert.equal(preview.render(80, 0), undefined);
  preview.start(0, 0);
  assert.equal(preview.render(80, 10_000), "Thinking (10s)…");
  preview.update(0, "Checking the current implementation carefully", 10_000);
  const first = preview.render(35, 10_000);
  assert.equal(first, "Thinking (10s): tion carefully");
  assert.equal(preview.render(35, 10_100), first);
  assert.equal(preview.render(35, 11_100), first.replace("10s", "11s"));
  preview.append(0, " NEW TOKENS", 11_100);
  assert.ok(preview.render(35, 11_100).endsWith(" NEW TOKENS"));
  preview.update(1, "New title", 12_000);
  assert.equal(preview.render(80, 12_000), "Thinking (12s): New title");
  preview.stop();
  assert.equal(preview.render(80, 13_000), undefined);
});

test("bounded text tail and removal of multiline/control characters", () => {
  const preview = new ThinkingPreview(columns);
  preview.update(0, "x".repeat(9000) + "\nhello\tworld\u0007\u202e", 0);
  assert.ok(preview.text.length <= 4096);
  assert.ok(!/[\n\t\u0007\u202e]/.test(preview.text));
  preview.append(0, " more", 10);
  assert.ok(preview.text.endsWith("more"));
  for (const width of [1, 5, 10, 20, 40, 80]) assert.ok(preview.render(width, 100).length <= Math.max(0, width - 5));
});
