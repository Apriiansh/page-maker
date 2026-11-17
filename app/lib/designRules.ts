// app/lib/designRules.ts
//
// Sumber tunggal (single source of truth) untuk aturan desain + teknis.
// - app/api/generate/route.ts  : memakai buildSystemPrompt / buildUserPrompt / pickStyle
// - app/lib/codeTester.ts      : memakai checkDesignRules / formatViolationsForRetry
// Ubah aturan di sini, generator dan tester ikut berubah.

export type Blueprint = {
  title?: string;
  tagline?: string;
  websiteType?: string;
  visualTheme?: string;
  targetAudience?: string;
  sections?: { name: string; description: string }[];
  keyFeatures?: string[];
};

export type StyleDirection = {
  id: string;
  name: string;
  /** Dicocokkan dengan visualTheme + websiteType (huruf kecil). */
  match: RegExp;
  fontsHref: string;
  fonts: { heading: string; body: string; mono?: string };
  typography: string;
  /** Hex lengkap dengan "#". Dipakai untuk prompt DAN untuk cek palet. */
  palette: {
    background: string;
    text: string;
    muted: string;
    accent: string;
    border: string;
    surface?: string;
  };
  accentUse: string;
  shape: string;
  layout: string;
  /** Kelas rounded-* yang boleh dipakai. Kosong = hanya rounded-none. */
  allowedRounded: string[];
};

export type Severity = "error" | "warn";

export type Violation = {
  ruleId: string;
  severity: Severity;
  message: string;
};

export type Rule = {
  id: string;
  severity: Severity;
  /** Teks untuk prompt. Boleh fungsi kalau bergantung pada gaya terpilih. */
  prompt: string | ((style: StyleDirection) => string);
  /** Pengecek otomatis (opsional). Kembalikan pesan kalau dilanggar, null kalau aman. */
  check?: (code: string, style: StyleDirection) => string | null;
};

