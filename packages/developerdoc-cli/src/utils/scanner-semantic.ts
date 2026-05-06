import path from "node:path";

/** Semantic scan constants — keep payloads bounded */
export const SEMANTIC_LIMITS = {
  MAX_CLASSIFIED_PATHS: 2000,
  MAX_PER_CATEGORY: 120,
  MAX_API_ROUTES_ANALYZED: 80,
  MAX_DEEP_SCAN_FILES: 350,
  MAX_ROUTE_FILE_BYTES: 256 * 1024,
  MAX_DOC_FILES: 28,
  MAX_DOC_SUMMARY_CHARS: 300,
  MAX_IMPORT_GRAPH_FILES: 400,
  MAX_FILES_PER_MODULE: 40,
  MAX_MODULE_DEPS: 25,
} as const;

export type FileClassification =
  | "ui_page"
  | "api_route"
  | "layout"
  | "loading_state"
  | "error_boundary"
  | "middleware"
  | "server_action"
  | "database"
  | "auth"
  | "config"
  | "component"
  | "hook"
  | "utility"
  | "service"
  | "script"
  | "test"
  | "documentation"
  | "deployment"
  | "unknown";

export type EnvLikelyRequired = "likely_required" | "likely_optional" | "unknown";

export interface EnvUsageEntry {
  name: string;
  files: string[];
  isPublic: boolean;
  serverOnly: boolean;
  likelyRequired: EnvLikelyRequired;
  likelyPurpose: string;
  nextPublicSecretWarning?: string;
}

export interface ApiRouteInfo {
  filePath: string;
  routePath: string;
  methods: string[];
  importedModules: string[];
  envVarsReferenced: string[];
  usesPrisma: boolean;
  usesAuth: boolean;
  purpose: string;
}

export interface PackageScriptsSummary {
  dev?: string;
  build?: string;
  start?: string;
  lint?: string;
  prismaMigrate?: string;
  prismaGenerate?: string;
  seed?: string;
}

export interface PrismaModelSummary {
  name: string;
  fields: string[];
  relations: string[];
}

export interface PrismaEnumSummary {
  name: string;
  values: string[];
}

export interface PrismaSchemaSummary {
  datasourceProvider?: string;
  generatorProvider?: string;
  models: PrismaModelSummary[];
  enums: PrismaEnumSummary[];
  migrationsFolderExists: boolean;
}

export interface DocFileSummary {
  path: string;
  title: string;
  summary: string;
  likelyTopic: string;
}

export interface ModuleSummary {
  module: string;
  keyFiles: string[];
  detectedResponsibility: string;
  dependenciesFromOtherModules: string[];
}

export interface FileImportsSummary {
  filePath: string;
  imports: string[];
  internalImports: string[];
  externalImports: string[];
}

export type PackageManagerKind = "npm" | "pnpm" | "yarn" | "bun" | "unknown";

export interface SetupHints {
  packageManager: PackageManagerKind;
  nodeEngine?: string;
  requiredEnvVars: string[];
  databaseRequired: boolean;
  migrationCommand?: string;
  seedCommand?: string;
  clerkDetected?: boolean;
  vercelDetected?: boolean;
}

const HTTP_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"] as const;

function normalizeSeparators(relPath: string): string {
  return relPath.replace(/\\/g, "/");
}

