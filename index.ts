import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import { visibleWidth, sliceByColumn, stripTerminalSequences } from "@earendil-works/pi-tui";
import { ThinkingPreview } from "./src/preview.ts";

export default function (pi: ExtensionAPI): void {
  const preview = new ThinkingPreview({ width: visibleWidth,
    slice: (text, start, width) => sliceByColumn(text, start, width, true), clean: stripTerminalSequences });
  let context: ExtensionContext | undefined;
  let timer: ReturnType<typeof setInterval> | undefined;
  let last: string | undefined;

  const draw = () => {
    if (!context?.hasUI) return;
    const width = Math.max(1, process.stdout.columns || 80);
    const text = preview.render(width, Date.now());
    if (text !== last) { context.ui.setWorkingMessage(text); last = text; }
  };
  const reset = () => {
    if (timer) clearInterval(timer);
    timer = undefined;
    preview.stop();
    if (last !== undefined && context?.hasUI) context.ui.setWorkingMessage();
    last = undefined;
  };

  pi.on("message_update", (event, ctx) => {
    if (!ctx.hasUI) return;
    context = ctx;
    const update = event.assistantMessageEvent;
    if (update.type === "thinking_start" || update.type === "thinking_delta") {
      const now = Date.now();
      preview.start(update.contentIndex, now);
      const content = update.partial.content[update.contentIndex];
      if (content?.type === "thinking" && content.thinking) {
        preview.update(update.contentIndex, content.thinking, now);
      } else if (update.type === "thinking_delta") {
        preview.append(update.contentIndex, update.delta, now);
      }
      if (!timer) { timer = setInterval(draw, 100); timer.unref(); }
      draw();
    } else if (["thinking_end", "text_start", "text_delta", "toolcall_start", "toolcall_delta", "done", "error"].includes(update.type)) {
      reset();
    }
  });
  pi.on("message_start", (_event, ctx) => { reset(); context = ctx; });
  pi.on("message_end", reset);
  pi.on("agent_end", reset);
  pi.on("session_start", (_event, ctx) => { reset(); context = ctx; });
  pi.on("session_switch", reset);
  pi.on("session_shutdown", () => { reset(); context = undefined; });
}