// ---------------------------------------------------------------------------
// Arah gaya
// ---------------------------------------------------------------------------
export const STYLE_DIRECTIONS: StyleDirection[] = [
  {
    id: "editorial",
    name: "Editorial",
    match: /editorial|magazine|journal|blog|elegan|elegant|classic|klasik|portfolio/,
    fontsHref:
      "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600&family=Instrument+Sans:wght@400;500;600&display=swap",
    fonts: { heading: "Fraunces", body: "Instrument Sans" },
    typography: "Headings are serif, weight 400-600, large, tight leading.",
    palette: {
      background: "#f6f1e9",
      text: "#1c1a17",
      muted: "#6b645a",
      accent: "#b4411f",
      border: "#d9d2c5",
    },
    accentUse: "use sparingly: links, one button, small marks",
    shape:
      "radius 0 everywhere. No shadows. Separate sections with 1px rules, not colored bands.",
    layout:
      "Text-led and asymmetric. Big left-aligned headings (text-5xl to text-7xl on desktop), narrow reading column, lots of whitespace. Prefer lists, numbered rows and two-column splits over cards.",
    allowedRounded: [],
  },
  {
    id: "technical-dark",
    name: "Technical dark",
    match: /dark|gelap|tech|developer|dev\b|cyber|terminal|code|coding|hacker/,
    fontsHref:
      "https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap",
    fonts: { heading: "IBM Plex Sans", body: "IBM Plex Sans", mono: "IBM Plex Mono" },
    typography: "Use the mono font for labels, numbers, code and metadata.",
    palette: {
      background: "#0c0d0e",
      surface: "#131517",
      text: "#e8e6e1",
      muted: "#8b8f94",
      accent: "#c6f432",
      border: "#26282b",
    },
    accentUse: "one accent only, for the primary button and key numbers",
    shape: "radius 2px everywhere (rounded-[2px]). 1px borders, no shadows, no glow.",
    layout:
      "Dense and precise. Left-aligned, hairline-divided rows and tables instead of cards, monospace for data. Compact vertical rhythm, but never cramped text.",
    allowedRounded: ["rounded-[2px]", "rounded-sm"],
  },
  {
    id: "brutalist",
    name: "Brutalist",
    match: /brutal|bold|raw|punk|loud|berani|neo/,
    fontsHref:
      "https://fonts.googleapis.com/css2?family=Archivo:wght@400;600;800&family=Space+Mono:wght@400;700&display=swap",
    fonts: { heading: "Archivo", body: "Archivo", mono: "Space Mono" },
    typography:
      "Headings weight 800, tight tracking, very large; body weight 400; small details in the mono font.",
    palette: {
      background: "#f2f0ea",
      text: "#000000",
      muted: "#4a4a46",
      accent: "#ff4d00",
      border: "#000000",
    },
    accentUse: "one accent, for the primary button and one highlight per section",
    shape:
      "radius 0. 2px solid black borders. At most one hard offset shadow style (4px 4px 0 #000) and only on the primary button.",
    layout:
      "Oversized type, visible grid structure, strong left alignment, big contrast between huge headings and small body text. No soft effects.",
    allowedRounded: [],
  },
  {
    id: "warm-organic",
    name: "Warm organic",
    match:
      /warm|hangat|food|kuliner|cafe|coffee|restaurant|restoran|warung|organic|natural|umkm|toko/,
    fontsHref:
      "https://fonts.googleapis.com/css2?family=Young+Serif&family=Figtree:wght@400;500;600&display=swap",
    fonts: { heading: "Young Serif", body: "Figtree" },
    typography: "Large readable type.",
    palette: {
      background: "#fff8ec",
      surface: "#f6ead3",
      text: "#2b1d14",
      muted: "#7a6552",
      accent: "#c2410c",
      border: "#e6d6b8",
    },
    accentUse: "primary button, prices, key links",
    shape:
      "one radius value only: 10px (rounded-[10px]). No shadows; use borders and surface color to separate things.",
    layout:
      "Friendly but not childish. Generous padding, real content first (menu, prices, hours, location) instead of decoration. Mix full-width text sections with simple two-column splits.",
    allowedRounded: ["rounded-[10px]"],
  },
  {
    id: "soft-neutral",
    name: "Soft neutral",
    match: /soft|neutral|calm|lembut|corporate|saas|startup|agency|agensi/,
    fontsHref:
      "https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,700&family=Hanken+Grotesk:wght@400;500;600&display=swap",
    fonts: { heading: "Bricolage Grotesque", body: "Hanken Grotesk" },
    typography: "Headings weight 700, tight tracking.",
    palette: {
      background: "#fbfaf8",
      text: "#16181d",
      muted: "#636771",
      accent: "#0f766e",
      border: "#e7e3dc",
    },
    accentUse: "primary button and links only",
    shape: "one radius value only: 14px (rounded-[14px]). 1px borders, no shadows.",
    layout:
      "Calm and spacious. Large type, one idea per section, alternate between full-width statements and split layouts. No dense card grids.",
    allowedRounded: ["rounded-[14px]"],
  },
];

export function getStyleById(id: string | null | undefined): StyleDirection | undefined {
  return STYLE_DIRECTIONS.find((s) => s.id === id);
}

export function pickStyle(blueprint: Blueprint): StyleDirection {
  const theme = `${blueprint.visualTheme ?? ""} ${blueprint.websiteType ?? ""}`.toLowerCase();
  const byKeyword = STYLE_DIRECTIONS.find((s) => s.match.test(theme));
  if (byKeyword) return byKeyword;

  let seed = 7;
  const title = blueprint.title ?? "site";
  for (let i = 0; i < title.length; i++) {
    seed = (seed * 31 + title.charCodeAt(i)) >>> 0;
  }
  return STYLE_DIRECTIONS[seed % STYLE_DIRECTIONS.length];
}

