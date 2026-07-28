export {
  currentSystemProfile,
  discoverCliTools,
  discoverInstalledApps,
  extractVersion
} from "./discovery.js";
export {
  buildProfile,
  deriveBuilderSignals,
  GENERATOR_VERSION,
  groupByCategory,
  SCHEMA_VERSION
} from "./profile.js";
export { renderJson, renderMarkdown, renderTerminal } from "./render.js";
