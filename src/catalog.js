export const TOOL_CATALOG = [
  tool("1Password CLI", "security", ["op"]),
  tool("ADB", "mobile", ["adb"]),
  tool("Aider", "ai-assistants", ["aider"]),
  tool("Ansible", "infrastructure", ["ansible"]),
  tool("AWS CLI", "cloud", ["aws"]),
  tool("Azure CLI", "cloud", ["az"]),
  tool("Bash", "shells", ["bash"]),
  tool("Bun", "language-runtimes", ["bun"]),
  tool("Cargo", "language-runtimes", ["cargo"]),
  tool("Chocolatey", "package-managers", ["choco"]),
  tool("Claude Code", "ai-assistants", ["claude"]),
  tool("Cloudflare Wrangler", "cloud", ["wrangler"]),
  tool("cloudflared", "networking", ["cloudflared"]),
  tool("Codex CLI", "ai-assistants", ["codex"]),
  tool("colcon", "robotics", ["colcon"]),
  tool("Cursor CLI", "editors", ["cursor"]),
  tool("Deno", "language-runtimes", ["deno"]),
  tool(".NET", "language-runtimes", ["dotnet"]),
  tool("Docker", "containers", ["docker"]),
  tool("DuckDB", "databases", ["duckdb"]),
  tool("EAS CLI", "mobile", ["eas"]),
  tool("Emacs", "editors", ["emacs"]),
  tool("Expo CLI", "mobile", ["expo"]),
  tool("fd", "terminal-tools", ["fd", "fdfind"]),
  tool("FFmpeg", "media", ["ffmpeg"]),
  tool("fish", "shells", ["fish"]),
  tool("Fly.io CLI", "cloud", ["flyctl"]),
  tool("fzf", "terminal-tools", ["fzf"]),
  tool("Gemini CLI", "ai-assistants", ["gemini"]),
  tool("Git", "source-control", ["git"]),
  tool("GitHub CLI", "source-control", ["gh"]),
  tool("GitLab CLI", "source-control", ["glab"]),
  tool("Go", "language-runtimes", ["go"]),
  tool("Google Cloud CLI", "cloud", ["gcloud"]),
  tool("Gradle", "mobile", ["gradle"]),
  tool("Helm", "infrastructure", ["helm"]),
  tool("Homebrew", "package-managers", ["brew"]),
  tool("ImageMagick", "media", ["magick"]),
  tool("Java", "language-runtimes", ["java"]),
  tool("Jujutsu", "source-control", ["jj"]),
  tool("jq", "terminal-tools", ["jq"]),
  tool("Kotlin", "language-runtimes", ["kotlin"]),
  tool("kubectl", "infrastructure", ["kubectl"]),
  tool("Lua", "language-runtimes", ["lua"]),
  tool("MongoDB Shell", "databases", ["mongosh"]),
  tool("MySQL", "databases", ["mysql"]),
  tool("Neovim", "editors", ["nvim"]),
  tool("ngrok", "networking", ["ngrok"]),
  tool("Node.js", "language-runtimes", ["node"]),
  tool("npm", "package-managers", ["npm"]),
  tool("Ollama", "ai-assistants", ["ollama"]),
  tool("PHP", "language-runtimes", ["php"]),
  tool("pipx", "package-managers", ["pipx"]),
  tool("pnpm", "package-managers", ["pnpm"]),
  tool("Podman", "containers", ["podman"]),
  tool("Poetry", "package-managers", ["poetry"]),
  tool("PostgreSQL CLI", "databases", ["psql"]),
  tool("Pulumi", "infrastructure", ["pulumi"]),
  tool("Python", "language-runtimes", ["python3", "python"]),
  tool("Railway CLI", "cloud", ["railway"]),
  tool("Redis CLI", "databases", ["redis-cli"]),
  tool("ripgrep", "terminal-tools", ["rg"]),
  tool("ROS 2", "robotics", ["ros2"]),
  tool("Ruby", "language-runtimes", ["ruby"]),
  tool("Rust", "language-runtimes", ["rustc"]),
  tool("SQLite", "databases", ["sqlite3"]),
  tool("Swift", "language-runtimes", ["swift"]),
  tool("Tailscale", "networking", ["tailscale"]),
  tool("Terraform", "infrastructure", ["terraform"]),
  tool("tmux", "terminal-tools", ["tmux"]),
  tool("uv", "package-managers", ["uv"]),
  tool("Vercel CLI", "cloud", ["vercel"]),
  tool("Vim", "editors", ["vim"]),
  tool("Visual Studio Code CLI", "editors", ["code"]),
  tool("Vite", "web-development", ["vite"]),
  tool("winget", "package-managers", ["winget"]),
  tool("Xcode", "mobile", ["xcodebuild"]),
  tool("yarn", "package-managers", ["yarn"]),
  tool("yq", "terminal-tools", ["yq"]),
  tool("Zed CLI", "editors", ["zed"]),
  tool("Zig", "language-runtimes", ["zig"]),
  tool("Zsh", "shells", ["zsh"])
];

const APP_RULES = [
  rule("ai-assistants", ["chatgpt", "claude", "cursor", "windsurf", "copilot", "ollama"]),
  rule("editors", ["visual studio code", "vscode", "zed", "sublime text", "textmate", "xcode", "android studio", "intellij", "pycharm", "webstorm", "rubymine"]),
  rule("terminals", ["terminal", "iterm", "warp", "ghostty", "alacritty", "kitty", "wezterm", "hyper"]),
  rule("design", ["figma", "sketch", "framer", "adobe xd", "photoshop", "illustrator", "blender", "rive"]),
  rule("collaboration", ["slack", "discord", "zoom", "linear", "notion", "microsoft teams", "whatsapp", "telegram", "superhuman"]),
  rule("browsers", ["safari", "chrome", "chromium", "firefox", "arc", "brave", "edge", "orion"]),
  rule("databases", ["tableplus", "datagrip", "dbeaver", "postico", "mongodb compass", "redis insight"]),
  rule("containers", ["docker", "podman", "orbstack"]),
  rule("source-control", ["github desktop", "sourcetree", "fork", "tower"]),
  rule("media", ["obs", "vlc", "final cut", "premiere", "screen studio", "loom"]),
  rule("productivity", ["raycast", "alfred", "1password", "granola", "cleanshot"])
];

export function classifyApp(name) {
  const normalized = name.toLowerCase();
  return APP_RULES.find(({ needles }) =>
    needles.some((needle) => normalized.includes(needle))
  )?.category ?? "other-apps";
}

export function normalizeToolName(name) {
  return name
    .replace(/\.app$/i, "")
    .replace(/\.desktop$/i, "")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tool(name, category, commands) {
  return { name, category, commands };
}

function rule(category, needles) {
  return { category, needles };
}