function renderBrief(style: StyleDirection): string {
  const { fonts, palette } = style;
  const colorList = Object.entries(palette)
    .map(([k, v]) => `${k} ${v}`)
    .join(", ");
  return [
    `Name: ${style.name}`,
    `Fonts: headings "${fonts.heading}"; body and UI "${fonts.body}"${
      fonts.mono ? `; labels, numbers and code "${fonts.mono}"` : ""
    }. ${style.typography}`,
    `Palette: ${colorList}. Accent usage: ${style.accentUse}. Use only these colors (plus white or black if needed), written as Tailwind arbitrary values like bg-[#f6f1e9].`,
    `Shape: ${style.shape}`,
    `Layout: ${style.layout}`,
  ].join("\n");
}

// ---------------------------------------------------------------------------
// Helper untuk checker
// ---------------------------------------------------------------------------
function classNameStrings(code: string): string[] {
  const out: string[] = [];
  const re = /class(?:Name)?=(?:"([^"]*)"|'([^']*)'|\{`([^`]*)`\})/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(code)) !== null) {
    out.push(m[1] ?? m[2] ?? m[3] ?? "");
  }
  return out;
}

function firstMatch(code: string, re: RegExp): string | null {
  const m = re.exec(code);
  return m ? m[0].slice(0, 60).replace(/\s+/g, " ") : null;
}

const GENERIC_FONT_FAMILIES = [
  "serif",
  "sans-serif",
  "monospace",
  "system-ui",
  "ui-sans-serif",
  "ui-serif",
  "ui-monospace",
  "inherit",
];

