export const RUN_ONCE_COMMAND =
  "npx --yes github:mahidalhan/stackprint#v0.3.1 scan --json --output stackprint-profile.json";

export const INSTALL_CLI_COMMAND =
  "npm install --global github:mahidalhan/stackprint#v0.3.1";

export const INSTALL_SKILL_COMMAND =
  "npx skills add mahidalhan/stackprint --skill stackprint -a codex -g -y";

export const AGENT_PROMPT =
  "Use the installed Stackprint skill. Check the CLI, scan this computer, and create a reviewable JSON. Show me exactly what would be public and ask before publishing anything.";
