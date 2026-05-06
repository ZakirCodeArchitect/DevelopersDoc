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

export type EnvLikelyRequired =
  | "likely_required"
  | "likely_optional"
  | "required_for_webhook"
  | "required_for_email_feature"
  | "platform_provided"
  | "runtime_provided"
  | "optional_debug"
  | "optional_cache"
  | "feature_flag"
  | "unknown";

/** Safe env value presence — never stores actual values */
export type EnvValueStatusClass =
  | "present_non_empty"
  | "present_empty"
  | "referenced_only"
  | "missing_from_env_but_referenced"
  | "env_file_only";

export interface EnvUsageEntry {
  name: string;
  files: string[];
  isPublic: boolean;
  serverOnly: boolean;
  likelyRequired: EnvLikelyRequired;
  likelyPurpose: string;
  nextPublicSecretWarning?: string;
  /** v3: how the var appears across .env names vs code refs */
  valueStatus?: EnvValueStatusClass;
  /** v3: coarse bucket for generated docs */
  envClassification?: string;
  safeNotes?: string;
  /** v3: human-readable scope label */
  scopeLabel?: string;
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
  /** v3 semantic fields (optional for older snapshots) */
  authType?: string;
  purposeSummary?: string;
  dbModelsTouched?: string[];
  prismaOperations?: string[];
  importedServices?: string[];
  httpStatuses?: string[];
  requestFields?: string[];
  requestBodyFields?: string[];
  queryParams?: string[];
  headersUsed?: string[];
  formDataFields?: string[];
  validationSignals?: string[];
  responseFields?: string[];
  responseStatusCodes?: string[];
  failureCases?: string[];
  sideEffectsNarrative?: string[];
  externalEffects?: string[];
  hasErrorHandling?: boolean;
  analysisConfidence?: "high" | "medium" | "low";
  analysisNotes?: string[];
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
  /** env("…") name from datasource url = */
  datasourceUrlEnv?: string;
  /** env("…") name from directUrl = */
  datasourceDirectUrlEnv?: string;
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
  /* Next.js 16+ root proxy (e.g. Clerk clerkMiddleware) */
  if (
    lower === "proxy.ts" ||
    lower === "proxy.js" ||
    lower === "src/proxy.ts" ||
    lower === "src/proxy.js"
  ) {
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

const PRISMA_OP_RE = /\bprisma\.([a-z][a-zA-Z0-9_]*)\.([a-z][a-zA-Z0-9_]*)\b/g;

export function extractPrismaOperations(source: string): string[] {
  const out: string[] = [];
  for (const m of source.matchAll(PRISMA_OP_RE)) {
    if (m[1] && m[2]) out.push(`${m[1]}.${m[2]}`);
  }
  return Array.from(new Set(out)).slice(0, 40);
}

export function extractHttpStatusesFromSource(source: string): string[] {
  const found = new Set<string>();
  for (const m of source.matchAll(/status:\s*(\d{3})/g)) {
    if (m[1]) found.add(m[1]);
  }
  return Array.from(found).sort();
}

function extractLikelyRequestFields(source: string): string[] {
  const found = new Set<string>();

  for (const m of source.matchAll(/(?:const|let|var)\s+\{([^}]+)\}\s*=\s*await\s+request\.json\s*\(\s*\)/g)) {
    const fields = (m[1] ?? '')
      .split(',')
      .map((p) => p.trim().split(':')[0]?.trim())
      .filter(Boolean);
    fields.forEach((f) => found.add(f!));
  }

  for (const m of source.matchAll(/(?:const|let|var)\s+(\w+)\s*=\s*await\s+request\.json\s*\(\s*\)/g)) {
    const bodyVar = m[1];
    if (!bodyVar) continue;
    const accessRe = new RegExp(`\\b${bodyVar}\\.(\\w+)\\b`, 'g');
    for (const k of source.matchAll(accessRe)) {
      if (k[1]) found.add(k[1]);
    }
  }

  for (const m of source.matchAll(/searchParams\.get\s*\(\s*['"]([^'"]+)['"]\s*\)/g)) {
    if (m[1]) found.add(`query.${m[1]}`);
  }

  for (const m of source.matchAll(/params\.([A-Za-z_][A-Za-z0-9_]*)/g)) {
    if (m[1]) found.add(`param.${m[1]}`);
  }

  return Array.from(found).slice(0, 30);
}

function extractRequestDetails(source: string): {
  bodyFields: string[];
  queryParams: string[];
  headersUsed: string[];
  formDataFields: string[];
  validationSignals: string[];
} {
  const bodyFields = new Set<string>();
  const queryParams = new Set<string>();
  const headersUsed = new Set<string>();
  const formDataFields = new Set<string>();
  const validationSignals = new Set<string>();

  for (const m of source.matchAll(/await\s+(?:req|request)\.json\s*\(\s*\)/g)) {
    if (m[0]) validationSignals.add("json-body-detected");
  }
  const jsonVars = new Set<string>();
  for (const m of source.matchAll(/(?:const|let|var)\s+\{([^}]+)\}\s*=\s*await\s+(?:req|request)\.json\s*\(\s*\)/g)) {
    const fields = (m[1] ?? "")
      .split(",")
      .map((p) => p.trim().split(":")[0]?.trim())
      .filter(Boolean);
    for (const f of fields) bodyFields.add(f!);
  }
  for (const m of source.matchAll(/(?:const|let|var)\s+([A-Za-z_][A-Za-z0-9_]*)\s*=\s*await\s+(?:req|request)\.json\s*\(\s*\)/g)) {
    if (m[1]) jsonVars.add(m[1]);
  }
  for (const bodyVar of jsonVars) {
    const propRe = new RegExp(`\\b${bodyVar}\\.([A-Za-z_][A-Za-z0-9_]*)\\b`, "g");
    for (const pm of source.matchAll(propRe)) {
      if (pm[1]) bodyFields.add(pm[1]);
    }
    const destructRe = new RegExp(
      `(?:const|let|var)\\s+\\{([^}]+)\\}\\s*=\\s*${bodyVar}\\b`,
      "g",
    );
    for (const dm of source.matchAll(destructRe)) {
      const fields = (dm[1] ?? "")
        .split(",")
        .map((p) => p.trim().split(":")[0]?.trim())
        .filter(Boolean);
      for (const f of fields) bodyFields.add(f!);
    }
  }
  for (const m of source.matchAll(/searchParams\.get\s*\(\s*['"]([^'"]+)['"]\s*\)/g)) {
    if (m[1]) queryParams.add(m[1]);
  }
  for (const m of source.matchAll(/new\s+URL\s*\(\s*request\.url\s*\)\.searchParams(?:\.get\(\s*['"]([^'"]+)['"]\s*\))?/g)) {
    if (m[1]) queryParams.add(m[1]);
    else validationSignals.add("url-searchparams-detected");
  }
  for (const m of source.matchAll(/headers\.get\s*\(\s*['"]([^'"]+)['"]\s*\)/gi)) {
    if (m[1]) headersUsed.add(m[1].toLowerCase());
  }
  for (const m of source.matchAll(/(?:req|request)\.headers\.get\s*\(\s*['"]([^'"]+)['"]\s*\)/gi)) {
    if (m[1]) headersUsed.add(m[1].toLowerCase());
  }
  if (/formData\s*\(\s*\)/.test(source)) {
    validationSignals.add("form-data-detected");
  }
  for (const m of source.matchAll(/formData\.get\s*\(\s*['"]([^'"]+)['"]\s*\)/g)) {
    if (m[1]) formDataFields.add(m[1]);
  }
  if (/z\.object\s*\(/.test(source)) validationSignals.add("zod-object");
  if (/\.safeParse\s*\(/.test(source)) validationSignals.add("safeParse");
  if (/\.parse\s*\(/.test(source) && /schema|zod|validator/i.test(source)) validationSignals.add("parse-validation");

  return {
    bodyFields: Array.from(bodyFields).slice(0, 30),
    queryParams: Array.from(queryParams).slice(0, 30),
    headersUsed: Array.from(headersUsed).slice(0, 20),
    formDataFields: Array.from(formDataFields).slice(0, 20),
    validationSignals: Array.from(validationSignals).slice(0, 20),
  };
}

function extractLikelyResponseFields(source: string): string[] {
  const found = new Set<string>();
  for (const m of source.matchAll(/(?:NextResponse|Response)\.json\s*\(\s*\{([\s\S]*?)\}\s*(?:,|\))/g)) {
    const body = m[1] ?? '';
    for (const key of body.matchAll(/\b([A-Za-z_][A-Za-z0-9_]*)\s*:/g)) {
      if (key[1]) found.add(key[1]);
    }
  }
  return Array.from(found).slice(0, 30);
}

function inferAuthTypeForRoute(routePath: string, source: string, usesAuth: boolean): string {
  const p = routePath || "";
  const s = source;
  if (/\/api\/webhooks\//i.test(p) || (/\bsvix\b/i.test(s) && /webhook/i.test(s))) return "Webhook signature auth";
  if (p.includes("/api/cli/scan") || p.includes("/api/cli/changes")) return "CLI sync bearer token auth";
  if (p.includes("/api/cli/register") && !p.includes("register-from-auth")) return "Clerk session auth";
  if (p.includes("/api/cli/register-from-auth")) return "CLI device/browser token auth";
  if (p.includes("/api/cli/auth/")) {
    if (p.includes("/confirm")) return "CLI device/browser auth";
    return "CLI device/browser auth";
  }
  if (p.startsWith("/api/published")) return "Public published access";
  if (
    usesAuth ||
    /\bgetCurrentUser\b/.test(s) ||
    /\bcurrentUser\s*\(/.test(s) ||
    /\bauth\s*\(\s*\)/.test(s)
  ) {
    return "Clerk session auth";
  }
  return "Unknown / needs review";
}

function inferPurposeSummary(routePath: string, methods: string[], source: string): string {
  const p = routePath || "";
  const m = methods.length ? methods.join("/") : "HTTP";
  const hints: Array<{ test: boolean; text: string }> = [
    {
      test: p.endsWith("/api/cli/scan") || p === "/api/cli/scan",
      text: `${m} ${p}: Receives repository scan metadata from the CLI, validates the sync token, stores a DocSyncSnapshot, updates sync project metadata, and may trigger initial documentation generation.`,
    },
    {
      test: p.includes("/api/cli/register") && !p.includes("register-from-auth"),
      text: `${m} ${p}: Creates or updates the repository sync binding for an owned project and returns a one-time plaintext sync token.`,
    },
    {
      test: p.includes("/api/cli/register-from-auth"),
      text: `${m} ${p}: Completes CLI linking after browser/device auth; may create a matching project and registers DocSyncProject with a new sync token.`,
    },
    {
      test: p.includes("/api/cli/changes"),
      text: `${m} ${p}: Records incremental file change metadata from the CLI and updates last-synced commit on the sync project.`,
    },
    {
      test: p.includes("/api/cli/project-status"),
      text: `${m} ${p}: Returns dashboard sync status (snapshots, changes, generated documentation hints) for an authenticated project member.`,
    },
    {
      test: p.includes("/api/cli/auth/start"),
      text: `${m} ${p}: Starts a device-code style CLI auth session (public).`,
    },
    {
      test: p.includes("/api/cli/auth/poll"),
      text: `${m} ${p}: Polls CLI auth session status; may return a short-lived cli auth token when approved.`,
    },
    {
      test: p.includes("/api/cli/auth/confirm"),
      text: `${m} ${p}: Confirms CLI login with a user code under a Clerk session.`,
    },
    {
      test: p === "/api/published" || p.endsWith("/api/published"),
      text: `${m} ${p}: Lists published documents (paginated public API).`,
    },
    {
      test: /\/api\/published\/\[[^\]]+\]/.test(p) || /\/api\/published\/:/.test(p),
      text: `${m} ${p}: Fetches a public published document by slug with pages and sections for public rendering.`,
    },
    {
      test: p.includes("/api/webhooks/"),
      text: `${m} ${p}: Webhook receiver (e.g. Clerk user sync) with signed secret verification.`,
    },
    {
      test: p.includes("/api/docs") && !p.includes("/pages/") && !p.includes("/sections"),
      text: `${m} ${p}: Document CRUD at collection or single-document level (verify path for create vs update).`,
    },
    {
      test: p.includes("/pages/") && p.includes("/api/docs"),
      text: `${m} ${p}: Saves editor page content (e.g. Tiptap JSON to sections) for a document page.`,
    },
    {
      test: p.includes("/api/projects") && !p.includes("/share"),
      text: `${m} ${p}: Project create/update/delete for the authenticated user.`,
    },
    {
      test: p.includes("/api/projects") && p.includes("/share"),
      text: `${m} ${p}: Project sharing: invites, listing members, or revoking access (may send email).`,
    },
    {
      test: p.includes("/api/documents") && p.includes("/publish"),
      text: `${m} ${p}: Publish or unpublish a document to a public slug.`,
    },
    {
      test: p.includes("/api/documents") && p.includes("/share"),
      text: `${m} ${p}: Document-level sharing and invitations (may send email).`,
    },
  ];
  for (const h of hints) {
    if (h.test) return h.text;
  }
  const verbs: string[] = [];
  if (/\bprisma\./.test(source)) verbs.push("uses database");
  if (/revalidate/.test(source)) verbs.push("cache revalidation");
  if (/nodemailer|sendMail|transport\.sendMail/i.test(source)) verbs.push("may send email");
  if (/fetch\s*\(/.test(source) && /api\.|https?:/.test(source)) verbs.push("calls external HTTP");
  const verbStr = verbs.length ? ` — ${verbs.join("; ")}` : "";
  return `${m} ${p || "route"}: HTTP API handler${verbStr}. Inspect handler for full behavior.`;
}

function inferImportedServices(imported: string[]): string[] {
  return imported
    .filter(
      (i) =>
        i.startsWith("@/") &&
        (i.includes("/service") || i.includes("/services/") || i.includes("lib/sync") || i.includes("lib/")),
    )
    .slice(0, 25);
}

function inferSideEffects(source: string, routePath: string): { narrative: string[]; external: string[] } {
  const narrative: string[] = [];
  const external: string[] = [];
  if (/\bprisma\.\w+\.(create|update|upsert|delete|deleteMany)\b/.test(source)) narrative.push("writes to database");
  if (/\bprisma\.\w+\.findMany\b/.test(source) || /\bprisma\.\w+\.findFirst\b/.test(source)) narrative.push("reads database");
  if (/revalidatePath|revalidateTag/.test(source)) narrative.push("revalidates Next.js cache");
  if (/nodemailer|sendMail/i.test(source)) {
    narrative.push("may send email");
    external.push("SMTP / email delivery");
  }
  if (/\/publish/i.test(routePath) && /upsert|create|delete/.test(source)) narrative.push("updates published document metadata");
  if (/\/api\/cli\/scan/i.test(routePath)) narrative.push("stores scan snapshot; may trigger documentation generation");
  return { narrative, external };
}

/** Enrich a scanned route with v3 analysis fields */
export function enrichApiRouteForV3(info: ApiRouteInfo, source: string): ApiRouteInfo {
  const prismaOperations = extractPrismaOperations(source);
  const modelSet = new Set<string>();
  for (const op of prismaOperations) {
    const model = op.split(".")[0];
    if (model && /^[A-Z]/.test(model)) modelSet.add(model);
    else if (model) modelSet.add(model.charAt(0).toUpperCase() + model.slice(1));
  }
  const side = inferSideEffects(source, info.routePath);
  const notes: string[] = [];
  if (!info.methods.length) notes.push("No exported HTTP methods matched — check dynamic route exports.");
  const hasCatch = /\bcatch\s*\(/.test(source) || /try\s*\{/.test(source);
  const requestDetails = extractRequestDetails(source);
  const statusCodes = extractHttpStatusesFromSource(source);
  const failureCases = new Set<string>();
  if (/\bunauthori[sz]ed\b|\bforbidden\b/i.test(source)) failureCases.add("auth rejection");
  if (/\bnot\s+found\b/i.test(source)) failureCases.add("not found");
  if (/\btry\b[\s\S]*\bcatch\b/i.test(source)) failureCases.add("caught runtime failure");
  if (statusCodes.includes("400") || statusCodes.includes("422")) failureCases.add("validation failure");
  if (statusCodes.includes("500")) failureCases.add("internal error");

  return {
    ...info,
    authType: inferAuthTypeForRoute(info.routePath, source, info.usesAuth),
    purposeSummary: inferPurposeSummary(info.routePath, info.methods, source),
    dbModelsTouched: Array.from(new Set([...(info.dbModelsTouched ?? []), ...Array.from(modelSet)])).slice(0, 30),
    prismaOperations: Array.from(new Set([...(info.prismaOperations ?? []), ...prismaOperations])).slice(0, 40),
    importedServices: Array.from(
      new Set([...(info.importedServices ?? []), ...inferImportedServices(info.importedModules)]),
    ).slice(0, 30),
    httpStatuses: statusCodes,
    responseStatusCodes: statusCodes,
    requestFields: extractLikelyRequestFields(source),
    requestBodyFields: requestDetails.bodyFields,
    queryParams: requestDetails.queryParams,
    headersUsed: requestDetails.headersUsed,
    formDataFields: requestDetails.formDataFields,
    validationSignals: requestDetails.validationSignals,
    responseFields: extractLikelyResponseFields(source),
    failureCases: Array.from(failureCases).slice(0, 10),
    sideEffectsNarrative: side.narrative,
    externalEffects: side.external,
    hasErrorHandling: hasCatch,
    analysisConfidence: info.methods.length && info.routePath ? "high" : "medium",
    analysisNotes: notes.length ? notes : undefined,
  };
}

export interface AuthProxyAnalysis {
  frameworkMiddlewarePath?: string;
  authProviderSignals: string[];
  publicRoutePatterns: string[];
  publicApiRoutePatterns: string[];
  usesAuthProtect: boolean;
  matcherPatterns?: string[];
  confidence: "high" | "medium" | "low";
  notes: string[];
}

export function analyzeAuthProxyFromSource(source: string, filePath: string): AuthProxyAnalysis {
  const notes: string[] = [];
  const authProviderSignals: string[] = [];
  if (/clerkMiddleware/i.test(source)) authProviderSignals.push("Clerk clerkMiddleware");
  if (/createRouteMatcher/i.test(source)) authProviderSignals.push("createRouteMatcher");
  if (/auth\.protect/i.test(source)) authProviderSignals.push("auth.protect()");
  const publicRoutePatterns: string[] = [];
  const publicApiRoutePatterns: string[] = [];
  for (const m of source.matchAll(/createRouteMatcher\(\s*\[([\s\S]*?)\]\s*\)/g)) {
    const inner = m[1] ?? "";
    for (const q of inner.matchAll(/['"]([^'"]+)['"]/g)) {
      const lit = q[1]?.trim();
      if (!lit) continue;
      if (lit.includes("/api/")) publicApiRoutePatterns.push(lit);
      else publicRoutePatterns.push(lit);
    }
  }
  if (!publicApiRoutePatterns.length && /\/api\/published|\/api\/webhooks|\/api\/cli/i.test(source)) {
    if (/\/api\/published/.test(source)) publicApiRoutePatterns.push("/api/published(.*)");
    if (/\/api\/webhooks/.test(source)) publicApiRoutePatterns.push("/api/webhooks(.*)");
    if (/\/api\/cli/.test(source)) publicApiRoutePatterns.push("/api/cli(.*)");
  }
  if (!publicRoutePatterns.length && /\/sign-in|\/sign-up/i.test(source)) {
    publicRoutePatterns.push("/sign-in(.*)", "/sign-up(.*)");
  }
  const matcherPatterns: string[] = [];
  const cfg = /export\s+const\s+config\s*=\s*\{[\s\S]*?matcher:\s*\[([\s\S]*?)\]/m.exec(source);
  if (cfg?.[1]) {
    for (const q of cfg[1].matchAll(/['"]([^'"]+)['"]/g)) {
      if (q[1]) matcherPatterns.push(q[1]);
    }
  }
  return {
    frameworkMiddlewarePath: filePath.replace(/\\/g, "/"),
    authProviderSignals: Array.from(new Set(authProviderSignals)),
    publicRoutePatterns: Array.from(new Set(publicRoutePatterns)),
    publicApiRoutePatterns: Array.from(new Set(publicApiRoutePatterns)),
    usesAuthProtect: /auth\.protect/.test(source),
    matcherPatterns: matcherPatterns.length ? matcherPatterns : undefined,
    confidence: authProviderSignals.length ? "high" : "low",
    notes,
  };
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

/** Clerk and other intentionally public NEXT_PUBLIC_* patterns — do not treat "KEY" alone as secret */
export function isLikelySafeNextPublicName(name: string): boolean {
  const up = name.toUpperCase();
  if (!up.startsWith("NEXT_PUBLIC_")) return false;
  const rest = up.slice("NEXT_PUBLIC_".length);
  if (rest.includes("CLERK_PUBLISHABLE")) return true;
  if (rest.includes("SIGN_IN") || rest.includes("SIGN_UP") || rest.includes("REDIRECT")) return true;
  if (rest === "APP_URL") return true;
  return false;
}

export function looksSecretLike(name: string): boolean {
  const up = name.toUpperCase();
  if (up.startsWith("NEXT_PUBLIC_")) {
    if (isLikelySafeNextPublicName(name)) return false;
    const rest = up.slice("NEXT_PUBLIC_".length);
    return /SECRET|PASSWORD|PRIVATE|TOKEN|WEBHOOK|API_KEY|_API_KEY|AUTH_SECRET/i.test(rest);
  }
  return false;
}

export function envLikelyRequired(name: string, files: string[]): EnvLikelyRequired {
  const up = name.toUpperCase();
  if (up === "VERCEL_URL") return "platform_provided";
  if (up === "NODE_ENV") return "runtime_provided";
  if (up === "WEBHOOK_SECRET" || up.includes("SVIX")) return "required_for_webhook";
  if (up === "EMAIL_USER" || up === "EMAIL_PASS" || up.includes("SMTP")) return "required_for_email_feature";
  if (up === "DEBUG_PRISMA_QUERIES" || up.startsWith("DEBUG_")) return "optional_debug";
  if (up === "NAV_CACHE_SECONDS" || up === "PAGE_CACHE_SECONDS" || up.includes("CACHE")) return "optional_cache";
  if (up === "DEVELOPERDOC_DOC_GEN_V2" || up === "DEVELOPERDOC_DOC_GEN_V3") return "feature_flag";
  if (
    up === "DATABASE_URL" ||
    up === "DIRECT_URL" ||
    up === "CLERK_SECRET_KEY" ||
    up === "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY" ||
    up === "NEXT_PUBLIC_APP_URL" ||
    up.includes("AUTH_SECRET")
  ) {
    return "likely_required";
  }
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

export function classifyEnvForDocs(name: string): string {
  const up = name.toUpperCase();
  if (up.includes("DATABASE") || up === "DIRECT_URL" || up.includes("SHADOW_DATABASE")) return "database";
  if (up.includes("CLERK") || up.includes("WEBHOOK")) return "auth";
  if (up.includes("EMAIL") || up.includes("SMTP") || up.includes("MAIL")) return "email";
  if (up.includes("NAV_CACHE") || up.includes("PAGE_CACHE")) return "cache";
  if (up.includes("REDIS")) return "cache";
  if (up.includes("VERCEL") || up === "NODE_ENV") return "platform";
  if (up.includes("DEBUG") || up.startsWith("DEVELOPERDOC_")) return "feature_flag";
  if (up.includes("URL") || up.includes("HOST") || up.includes("DOMAIN")) return "url";
  if (/SECRET|PASSWORD|TOKEN|_KEY/i.test(up) && !isLikelySafeNextPublicName(name)) return "secret";
  return "unknown";
}

/** Safe presence in .env files — only empty vs non-empty, never values */
export function attachEnvValueStatus(
  entries: EnvUsageEntry[],
  envPresence: Map<string, "empty" | "non_empty">,
): EnvUsageEntry[] {
  return entries.map((e) => {
    const pres = envPresence.get(e.name);
    const codeRefs = e.files.filter((f) => f !== "(env-files)" && !/\.env/i.test(f));
    const onlyEnvMarker = e.files.length > 0 && e.files.every((f) => f === "(env-files)" || /\.env/i.test(f));
    let valueStatus: EnvValueStatusClass;
    if (pres === "non_empty") valueStatus = "present_non_empty";
    else if (pres === "empty") valueStatus = "present_empty";
    else if (codeRefs.length > 0) valueStatus = "missing_from_env_but_referenced";
    else if (onlyEnvMarker) valueStatus = "env_file_only";
    else valueStatus = "referenced_only";

    const scope = e.isPublic ? "public" : e.serverOnly ? "server-only" : "unknown";
    const safeNotes =
      e.isPublic && isLikelySafeNextPublicName(e.name)
        ? "Intended for browser / public embedding (framework convention)."
        : undefined;

    return {
      ...e,
      valueStatus,
      envClassification: classifyEnvForDocs(e.name),
      ...(safeNotes ? { safeNotes } : {}),
      scopeLabel: scope,
    };
  });
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
  let datasourceUrlEnv: string | undefined;
  let datasourceDirectUrlEnv: string | undefined;
  const ds = schemaContent.match(/datasource\s+\w+\s*\{/i);
  if (ds && ds.index !== undefined) {
    const block = extractBalancedBlock(schemaContent, ds.index);
    const inner = block?.body ?? "";
    const prov = /provider\s*=\s*(?:"([^"]+)"|(\w+))/i.exec(inner);
    const pv = prov?.[1] ?? prov?.[2];
    if (pv) datasourceProvider = pv;
    const urlM = /url\s*=\s*env\s*\(\s*["']([A-Za-z_][A-Za-z0-9_]*)["']\s*\)/i.exec(inner);
    if (urlM?.[1]) datasourceUrlEnv = urlM[1];
    const dirM = /directUrl\s*=\s*env\s*\(\s*["']([A-Za-z_][A-Za-z0-9_]*)["']\s*\)/i.exec(inner);
    if (dirM?.[1]) datasourceDirectUrlEnv = dirM[1];
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
    datasourceUrlEnv,
    datasourceDirectUrlEnv,
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
