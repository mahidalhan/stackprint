const tool = (name, kind = "app", source = "detected") => ({
  name,
  kind,
  source,
});

const publicTool = (name, kind, label, url, date, note) => ({
  name,
  kind,
  source: "public",
  evidence: {
    label,
    url,
    date,
    note,
  },
});

export const MAHID_TOOL_GROUPS = [
  {
    name: "AI & agents",
    tools: [
      tool("Codex", "cli"),
      tool("Claude"),
      tool("Cursor"),
      tool("ChatGPT"),
      tool("Ollama", "cli"),
    ],
  },
  {
    name: "Build",
    tools: [
      tool("Zed"),
      tool("GitHub", "cli"),
      tool("Warp"),
      tool("Homebrew", "cli"),
      tool("Xcode"),
    ],
  },
  {
    name: "Design",
    tools: [
      tool("Figma"),
      tool("Blender"),
      tool("Fusion"),
      tool("Screen Studio"),
    ],
  },
  {
    name: "Operate",
    tools: [
      tool("Linear"),
      tool("Notion"),
      tool("Slack"),
      tool("Superhuman"),
      tool("WhatsApp"),
      tool("X", "app", "manual"),
    ],
  },
  {
    name: "Data & cloud",
    tools: [
      tool("Python", "cli"),
      tool("Node.js", "cli"),
      tool("BigQuery", "cli"),
      tool("Cloudflare", "cli"),
      tool("Docker", "cli"),
    ],
  },
];