export function classifyPath(relPath: string): FileClassification {
  const n = normalizeSeparators(relPath);
  const lower = n.toLowerCase();
  const base = path.basename(lower);

  if (/\.(test|spec)\.(tsx?|jsx?|mjs|cjs)$/.test(lower) || lower.includes("__tests__/")) {
    return "test";
  }
  if (/\.(md|mdx)$/.test(lower)) return "documentation";
  if (
    /^dockerfile/i.test(base) ||
    lower.includes("docker-compose") ||
    base === "vercel.json" ||
    base === "netlify.toml" ||
    base === "render.yaml" ||
    lower.startsWith(".github/workflows/")
  ) {
    return "deployment";
  }

  if (lower.includes("/prisma/") && (lower.endsWith(".prisma") || lower.endsWith(".sql"))) {
    return "database";
  }
  if (lower === "middleware.ts" || lower === "middleware.js" || lower === "src/middleware.ts" || lower === "src/middleware.js") {
    return "middleware";
  }

  const inAppRouter =
    n.startsWith("app/") ||
    n.startsWith("src/app/") ||
    n.includes("/src/app/") ||
    (/(\/app\/)/u.test(n) && !n.includes("node_modules"));
  if (inAppRouter && /\/route\.(tsx?|jsx?|mjs|cjs)$/.test(lower)) return "api_route";
  if (inAppRouter && /\/page\.(tsx?|jsx?|mjs|cjs)$/.test(lower)) return "ui_page";
  if (inAppRouter && /\/layout\.(tsx?|jsx?|mjs|cjs)$/.test(lower)) return "layout";
  if (inAppRouter && /\/loading\.(tsx?|jsx?|mjs|cjs)$/.test(lower)) return "loading_state";
  if (inAppRouter && /\/error\.(tsx?|jsx?|mjs|cjs)$/.test(lower)) return "error_boundary";

  if (lower.startsWith("pages/api/") && /\.(tsx?|jsx?|mjs|cjs)$/.test(lower)) return "api_route";

  if (
    lower.includes("auth") ||
    lower.includes("clerk") ||
    lower.includes("/sign-in/") ||
    lower.includes("/sign-up/") ||
    lower.includes("session") ||
    lower.includes("oauth") ||
    lower.includes("jwt")
  ) {
    if (/\.(tsx?|jsx?|mjs|cjs)$/.test(lower)) return "auth";
  }

  if (
    /^(next|tailwind|postcss|vitest|jest|playwright)\.config\./i.test(base) ||
    base === "tsconfig.json" ||
    base === "components.json" ||
    lower.endsWith(".config.ts") ||
    lower.endsWith(".config.js") ||
    lower.endsWith(".config.mjs")
  ) {
    return "config";
  }

  if (lower.startsWith("scripts/") && /\.(tsx?|jsx?|mjs|cjs|sh)$/.test(lower)) return "script";

  if (/^use[A-Z]/u.test(path.basename(n, path.extname(n))) && /\.(tsx?|jsx?)$/.test(lower)) {
    return "hook";
  }
  if (lower.includes("/hooks/") && /\.(tsx?|jsx?|mjs|cjs)$/.test(lower)) return "hook";

  if (lower.includes("service") && /\.(tsx?|jsx?|mjs|cjs)$/.test(lower)) return "service";

  if (
    lower.startsWith("components/") ||
    lower.includes("/components/") ||
    (/\.tsx$/u.test(lower) && (lower.includes("/ui/") || lower.includes("/shared/")))
  ) {
    return "component";
  }

  if (lower.includes("/lib/") || lower.includes("/utils/") || lower.includes("/helpers/")) {
    if (/\.(tsx?|jsx?|mjs|cjs)$/.test(lower)) return "utility";
  }

  if (/\.(tsx?|jsx?|mjs|cjs)$/.test(lower)) return "unknown";
  return "unknown";
}

export function inferRoutePathForApiFile(normalizedPath: string): string {
  const n = normalizeSeparators(normalizedPath);

  const appRoute = /^(.+)\/route\.(tsx?|jsx?|mjs|cjs)$/iu.exec(n);
  if (appRoute?.[1]) {
    let base = appRoute[1];
    if (base.startsWith("src/app/")) base = base.slice("src/".length);
    if (base.startsWith("app/")) {
      const rest = base.slice("app".length);
      const route = rest.startsWith("/") ? rest : `/${rest}`;
      return route === "/" ? "/" : route.replace(/\/{2,}/g, "/");
    }
  }

  const pagesMatch = /^pages\/api\/(.+)\.(tsx?|jsx?|mjs|cjs)$/iu.exec(n);
  if (pagesMatch?.[1]) {
    return `/api/${pagesMatch[1].replace(/\\/g, "/")}`;
  }

  const srcPages = /^src\/pages\/api\/(.+)\.(tsx?|jsx?|mjs|cjs)$/iu.exec(n);
  if (srcPages?.[1]) {
    return `/api/${srcPages[1].replace(/\\/g, "/")}`;
  }

  return "";
}

