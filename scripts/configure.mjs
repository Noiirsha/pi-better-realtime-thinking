import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

if (!process.env.PI_NODE_MODULES) {
  throw new Error("Set PI_NODE_MODULES to the node_modules directory of your Pi installation.");
}
const { SettingsManager, getAgentDir } = await import(pathToFileURL(resolve(
  process.env.PI_NODE_MODULES, "@earendil-works/pi-coding-agent/dist/index.js",
)));
// Use Pi's setting writer/lock and merge behavior, preserving unrelated settings.
const settings = SettingsManager.create(process.cwd(), getAgentDir());
const errors = settings.drainErrors();
if (errors.length) throw new Error("Could not read Pi settings; no settings were changed.");
settings.setHideThinkingBlock(true);
await settings.flush();
if (settings.drainErrors().length) throw new Error("Could not persist hideThinkingBlock. Check Pi settings permissions.");
console.log('Set global hideThinkingBlock=true. Restart Pi or run /reload. A project override may take precedence.');
