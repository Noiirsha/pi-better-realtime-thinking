export interface Columns {
  width(text: string): number;
  slice(text: string, start: number, width: number): string;
  clean(text: string): string;
}

/** Only presentation state is retained; source messages are never changed. */
export class ThinkingPreview {
  started: number | undefined;
  text = "";
  private block: number | undefined;
  private raw = "";
  private readonly columns: Columns;

  constructor(columns: Columns) { this.columns = columns; }

  start(block: number, now: number) {
    if (this.started === undefined) {
      this.started = now;
    }
    if (block !== this.block) {
      this.block = block;
      this.raw = "";
      this.text = "";
    }
  }

  update(block: number, content: string, now: number) {
    this.start(block, now);
    // Bounded tail: preview recent text without holding a second full transcript.
    this.raw = content.slice(-4096);
    const next = this.columns.clean(this.raw)
      .replace(/[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/g, " ")
      .replace(/\s+/g, " ").trim();
    this.text = next;
  }

  append(block: number, delta: string, now: number) {
    this.start(block, now);
    this.update(block, this.raw + delta, now);
  }

  stop() {
    this.started = undefined;
    this.block = undefined;
    this.text = this.raw = "";
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
    // Keep the newest tokens visible immediately; never wait for an animation.
    return label + this.columns.slice(this.text, width - room, room);
  }
}
