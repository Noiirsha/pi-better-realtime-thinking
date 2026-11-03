export interface Columns {
  width(text: string): number;
  slice(text: string, start: number, width: number): string;
  clean(text: string): string;
}

/** Only presentation state is retained; source messages are never changed. */
export class ThinkingPreview {
  started: number | undefined;
  text = "";
  scroll = 0;
  lastScroll = 0;
  private block: number | undefined;
  private raw = "";
  private readonly columns: Columns;

  constructor(columns: Columns) { this.columns = columns; }

  start(block: number, now: number) {
    if (this.started === undefined) {
      this.started = now;
      this.lastScroll = now;
    }
    if (block !== this.block) {
      this.block = block;
      this.raw = "";
      this.text = "";
      this.scroll = 0;
      this.lastScroll = now;
    }
  }

  update(block: number, content: string, now: number) {
    this.start(block, now);
    // Bounded tail: preview recent text without holding a second full transcript.
    this.raw = content.slice(-4096);
    const next = this.columns.clean(this.raw)
      .replace(/[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/g, " ")
      .replace(/\s+/g, " ").trim();
    if (next !== this.text) {
      // Keep the viewport steady while a phrase grows; reset for a new phrase.
      if (!this.text || !next.startsWith(this.text)) { this.scroll = 0; this.lastScroll = now; }
      this.text = next;
    }
  }

  append(block: number, delta: string, now: number) {
    this.start(block, now);
    this.update(block, this.raw + delta, now);
  }

  stop() {
    this.started = undefined;
    this.block = undefined;
    this.text = this.raw = "";
    this.scroll = 0;
  }

  render(terminalWidth: number, now: number): string | undefined {
    if (this.started === undefined) return undefined;
    // Reserve padding, native spinner, separator, and a spare column.
    const available = Math.max(0, terminalWidth - 5);
    const prefix = `Thinking (${Math.max(0, Math.floor((now - this.started) / 1000))}s)`;
    if (!this.text) return this.columns.slice(`${prefix}…`, 0, available);
    const label = `${prefix}: `;
    const room = available - this.columns.width(label);
    if (room <= 0) return this.columns.slice(prefix, 0, available);
    const width = this.columns.width(this.text);
    if (width <= room) return label + this.text;
    // Pause on the first frame, then marquee through the full recent-text tail.
    if (now - this.lastScroll >= (this.scroll === 0 ? 1000 : 200)) {
      this.scroll = (this.scroll + 1) % (width + 3);
      this.lastScroll = now;
    }
    const loop = this.text + "   " + this.text;
    return label + this.columns.slice(loop, this.scroll, room);
  }
}