export const BUILDERS = [
  {
    slug: "mahidalhan",
    name: "Mahid",
    handle: "@mahidalhan",
    xHandle: "@mahidalhan",
    xUrl: "https://x.com/mahidalhan",
    role: "Physical AI builder",
    count: 135,
    detectedCount: 134,
    manualCount: 1,
    categories: 20,
    tags: ["AI", "Hardware", "Developer tools", "Design", "Data"],
    monogram: "M",
    motif: "m",
    demo: false,
    tools: MAHID_TOOL_GROUPS,
    signals: [
      "AI-assisted builder",
      "Polyglot builder",
      "Cloud & infrastructure",
      "Hardware builder",
    ],
  },
  {
    slug: "gokul-rajaram",
    name: "Gokul Rajaram",
    handle: "@gokulr",
    xHandle: "@gokulr",
    xUrl: "https://x.com/gokulr",
    role: "Product and company builder",
    count: 3,
    categories: 2,
    evidenceCount: 3,
    evidenceUpdatedAt: "2026-07-27",
    tags: ["AI", "Developer tools"],
    monogram: "GR",
    motif: "split",
    curated: true,
    tools: [
      {
        name: "Research",
        tools: [
          publicTool(
            "UseTranscribe",
            "app",
            "SELF-REPORTED USE",
            "https://x.com/gokulr/status/2058684479368241267",
            "2026-05-24",
            "Gokul wrote that he used its “Ask this Transcript” feature.",
          ),
        ],
      },
      {
        name: "AI & product",
        tools: [
          publicTool(
            "ProductSpec",
            "cli",
            "PUBLIC PROJECT",
            "https://x.com/gokulr/status/2078675100367520215",
            "2026-07-19",
            "Gokul described maintaining the open-source ProductSpec repository.",
          ),
          publicTool(
            "Codex",
            "cli",
            "PUBLIC DISCUSSION",
            "https://x.com/gokulr/status/2081782731848224997",
            "2026-07-27",
            "Gokul publicly discussed the people and work behind Codex.",
          ),
        ],
      },
    ],
    signals: [
      "One self-reported use",
      "Three claim-level X sources",
    ],
  },
  {
    slug: "sam-altman",
    name: "Sam Altman",
    handle: "@sama",
    xHandle: "@sama",
    xUrl: "https://x.com/sama",
    role: "AI company builder",
    count: 3,
    categories: 1,
    evidenceCount: 2,
    evidenceUpdatedAt: "2026-07-27",
    tags: ["AI", "Developer tools"],
    monogram: "SA",
    motif: "circle",
    curated: true,
    tools: [
      {
        name: "AI & agents",
        tools: [
          publicTool(
            "ChatGPT",
            "app",
            "PUBLIC DISCUSSION",
            "https://x.com/sama/status/1631394688384270336",
            "2023-03-02",
            "Sam discussed a ChatGPT-assisted email workflow.",
          ),
          publicTool(
            "Codex",
            "cli",
            "PUBLIC RECOMMENDATION",
            "https://x.com/sama/status/2050274547061129577",
            "2026-05-01",
            "Sam recommended choosing Codex or Claude Code based on fit.",
          ),
          publicTool(
            "Claude Code",
            "cli",
            "PUBLIC RECOMMENDATION",
            "https://x.com/sama/status/2050274547061129577",
            "2026-05-01",
            "Sam recommended choosing Codex or Claude Code based on fit.",
          ),
        ],
      },
    ],
    signals: [
      "Public discussion, not a device scan",
      "Two claim-level X sources",
    ],
  },
  {
    slug: "farza",
    name: "Farza",
    handle: "@FarzaTV",
    xHandle: "@FarzaTV",
    xUrl: "https://x.com/FarzaTV",
    role: "Product builder",
    count: 6,
    categories: 4,
    evidenceCount: 3,
    evidenceUpdatedAt: "2026-07-27",
    tags: ["AI", "Design", "Developer tools"],
    monogram: "F",
    motif: "diamond",
    curated: true,
    tools: [
      {
        name: "Build",
        tools: [
          publicTool(
            "Replit",
            "app",
            "PUBLIC RECOMMENDATION",
            "https://x.com/FarzaTV/status/2021911029157179840",
            "2026-02-12",
            "Farza said he would use Replit or Codex for the task discussed.",
          ),
          publicTool(
            "Codex",
            "cli",
            "PUBLIC RECOMMENDATION",
            "https://x.com/FarzaTV/status/2021911029157179840",
            "2026-02-12",
            "Farza said he would use Replit or Codex for the task discussed.",
          ),
          publicTool(
            "Claude Code",
            "cli",
            "PRODUCT INTEGRATION",
            "https://x.com/FarzaTV/status/2077130366230639022",
            "2026-07-14",
            "Farza demonstrated his product writing prompts inside Claude Code.",
          ),
        ],
      },
      {
        name: "AI",
        tools: [
          publicTool(
            "Claude Opus",
            "app",
            "BUILT WITH",
            "https://x.com/FarzaTV/status/2066983088035656086",
            "2026-06-16",
            "Farza said his screen tutor was built using Claude Opus.",
          ),
        ],
      },
      {
        name: "Communication",
        tools: [
          publicTool(
            "Gmail",
            "app",
            "PRODUCT INTEGRATION",
            "https://x.com/FarzaTV/status/2077130366230639022",
            "2026-07-14",
            "Farza demonstrated his product replying inside Gmail.",
          ),
        ],
      },
      {
        name: "Creative",
        tools: [
          publicTool(
            "FL Studio",
            "app",
            "DEMO USE",
            "https://x.com/FarzaTV/status/2066983088035656086",
            "2026-06-16",
            "Farza showed himself learning FL Studio with the screen tutor.",
          ),
        ],
      },
    ],
    signals: [
      "Two public build-with claims",
      "Three claim-level X sources",
    ],
  },
];

export const FILTERS = [
  "All",
  "AI",
  "Design",
  "Hardware",
  "Data",
  "Developer tools",
  "Investing",
];

export const HERO_LAYERS = [
  "CODEX",
  "CURSOR",
  "FIGMA",
  "LINEAR",
  "NOTION",
  "GITHUB",
  "SLACK",
  "X · MANUAL",
];