// ---------------------------------------------------------------------------
// Aturan teknis
// ---------------------------------------------------------------------------
export const TECHNICAL_RULES: Rule[] = [
  {
    id: "react-global",
    severity: "error",
    prompt:
      "React 18 is a global (loaded via CDN). Begin with: const { useState, useEffect, useMemo, useRef } = React;",
  },
  {
    id: "no-import-export",
    severity: "error",
    prompt: "Do NOT write import or export statements.",
    check: (code) => {
      const hit = firstMatch(code, /^\s*(import|export)\s/m);
      return hit ? `Found an import/export statement: "${hit}"` : null;
    },
  },
  {
    id: "no-self-mount",
    severity: "error",
    prompt: "Do NOT call ReactDOM.render or createRoot; the host mounts App.",
    check: (code) =>
      /ReactDOM\s*\.\s*(render|createRoot)|\bcreateRoot\s*\(/.test(code)
        ? "The component mounts itself (ReactDOM.render/createRoot). The host does that."
        : null,
  },
  {
    id: "plain-js",
    severity: "error",
    prompt:
      'Plain JavaScript + JSX only. No TypeScript syntax at all (no type annotations, interfaces, generics, "as" casts, non-null "!").',
    check: (code) => {
      const hit = firstMatch(
        code,
        /^\s*(interface\s+\w+|type\s+\w+\s*=)|\buse(State|Ref|Memo)\s*<|\)\s*:\s*(string|number|boolean|void|JSX\.Element)\s*(=>|\{)|\bas\s+(const|string|number|any)\b/m
      );
      return hit ? `TypeScript syntax found: "${hit}"` : null;
    },
  },
  {
    id: "tailwind-only",
    severity: "error",
    prompt:
      "Style ONLY with Tailwind utility classes (CDN build). Use arbitrary values for exact colors, for example bg-[#f6f1e9] or text-[#1c1a17]. No <style jsx>, no CSS imports. Inline style is allowed only for fontFamily.",
    check: (code) => {
      if (/<style\s+jsx/.test(code)) return "<style jsx> is not allowed.";
      if (/style=\{\{(?![^}]*fontFamily)/.test(code)) {
        return "Inline style other than fontFamily found; use Tailwind classes.";
      }
      return null;
    },
  },
  {
    id: "inline-svg-icons",
    severity: "error",
    prompt:
      "Icons: inline SVG only, as small helper components you define in the file. Never import lucide-react or any package.",
    check: (code) =>
      /lucide-react|react-icons|@heroicons/.test(code)
        ? "References an icon package. Use inline SVG components."
        : null,
  },
  {
    id: "defensive",
    severity: "error",
    prompt:
      "Be defensive so it renders without errors: every list is a constant array defined in the file, every .map has a stable key, no access on possibly undefined values, no window/document access during render (only inside useEffect or event handlers), no localStorage.",
    check: (code) =>
      /localStorage|sessionStorage/.test(code)
        ? "Uses localStorage/sessionStorage."
        : null,
  },
  {
    id: "responsive",
    severity: "warn",
    prompt:
      "Responsive, mobile first, with md and lg breakpoints. The mobile menu must work (useState toggle).",
    check: (code) =>
      /\b(md|lg):/.test(code) ? null : "No md:/lg: breakpoints found; layout may not be responsive.",
  },
  {
    id: "load-fonts",
    severity: "warn",
    prompt: (style) =>
      `Load the fonts at runtime: inside App, a useEffect appends <link rel="stylesheet" href="${style.fontsHref}"> to document.head if it is not already there. Apply fonts with style={{ fontFamily: "'Font Name', serif" }} on the root element and on headings.`,
    check: (code, style) => {
      if (!code.includes(style.fontsHref)) {
        return `The Google Fonts link for "${style.name}" is missing.`;
      }
      const allowed = Object.values(style.fonts)
        .filter((f): f is string => Boolean(f))
        .map((f) => f.toLowerCase());
      const re = /fontFamily\s*:\s*(["'`])((?:(?!\1)[\s\S])*)\1/g;
      let m: RegExpExecArray | null;
      while ((m = re.exec(code)) !== null) {
        const families = m[2]
          .split(",")
          .map((f) => f.trim().replace(/^['"]|['"]$/g, "").toLowerCase())
          .filter(Boolean);
        const bad = families.find(
          (f) => !allowed.includes(f) && !GENERIC_FONT_FAMILIES.includes(f)
        );
        if (bad) return `Font "${bad}" is not part of the "${style.name}" design system.`;
      }
      return null;
    },
  },
];

// ---------------------------------------------------------------------------
// Larangan desain
// ---------------------------------------------------------------------------
export const DESIGN_BANS: Rule[] = [
  {
    id: "no-gradient",
    severity: "error",
    prompt: "No gradients anywhere (backgrounds, text, borders).",
    check: (code) => {
      const hit = firstMatch(code, /(linear|radial|conic)-gradient|\bbg-gradient-|\bfrom-\[|\bvia-\[|\bto-\[#/);
      return hit ? `Gradient found: "${hit}"` : null;
    },
  },
  {
    id: "no-glass-glow-blobs",
    severity: "error",
    prompt: "No glassmorphism, backdrop blur, glow, or decorative blobs.",
    check: (code) => {
      const hit = firstMatch(code, /backdrop-blur|\bblur-(?:\d|\[)|\bblur\b(?=[^\n]*className)|drop-shadow|shadow-\[0_0/);
      return hit ? `Blur/glow effect found: "${hit}"` : null;
    },
  },
  {
    id: "no-eyebrow",
    severity: "warn",
    prompt: 'No small uppercase "eyebrow" labels and no pill badges above headings.',
    check: (code) => {
      for (const cls of classNameStrings(code)) {
        const tokens = cls.split(/\s+/);
        const upper = tokens.includes("uppercase");
        const tracked = tokens.some((t) => /^tracking-(wide|wider|widest|\[)/.test(t));
        const small = tokens.some((t) => /^text-(xs|sm|\[1[0-3]px\])$/.test(t));
        if (upper && tracked && small) {
          return `Looks like an eyebrow label: className="${cls.slice(0, 70)}"`;
        }
      }
      return null;
    },
  },
  {
    id: "no-emoji",
    severity: "error",
    prompt: "No emoji, also not as icons.",
    check: (code) => {
      const hit = firstMatch(code, /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u);
      return hit ? `Emoji or pictograph found: "${hit}"` : null;
    },
  },
  {
    id: "no-generic-headings",
    severity: "warn",
    prompt:
      'No generic headings such as "Our Features", "Why Choose Us", "Get Started Today". Every heading must say something specific to this blueprint.',
    check: (code) => {
      const hit = firstMatch(
        code,
        /Our Features|Why Choose Us|Get Started Today|Our Services|Welcome to/i
      );
      return hit ? `Generic heading found: "${hit}"` : null;
    },
  },
  {
    id: "varied-layout",
    severity: "warn",
    prompt:
      "No grid of three identical icon cards as the default layout. Vary the layout between sections (rows, split columns, tables, big type).",
  },
  {
    id: "no-fake-proof",
    severity: "warn",
    prompt:
      'No invented testimonials with fake names or companies, no invented statistics (such as "10k+ users"), no fake logo strips, unless the blueprint provides them.',
    check: (code) => {
      const hit = firstMatch(
        code,
        /testimonial|testimoni|\b\d+(?:[.,]\d+)?\s?[kKmM]\+|\b\d{1,3}(?:[.,]\d{3})+\+?\s*(users|customers|clients|pengguna|pelanggan)/
      );
      return hit ? `Possible fake social proof or stats: "${hit}"` : null;
    },
  },
  {
    id: "one-decoration",
    severity: "warn",
    prompt:
      "At most one decorative element per section. If an element carries no information and triggers no action, remove it.",
  },
  {
    id: "minimal-footer",
    severity: "warn",
    prompt: "Footer stays minimal: no columns of dummy links.",
  },
];

// ---------------------------------------------------------------------------
// Aturan output
// ---------------------------------------------------------------------------
export const OUTPUT_RULES: Rule[] = [
  {
    id: "code-only",
    severity: "error",
    prompt:
      "Output ONLY the code, starting with the first line of code. No markdown code fences, no greeting, no explanation before or after.",
    check: (code) =>
      code.includes("```") ? "Markdown code fence found in the output." : null,
  },
  {
    id: "component-name",
    severity: "error",
    prompt: "The component must be declared as: function App() { ... }",
    check: (code) =>
      /function\s+App\s*\(/.test(code) ? null : "No function App() declaration found.",
  },
];

export const CONTENT_RULES: string[] = [
  "Write specific, polished, and authentic English copy across all sections and labels (using industry-standard tech terminology such as 'Tech Stack', 'Digitalization', 'Overview', etc.). Short sentences, no marketing fluff, no Lorem ipsum.",
  "Use realistic sample data that fits the blueprint's topic (items, prices, schedules, projects, roles).",
  "Build every blueprint section exactly once, in the given order, each with a clear purpose. One primary call to action, repeated at most twice.",
];

// ---------------------------------------------------------------------------
// Pemeriksaan kesesuaian dengan gaya terpilih (turunan dari data gaya)
// ---------------------------------------------------------------------------
const ALWAYS_OK_HEX = ["fff", "ffffff", "000", "000000"];

function checkStyleConformance(code: string, style: StyleDirection): Violation[] {
  const out: Violation[] = [];

  // Palet
  const allowedHex = Object.values(style.palette)
    .filter((v): v is string => Boolean(v))
    .map((v) => v.replace("#", "").toLowerCase())
    .concat(ALWAYS_OK_HEX);
  const offPalette = new Set<string>();
  const hexRe = /\[#([0-9a-fA-F]{3,8})\]/g;
  let m: RegExpExecArray | null;
  while ((m = hexRe.exec(code)) !== null) {
    if (!allowedHex.includes(m[1].toLowerCase())) offPalette.add("#" + m[1].toLowerCase());
  }
  if (offPalette.size > 0) {
    out.push({
      ruleId: "style-palette",
      severity: "warn",
      message: `Colors outside the "${style.name}" palette: ${Array.from(offPalette)
        .slice(0, 6)
        .join(", ")}`,
    });
  }

  // Radius
  const badRounded = new Set<string>();
  for (const cls of classNameStrings(code)) {
    for (const token of cls.split(/\s+/)) {
      const base = token.split(":").pop() ?? "";
      if (base.startsWith("rounded") && base !== "rounded-none") {
        if (!style.allowedRounded.includes(base)) badRounded.add(base);
      }
    }
  }
  if (badRounded.size > 0) {
    const allowed = style.allowedRounded.length ? style.allowedRounded.join(", ") : "rounded-none only";
    out.push({
      ruleId: "style-radius",
      severity: "warn",
      message: `Radius not allowed in "${style.name}": ${Array.from(badRounded)
        .slice(0, 6)
        .join(", ")} (allowed: ${allowed})`,
    });
  }

  return out;
}

// ---------------------------------------------------------------------------
// Builder prompt (dipakai route.ts)
// ---------------------------------------------------------------------------
function promptOf(rule: Rule, style: StyleDirection): string {
  return typeof rule.prompt === "function" ? rule.prompt(style) : rule.prompt;
}

export function buildSystemPrompt(style: StyleDirection): string {
  const technical = TECHNICAL_RULES.map((r, i) => `${i + 1}. ${promptOf(r, style)}`).join("\n");
  const bans = DESIGN_BANS.map((r) => `- ${promptOf(r, style)}`).join("\n");
  const content = CONTENT_RULES.map((r) => `- ${r}`).join("\n");
  const output = OUTPUT_RULES.map((r) => `- ${promptOf(r, style)}`).join("\n");

  return `You are a senior frontend engineer with a strong design eye. Generate ONE self-contained React component named App from the user's blueprint.

TECHNICAL RULES
${technical}

DESIGN SYSTEM (follow exactly, this is the look of this site)
${renderBrief(style)}

HARD BANS
${bans}

CONTENT RULES
${content}

OUTPUT RULES
${output}`;
}

export function buildUserPrompt(blueprint: Blueprint): string {
  const sectionsSummary = (blueprint.sections ?? [])
    .map((s) => `- ${s.name}: ${s.description}`)
    .join("\n");

  return `Build the website described by this blueprint.
Title: ${blueprint.title ?? ""}
Tagline: ${blueprint.tagline ?? ""}
Website Type: ${blueprint.websiteType ?? ""}
Visual Theme (mood only; the DESIGN SYSTEM in the instructions decides fonts, colors and shapes): ${blueprint.visualTheme ?? ""}
Target Audience: ${blueprint.targetAudience ?? ""}
Sections to Build (in this order):
${sectionsSummary}
Key Features: ${(blueprint.keyFeatures ?? []).join(", ")}

Write the full component now, starting with the first line of code:`;
}

// ---------------------------------------------------------------------------
// Checker (dipakai codeTester.ts)
// ---------------------------------------------------------------------------
export function checkDesignRules(code: string, style: StyleDirection): Violation[] {
  const violations: Violation[] = [];
  const allRules = [...TECHNICAL_RULES, ...DESIGN_BANS, ...OUTPUT_RULES];

  for (const rule of allRules) {
    if (!rule.check) continue;
    const message = rule.check(code, style);
    if (message) violations.push({ ruleId: rule.id, severity: rule.severity, message });
  }
  violations.push(...checkStyleConformance(code, style));
  return violations;
}

/** Teks siap kirim balik ke model penulis untuk putaran perbaikan. */
export function formatViolationsForRetry(violations: Violation[]): string {
  if (violations.length === 0) return "";
  const lines = violations.map((v) => `- [${v.severity}] ${v.ruleId}: ${v.message}`);
  return `The previous output violated these rules. Fix every item, keep everything else unchanged, and output the complete corrected component (code only, no code fences):\n${lines.join("\n")}`;
}