export function extractExportedHttpMethods(source: string): string[] {
  const found = new Set<string>();
  const methodPattern = new RegExp(
    `export\\s+(?:async\\s+)?function\\s+(${HTTP_METHODS.join("|")})\\b`,
    "gi",
  );
  for (const m of source.matchAll(methodPattern)) {
    const word = m[1]?.toUpperCase();
    if (word) found.add(word);
  }
  const constPattern = new RegExp(`export\\s+const\\s+(${HTTP_METHODS.join("|")})\\s*=`, "gi");
  for (const m of source.matchAll(constPattern)) {
    const word = m[1]?.toUpperCase();
    if (word) found.add(word);
  }
  return Array.from(found).sort();
}

export function extractImportedModuleSpecifiers(source: string): string[] {
  const specs = new Set<string>();
  const importRe =
    /import\s+(?:type\s+)?(?:(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)(?:\s*,\s*(?:\{[^}]*\}|\*\s+as\s+\w+|\w+))*\s+from\s+)?['"]([^'"]+)['"]/gu;
  const dynImportRe = /import\s*\(\s*['"]([^'"]+)['"]\s*\)/gu;
  const requireRe = /require\s*\(\s*['"]([^'"]+)['"]\s*\)/gu;

  for (const r of [importRe, dynImportRe, requireRe]) {
    for (const m of source.matchAll(r)) {
      if (m[1]) specs.add(m[1]);
    }
  }
  return Array.from(specs).sort();
}

export function extractEnvVarReferences(source: string): string[] {
  const names = new Set<string>();
  const re = /process\.env(?:\.|\[['"])([A-Za-z_][A-Za-z0-9_]*)/g;
  const reBracket = /process\.env\[['"]([A-Za-z_][A-Za-z0-9_]*)['"]\]/g;
  for (const m of source.matchAll(re)) {
    if (m[1]) names.add(m[1]);
  }
  for (const m of source.matchAll(reBracket)) {
    if (m[1]) names.add(m[1]);
  }
  return Array.from(names).sort();
}

export function fileHasUseServer(source: string): boolean {
  const head = source.slice(0, 800);
  return /^\s*['"]use server['"]\s*;/m.test(head) || /^\s*['"]use server['"]\s*$/m.test(head);
}

export function detectPrismaUsage(source: string, imported: string[]): boolean {
  if (/from\s+['"]@prisma\/client['"]/.test(source) || /\bprisma\./u.test(source)) return true;
  return imported.some((i) => i === "@prisma/client" || i.includes("prisma"));
}

export function detectAuthUsage(source: string, imported: string[]): boolean {
  if (
    /\bauth\s*\(/.test(source) ||
    /from\s+['"]@clerk\//u.test(source) ||
    /from\s+['"]next-auth/u.test(source) ||
    /from\s+['"]@auth\//u.test(source)
  ) {
    return true;
  }
  return imported.some(
    (i) =>
      i.includes("@clerk") ||
      i.includes("next-auth") ||
      i.includes("@auth") ||
      i.includes("/auth/"),
  );
}

export function inferPurposeFromRoute(filePath: string, methods: string[], source: string): string {
  const base = path.basename(filePath, path.extname(filePath));
  const methodSet = new Set<string>(HTTP_METHODS as unknown as string[]);
  const fnNames: string[] = [];
  const fnRe = /(?:export\s+)?(?:async\s+)?function\s+(\w+)/gu;
  for (const m of source.matchAll(fnRe)) {
    if (m[1] && !methodSet.has(m[1].toUpperCase())) {
      fnNames.push(m[1]);
    }
  }
  const parts = [base, ...methods.slice(0, 3), ...fnNames.slice(0, 3)].filter(Boolean);
  const summary = parts.join(", ");
  return summary.length > 160 ? `${summary.slice(0, 157)}...` : summary || "API route handler";
}

export function splitImports(
  specifier: string,
  projectRootRel: string,
): { internal: boolean; resolvedRelative?: string } {
  if (specifier.startsWith("@/")) {
    return { internal: true, resolvedRelative: specifier.slice(2) };
  }
  if (specifier.startsWith("~/")) {
    return { internal: true, resolvedRelative: specifier.slice(2) };
  }
  if (specifier.startsWith(".") && !specifier.startsWith("../node_modules")) {
    const dir = path.dirname(projectRootRel);
    const resolved = normalizeSeparators(path.normalize(path.join(dir, specifier)));
    return { internal: true, resolvedRelative: resolved };
  }
  if (!specifier.startsWith(".") && !path.isAbsolute(specifier)) {
    return { internal: false };
  }
  return { internal: true, resolvedRelative: normalizeSeparators(specifier) };
}

export function buildFileImportsSummary(
  filePath: string,
  source: string,
): Omit<FileImportsSummary, "internalImports" | "externalImports"> & {
  internalImports: string[];
  externalImports: string[];
} {
  const specs = extractImportedModuleSpecifiers(source);
  const internalImports: string[] = [];
  const externalImports: string[] = [];

  for (const s of specs) {
    const { internal, resolvedRelative } = splitImports(s, filePath);
    if (!internal) {
      const pkg = s.startsWith("@") ? s.split("/").slice(0, 2).join("/") : s.split("/")[0];
      externalImports.push(pkg ?? s);
    } else if (resolvedRelative) {
      internalImports.push(resolvedRelative);
    }
  }

  return {
    filePath,
    imports: specs,
    internalImports: Array.from(new Set(internalImports)).sort(),
    externalImports: Array.from(new Set(externalImports)).sort(),
  };
}

export function inferEnvPurpose(name: string): string {
  const up = name.toUpperCase();
  if (up.includes("DATABASE") || up === "DIRECT_URL" || up === "SHADOW_DATABASE_URL") return "Database connection";
  if (up.includes("CLERK") || up.includes("AUTH") || up.includes("JWT") || up.includes("SESSION")) return "Authentication";
  if (up.includes("URL") || up.includes("HOST") || up.includes("DOMAIN")) return "URL / host configuration";
  if (up.includes("KEY") || up.includes("SECRET") || up.includes("TOKEN")) return "Secret / API key";
  if (up.includes("SMTP") || up.includes("MAIL") || up.includes("EMAIL")) return "Email delivery";
  if (up.includes("S3") || up.includes("BUCKET") || up.includes("STORAGE")) return "Object storage";
  if (up.includes("REDIS") || up.includes("CACHE")) return "Cache";
  if (up.includes("API")) return "API configuration";
  return "Application configuration";
}

export function looksSecretLike(name: string): boolean {
  const up = name.toUpperCase();
  if (up.startsWith("NEXT_PUBLIC_")) {
    const rest = up.slice("NEXT_PUBLIC_".length);
    return /SECRET|KEY|TOKEN|PASSWORD|PRIVATE|AUTH|API/i.test(rest);
  }
  return false;
}

export function envLikelyRequired(name: string, files: string[]): EnvLikelyRequired {
  const up = name.toUpperCase();
  if (up === "DATABASE_URL" || up === "DIRECT_URL" || up.includes("AUTH_SECRET")) return "likely_required";
  const onlyTests = files.length > 0 && files.every((f) => f.includes(".test.") || f.includes(".spec.") || f.includes("__tests__"));
  if (onlyTests) return "likely_optional";
  return "unknown";
}

export function mergeEnvUsage(
  map: Map<string, Set<string>>,
  name: string,
  filePath: string,
): void {
  if (!map.has(name)) map.set(name, new Set());
  map.get(name)!.add(normalizeSeparators(filePath));
}

export function buildEnvUsageEntries(map: Map<string, Set<string>>): EnvUsageEntry[] {
  const entries: EnvUsageEntry[] = [];

  for (const [name, fileSet] of map) {
    const files = Array.from(fileSet).sort();
    const isPublic = name.startsWith("NEXT_PUBLIC_");
    const serverOnly = !isPublic;
    const warning = isPublic && looksSecretLike(name) ? "Name looks secret-sensitive but uses NEXT_PUBLIC_ prefix" : undefined;

    entries.push({
      name,
      files: files.slice(0, 40),
      isPublic,
      serverOnly,
      likelyRequired: envLikelyRequired(name, files),
      likelyPurpose: inferEnvPurpose(name),
      ...(warning ? { nextPublicSecretWarning: warning } : {}),
    });
  }

  return entries.sort((a, b) => a.name.localeCompare(b.name));
}

function extractBalancedBlock(src: string, startIdx: number): { end: number; body: string } | null {
  const open = src.indexOf("{", startIdx);
  if (open < 0) return null;
  let depth = 0;
  for (let i = open; i < src.length; i += 1) {
    const c = src[i];
    if (c === "{") depth += 1;
    else if (c === "}") {
      depth -= 1;
      if (depth === 0) {
        return { end: i + 1, body: src.slice(open + 1, i) };
      }
    }
  }
  return null;
}

export function parsePrismaSchema(schemaContent: string): Omit<PrismaSchemaSummary, "migrationsFolderExists"> {
  let datasourceProvider: string | undefined;
  const ds = schemaContent.match(/datasource\s+\w+\s*\{/i);
  if (ds && ds.index !== undefined) {
    const block = extractBalancedBlock(schemaContent, ds.index);
    const inner = block?.body ?? "";
    const prov = /provider\s*=\s*(\w+)/i.exec(inner);
    if (prov?.[1]) datasourceProvider = prov[1];
  }

  let generatorProvider: string | undefined;
  const gen = schemaContent.match(/generator\s+\w+\s*\{/i);
  if (gen && gen.index !== undefined) {
    const block = extractBalancedBlock(schemaContent, gen.index);
    const inner = block?.body ?? "";
    const prov = /provider\s*=\s*["']([^"']+)["']/i.exec(inner);
    if (prov?.[1]) generatorProvider = prov[1];
  }

  const models: PrismaModelSummary[] = [];
  const modelRe = /model\s+(\w+)\s*\{/gi;
  for (const m of schemaContent.matchAll(modelRe)) {
    const modelName = m[1];
    if (m.index === undefined || !modelName) continue;
    const braceStart = schemaContent.indexOf("{", m.index);
    const block = braceStart >= 0 ? extractBalancedBlock(schemaContent, braceStart) : null;
    const body = block?.body ?? "";
    const fields: string[] = [];
    const relations: string[] = [];
    for (const rawLine of body.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith("//")) continue;
      const fieldMatch = /^(\w+)\s+[\w\[\]?]+/.exec(line);
      if (fieldMatch?.[1] && !line.startsWith("@@")) {
        fields.push(fieldMatch[1]);
      }
      if (line.includes("@relation")) {
        const rel = /@relation\s*\(\s*([^)]*)\)/.exec(line);
        if (rel?.[1]) relations.push(rel[1].trim().slice(0, 120));
      }
    }
    models.push({
      name: modelName,
      fields: Array.from(new Set(fields)).slice(0, 80),
      relations: Array.from(new Set(relations)).slice(0, 40),
    });
  }

  const enums: PrismaEnumSummary[] = [];
  const enumRe = /enum\s+(\w+)\s*\{/gi;
  for (const e of schemaContent.matchAll(enumRe)) {
    const enumName = e[1];
    if (e.index === undefined || !enumName) continue;
    const braceStart = schemaContent.indexOf("{", e.index);
    const block = braceStart >= 0 ? extractBalancedBlock(schemaContent, braceStart) : null;
    const body = block?.body ?? "";
    const values = body
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith("//") && !l.startsWith("@@"))
      .map((l) => l.split(/\s+/)[0]!)
      .filter(Boolean);
    enums.push({ name: enumName, values: Array.from(new Set(values)).slice(0, 60) });
  }

  return {
    datasourceProvider,
    generatorProvider,
    models: models.slice(0, 120),
    enums: enums.slice(0, 80),
  };
}

export function extractPackageScripts(scripts: Record<string, string> | undefined): PackageScriptsSummary {
  if (!scripts) return {};

  const pick = (...names: string[]): string | undefined => {
    for (const n of names) {
      if (scripts[n]) return scripts[n];
      const hit = Object.keys(scripts).find((k) => k.toLowerCase() === n.toLowerCase());
      if (hit) return scripts[hit];
    }
    return undefined;
  };

  let prismaMigrate: string | undefined;
  let prismaGenerate: string | undefined;
  let seed: string | undefined;

  for (const [key, val] of Object.entries(scripts)) {
    const kl = key.toLowerCase();
    const vl = val.toLowerCase();
    if (!seed && (kl.includes("seed") || vl.includes("prisma db seed"))) seed = val;
    if (!prismaMigrate && (vl.includes("prisma migrate") || vl.includes("prisma migrate deploy"))) {
      prismaMigrate = val;
    }
    if (!prismaGenerate && vl.includes("prisma generate")) prismaGenerate = val;
  }

  return {
    dev: pick("dev", "develop", "start:dev"),
    build: pick("build"),
    start: pick("start", "serve"),
    lint: pick("lint", "eslint"),
    prismaMigrate,
    prismaGenerate,
    seed,
  };
}

export function detectPackageManager(projectRoot: string, readExists: (p: string) => boolean): PackageManagerKind {
  if (readExists(path.join(projectRoot, "pnpm-lock.yaml"))) return "pnpm";
  if (readExists(path.join(projectRoot, "yarn.lock"))) return "yarn";
  if (readExists(path.join(projectRoot, "package-lock.json"))) return "npm";
  if (readExists(path.join(projectRoot, "bun.lockb"))) return "bun";
  return "unknown";
}

const MODULE_PREFIXES = [
  "packages/developerdoc-cli",
  "app/api",
  "app/docs",
  "app/published",
  "lib/sync",
  "lib/auth",
  "components",
  "cli",
  "prisma",
  "lib",
  "app",
  "src",
] as const;

export function moduleKeyForFile(normalizedPath: string): string {
  const n = normalizeSeparators(normalizedPath);
  for (const prefix of MODULE_PREFIXES) {
    if (n === prefix || n.startsWith(`${prefix}/`)) return prefix;
  }
  const seg = n.split("/");
  if (seg.length >= 2) return `${seg[0]}/${seg[1]}`;
  return seg[0] ?? "root";
}

export function responsibilityBlurb(moduleKey: string): string {
  const map: Record<string, string> = {
    "app/api": "HTTP API route handlers (App Router)",
    "app/docs": "Documentation pages and reader UI",
    "app/published": "Published docs surface",
    "lib/sync": "Sync and snapshot integration with Developerdoc",
    "lib/auth": "Authentication helpers and configuration",
    prisma: "Database schema, migrations, and Prisma assets",
    components: "Shared UI components",
    cli: "CLI tooling",
    lib: "Shared libraries and utilities",
    app: "Next.js App Router pages, layouts, and routes",
    src: "Application source (framework-specific)",
    "packages/developerdoc-cli": "Developerdoc CLI package",
  };
  return map[moduleKey] ?? `Code under ${moduleKey}`;
}

export function docTopicGuess(title: string, pathStr: string): string {
  const t = `${title} ${pathStr}`.toLowerCase();
  if (t.includes("readme")) return "Project overview";
  if (t.includes("contribut")) return "Contributing";
  if (t.includes("changelog")) return "Changelog";
  if (t.includes("arch")) return "Architecture";
  if (t.includes("api")) return "API reference";
  return "Documentation";
}

export function truncateSummary(text: string, max = SEMANTIC_LIMITS.MAX_DOC_SUMMARY_CHARS): string {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (cleaned.length <= max) return cleaned;
  return `${cleaned.slice(0, max - 3)}...`;
}

export function extractMarkdownTitle(content: string): string {
  const lines = content.split(/\r?\n/);
  for (const line of lines.slice(0, 30)) {
    const m = /^#\s+(.+)/u.exec(line.trim());
    if (m?.[1]) return m[1].trim().slice(0, 120);
  }
  return "";
}

/** Bucket classified paths with per-category caps */
export function bucketClassifications(
  paths: Iterable<string>,
  classify: (p: string) => FileClassification,
): Partial<Record<FileClassification, string[]>> {
  const buckets: Partial<Record<FileClassification, string[]>> = {};
  let total = 0;

  outer: for (const raw of paths) {
    if (total >= SEMANTIC_LIMITS.MAX_CLASSIFIED_PATHS) break;
    const p = normalizeSeparators(raw);
    const c = classify(p);
    if (!buckets[c]) buckets[c] = [];
    const arr = buckets[c]!;
    if (arr.length >= SEMANTIC_LIMITS.MAX_PER_CATEGORY) continue;
    arr.push(p);
    total += 1;
  }

  return buckets;
}
