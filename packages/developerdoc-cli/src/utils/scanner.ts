import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import fg from "fast-glob";
import {
  type ApiRouteInfo,
  type DocFileSummary,
  type EnvUsageEntry,
  type FileClassification,
  type FileImportsSummary,
  type ModuleSummary,
  type PackageScriptsSummary,
  type PrismaSchemaSummary,
  type SetupHints,
  SEMANTIC_LIMITS,
  bucketClassifications,
  buildEnvUsageEntries,
  buildFileImportsSummary,
  analyzeAuthProxyFromSource,
  attachEnvValueStatus,
  classifyPath,
  detectAuthUsage,
  detectPackageManager,
  detectPrismaUsage,
  docTopicGuess,
  enrichApiRouteForV3,
  extractExportedHttpMethods,
  extractMarkdownTitle,
  extractImportedModuleSpecifiers,
  extractPackageScripts,
  extractEnvVarReferences,
  fileHasUseServer,
  inferPurposeFromRoute,
  inferRoutePathForApiFile,
  mergeEnvUsage,
  moduleKeyForFile,
  parsePrismaSchema,
  responsibilityBlurb,
  truncateSummary,
} from "./scanner-semantic.js";
import {
  buildAuthAnalysisV3,
  buildGenerationHintsV3,
  buildPrismaAnalysisV3,
  buildProjectSummaryV3,
  buildRiskAnalysisV3,
  buildRuntimeFlowsV3,
  buildScanQuality,
  buildSetupPlanV3,
} from "./scanner-v3.js";

const IGNORED = ["**/node_modules/**", "**/.git/**", "**/dist/**", "**/build/**", "**/.next/**"];
const MAX_FILE_TREE_ITEMS = 500;
const MAX_SCAN_FILES = 200;
const MAX_FILE_SIZE_BYTES = 1024 * 1024;
const FILE_TREE_DEPTH = 4;
const ENV_FILE_CANDIDATES = [
  ".env",
  ".env.local",
  ".env.development",
  ".env.development.local",
  ".env.production",
  ".env.production.local",
  ".env.test",
  ".env.test.local",
];

/** @public CLI ↔ API contract: keep v1 fields populated; v2 adds semantic analysis */
export interface ScanMetadata {
  framework: string;
  dependencies: string[];
  devDependencies: string[];
  fileTree: string[];
  envVars: string[];
  routes: Array<{ method: string; path: string }>;
  dbFiles: string[];
  authFiles: string[];
  deploymentFiles: string[];
  docsFiles: string[];

  metadataVersion: 2 | 3;
  filesByClassification: Partial<Record<FileClassification, string[]>>;
  apiRoutes: ApiRouteInfo[];
  envUsage: EnvUsageEntry[];
  packageScripts: PackageScriptsSummary;
  prismaSchema?: PrismaSchemaSummary;
  importantDocs: DocFileSummary[];
  moduleMap: ModuleSummary[];
  dependencyGraph: FileImportsSummary[];
  setupHints: SetupHints;

  /** v3 semantic buckets (present when metadataVersion === 3) */
  projectSummary?: import("./scanner-v3.js").ProjectSummaryV3;
  runtimeSurfaces?: string[];
  apiRouteAnalysis?: { summary: string; confidence: string };
  authAnalysis?: import("./scanner-v3.js").AuthAnalysisV3;
  prismaAnalysis?: import("./scanner-v3.js").PrismaAnalysisV3;
  envAnalysis?: import("./scanner-v3.js").EnvAnalysisV3;
  setupPlan?: import("./scanner-v3.js").SetupPlanV3;
  moduleAnalysis?: { modules: ModuleSummary[]; notes: string[] };
  frontendAnalysis?: { bullets: string[]; confidence: string };
  runtimeFlows?: import("./scanner-v3.js").RuntimeFlowV3[];
  riskAnalysis?: import("./scanner-v3.js").RiskAnalysisV3;
  generationHints?: import("./scanner-v3.js").GenerationHintsV3;
  scanQuality?: import("./scanner-v3.js").ScanQualitySummary;
}

function detectFramework(dependencies: Record<string, string> | undefined): string {
  if (!dependencies) {
    return "unknown";
  }
  if (dependencies.next) return "nextjs";
  if (dependencies.express) return "express";
  if (dependencies.nestjs || dependencies["@nestjs/core"]) return "nestjs";
  if (dependencies.fastify) return "fastify";
  if (dependencies.react) return "react";
  return "unknown";
}

async function readEnvFileVarNames(cwd: string): Promise<string[]> {
  const { keys } = await readEnvFileKeysWithPresence(cwd);
  return keys.sort();
}

/** Keys only; values never stored — tracks empty vs non-empty assignment */
async function readEnvFileKeysWithPresence(
  cwd: string,
): Promise<{ keys: string[]; presence: Map<string, "empty" | "non_empty"> }> {
  const presence = new Map<string, "empty" | "non_empty">();

  for (const envFile of ENV_FILE_CANDIDATES) {
    const envPath = path.join(cwd, envFile);
    const content = await readFile(envPath, "utf8").catch(() => "");
    if (!content) continue;

    for (const rawLine of content.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#")) continue;
      const normalized = line.startsWith("export ") ? line.slice(7).trim() : line;
      const match = normalized.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
      if (!match?.[1]) continue;
      const key = match[1];
      let rest = (match[2] ?? "").trim();
      if (
        (rest.startsWith('"') && rest.endsWith('"') && rest.length >= 2) ||
        (rest.startsWith("'") && rest.endsWith("'") && rest.length >= 2)
      ) {
        rest = rest.slice(1, -1).trim();
      }
      const nonEmpty = rest.length > 0;
      const nextStatus: "empty" | "non_empty" = nonEmpty ? "non_empty" : "empty";
      const prev = presence.get(key);
      if (prev === "non_empty" || nextStatus === "non_empty") presence.set(key, "non_empty");
      else presence.set(key, "empty");
    }
  }

  return { keys: Array.from(presence.keys()), presence };
}

export async function readDependencies(cwd: string): Promise<string[]> {
  const packagePath = path.join(cwd, "package.json");
  try {
    const content = await readFile(packagePath, "utf8");
    const pkg = JSON.parse(content) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    const merged = { ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) };
    return Object.keys(merged).sort();
  } catch {
    return [];
  }
}

function normalizeSeparators(relPath: string): string {
  return relPath.replace(/\\/g, "/");
}

function isApiRouteFile(relPath: string): boolean {
  const n = normalizeSeparators(relPath);
  const lower = n.toLowerCase();
  if (/\/route\.(tsx?|jsx?|mjs|cjs)$/u.test(lower)) {
    return (
      n.startsWith("app/") || n.startsWith("src/app/") || n.includes("/src/app/") || /\/app\//u.test(n)
    );
  }
  if (lower.startsWith("pages/api/") && /\.(tsx?|jsx?|mjs|cjs)$/u.test(lower)) return true;
  if (lower.startsWith("src/pages/api/") && /\.(tsx?|jsx?|mjs|cjs)$/u.test(lower)) return true;
  return false;
}

function buildLegacyRoutesFromApi(apiRoutes: ApiRouteInfo[]): Array<{ method: string; path: string }> {
  const out: Array<{ method: string; path: string }> = [];
  for (const r of apiRoutes) {
    const methods = r.methods.length ? r.methods : ["ANY"];
    for (const m of methods) {
      out.push({ method: m, path: r.routePath || r.filePath });
    }
  }
  return out.slice(0, MAX_FILE_TREE_ITEMS);
}

function buildModuleMap(allFiles: string[], depSummaries: FileImportsSummary[]): ModuleSummary[] {
  const modFiles = new Map<string, string[]>();
  for (const f of allFiles) {
    const k = moduleKeyForFile(f);
    if (!modFiles.has(k)) modFiles.set(k, []);
    const arr = modFiles.get(k)!;
    if (arr.length < SEMANTIC_LIMITS.MAX_FILES_PER_MODULE) {
      arr.push(normalizeSeparators(f));
    }
  }

  const pathToModule = (p: string) => moduleKeyForFile(p);

  const depsCross = new Map<string, Set<string>>();
  for (const d of depSummaries) {
    const fromMod = pathToModule(d.filePath);
    for (const int of d.internalImports) {
      const withExt =
        int.endsWith(".ts") || int.endsWith(".tsx") || int.endsWith(".js") || int.endsWith(".jsx") ? int : `${int}.tsx`;
      const toMod = pathToModule(withExt);
      if (toMod !== fromMod) {
        if (!depsCross.has(fromMod)) depsCross.set(fromMod, new Set());
        depsCross.get(fromMod)!.add(toMod);
      }
    }
  }

  return Array.from(modFiles.entries())
    .map(([module, keyFiles]) => ({
      module,
      keyFiles,
      detectedResponsibility: responsibilityBlurb(module),
      dependenciesFromOtherModules: Array.from(depsCross.get(module) ?? []).slice(
        0,
        SEMANTIC_LIMITS.MAX_MODULE_DEPS,
      ),
    }))
    .sort((a, b) => a.module.localeCompare(b.module))
    .slice(0, 80);
}

function buildSetupHints(params: {
  pkgPath: string;
  deps: string[];
  devDeps: string[];
  scripts: PackageScriptsSummary;
  prismaDetected: boolean;
  envUsage: EnvUsageEntry[];
  apiRoutes: ApiRouteInfo[];
}): SetupHints {
  const all = new Set([...params.deps, ...params.devDeps].map((s) => s.toLowerCase()));
  const clerkDetected = [...all].some((p) => p.includes("clerk"));
  const vercelDetected = [...all].some((p) => p.includes("vercel"));

  const requiredEnvVars = params.envUsage
    .filter((e) => e.likelyRequired === "likely_required")
    .map((e) => e.name);

  return {
    packageManager: detectPackageManager(params.pkgPath, (p) => existsSync(p)),
    databaseRequired: params.prismaDetected,
    migrationCommand: params.scripts.prismaMigrate,
    seedCommand: params.scripts.seed,
    clerkDetected: clerkDetected || undefined,
    vercelDetected: vercelDetected || undefined,
    requiredEnvVars: requiredEnvVars.slice(0, 40),
  };
}

async function loadImportantDocs(cwd: string, candidatePaths: string[]): Promise<DocFileSummary[]> {
  const scored = candidatePaths.map((p) => {
    const lower = p.toLowerCase();
    let score = 0;
    if (/readme/i.test(lower)) score += 100;
    if (lower.startsWith("docs/")) score += 40;
    if (/contributing|changelog|architecture|design/i.test(lower)) score += 25;
    score -= lower.split("/").length;
    return { p, score };
  });

  scored.sort((a, b) => b.score - a.score);

  const out: DocFileSummary[] = [];
  for (const { p } of scored.slice(0, SEMANTIC_LIMITS.MAX_DOC_FILES)) {
    const abs = path.join(cwd, p);
    const raw = await readFile(abs, "utf8").catch(() => "");
    if (!raw) continue;
    const title = extractMarkdownTitle(raw) || path.basename(p, path.extname(p));
    const summary = truncateSummary(raw.replace(/^#[^\n]+\n+/, ""));
    out.push({
      path: normalizeSeparators(p),
      title: title.slice(0, 200),
      summary,
      likelyTopic: docTopicGuess(title, p),
    });
  }
  return out;
}

async function loadAuthProxyAnalysis(
  cwd: string,
): Promise<ReturnType<typeof analyzeAuthProxyFromSource> | undefined> {
  const candidates = ["proxy.ts", "src/proxy.ts", "middleware.ts", "src/middleware.ts"];
  for (const c of candidates) {
    const p = path.join(cwd, c);
    if (!existsSync(p)) continue;
    const src = await readFile(p, "utf8").catch(() => "");
    if (src.trim()) return analyzeAuthProxyFromSource(src, c);
  }
  return undefined;
}

export async function scanMetadata(cwd: string): Promise<ScanMetadata> {
  const packagePath = path.join(cwd, "package.json");
  let dependenciesMap: Record<string, string> | undefined;
  let devDependenciesMap: Record<string, string> | undefined;
  let pkgScripts: Record<string, string> | undefined;
  let enginesNode: string | undefined;
  let prismaSeedCommand: string | undefined;
  let rootBuildScript: string | undefined;
  let rootHasTestScript = false;

  try {
    const content = await readFile(packagePath, "utf8");
    const pkg = JSON.parse(content) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
      scripts?: Record<string, string>;
      engines?: { node?: string };
      prisma?: { seed?: string };
    };
    dependenciesMap = pkg.dependencies ?? {};
    devDependenciesMap = pkg.devDependencies ?? {};
    pkgScripts = pkg.scripts ?? {};
    enginesNode = pkg.engines?.node;
    rootBuildScript = pkg.scripts?.build;
    rootHasTestScript = Boolean(pkg.scripts?.test);
    if (typeof pkg.prisma?.seed === "string" && pkg.prisma.seed.trim()) {
      prismaSeedCommand = pkg.prisma.seed.trim();
    }
  } catch {
    dependenciesMap = undefined;
    devDependenciesMap = undefined;
    pkgScripts = undefined;
  }

  let packageScripts = extractPackageScripts(pkgScripts);
  if (prismaSeedCommand && !packageScripts.seed) {
    packageScripts = { ...packageScripts, seed: prismaSeedCommand };
  }

  const fileTree = await fg(["**/*"], {
    cwd,
    onlyFiles: false,
    deep: FILE_TREE_DEPTH,
    dot: false,
    ignore: IGNORED,
    markDirectories: true,
  });

  const dbFiles = await fg(
    [
      "prisma/**/*",
      "**/*{schema,migration,seed,model}*.{prisma,sql,ts,js}",
      "**/*{db,database}*.{ts,tsx,js,jsx,sql,prisma}",
    ],
    { cwd, onlyFiles: true, deep: FILE_TREE_DEPTH + 3, ignore: IGNORED },
  );

  const authFiles = await fg(
    [
      "**/*{auth,clerk,session,middleware,oauth,jwt}*.{ts,tsx,js,jsx}",
      "app/**/sign-in/**/*",
      "app/**/sign-up/**/*",
      "api/**/{auth,login,signin,signup}/**/*",
    ],
    { cwd, onlyFiles: true, deep: FILE_TREE_DEPTH + 3, ignore: IGNORED },
  );

  const deploymentFiles = await fg(
    [
      "Dockerfile*",
      "docker-compose*.{yml,yaml}",
      "vercel.json",
      "netlify.toml",
      "render.yaml",
      ".github/workflows/*.{yml,yaml}",
      "**/*{deploy,release,ci,cd}*.{yml,yaml,ts,js,sh}",
    ],
    { cwd, onlyFiles: true, deep: FILE_TREE_DEPTH + 4, ignore: IGNORED },
  );

  const docsFiles = await fg(
    [
      "**/*.{md,mdx}",
      "docs/**/*",
      "**/*{readme,changelog,contributing,architecture}*",
    ],
    { cwd, onlyFiles: true, deep: FILE_TREE_DEPTH + 4, ignore: IGNORED },
  );

  const scanCandidates = await fg(["**/*.{js,jsx,ts,tsx,mjs,cjs}"], {
    cwd,
    onlyFiles: true,
    deep: FILE_TREE_DEPTH + 2,
    ignore: IGNORED,
  });

  const envUsageMap = new Map<string, Set<string>>();
  const { keys: envFileVarNames, presence: envKeyPresence } = await readEnvFileKeysWithPresence(cwd);
  for (const v of envFileVarNames) {
    mergeEnvUsage(envUsageMap, v, "(env-files)");
  }

  const apiRoutePaths = scanCandidates.filter(isApiRouteFile).slice(0, SEMANTIC_LIMITS.MAX_API_ROUTES_ANALYZED);
  const apiRoutes: ApiRouteInfo[] = [];

  for (const rel of apiRoutePaths) {
    const abs = path.join(cwd, rel);
    const content = await readFile(abs, "utf8").catch(() => "");
    if (!content || Buffer.byteLength(content, "utf8") > SEMANTIC_LIMITS.MAX_ROUTE_FILE_BYTES) continue;

    const routePath = inferRoutePathForApiFile(rel);
    const methods = extractExportedHttpMethods(content);
    const importedModules = extractImportedModuleSpecifiers(content);
    const envVarsReferenced = extractEnvVarReferences(content);
    for (const name of envVarsReferenced) {
      mergeEnvUsage(envUsageMap, name, rel);
    }

    const base: ApiRouteInfo = {
      filePath: normalizeSeparators(rel),
      routePath,
      methods,
      importedModules,
      envVarsReferenced,
      usesPrisma: detectPrismaUsage(content, importedModules),
      usesAuth: detectAuthUsage(content, importedModules),
      purpose: inferPurposeFromRoute(rel, methods, content),
    };
    apiRoutes.push(enrichApiRouteForV3(base, content));
  }

  const envVarMatchesFromScan = new Set<string>();
  for (const relativeFile of scanCandidates.slice(0, MAX_SCAN_FILES)) {
    const absoluteFile = path.join(cwd, relativeFile);
    const content = await readFile(absoluteFile, "utf8").catch(() => "");
    if (!content || Buffer.byteLength(content, "utf8") > MAX_FILE_SIZE_BYTES) continue;
    for (const name of extractEnvVarReferences(content)) {
      envVarMatchesFromScan.add(name);
      mergeEnvUsage(envUsageMap, name, relativeFile);
    }
  }

  const dependencyGraph: FileImportsSummary[] = [];
  const finalClassification = new Map<string, FileClassification>();

  for (const rel of scanCandidates.slice(0, SEMANTIC_LIMITS.MAX_DEEP_SCAN_FILES)) {
    const abs = path.join(cwd, rel);
    const content = await readFile(abs, "utf8").catch(() => "");
    if (!content || Buffer.byteLength(content, "utf8") > MAX_FILE_SIZE_BYTES) continue;

    let cls = classifyPath(rel);
    if (fileHasUseServer(content)) cls = "server_action";
    finalClassification.set(normalizeSeparators(rel), cls);

    if (dependencyGraph.length < SEMANTIC_LIMITS.MAX_IMPORT_GRAPH_FILES) {
      const summary = buildFileImportsSummary(normalizeSeparators(rel), content);
      dependencyGraph.push({
        filePath: summary.filePath,
        imports: summary.imports,
        internalImports: summary.internalImports,
        externalImports: summary.externalImports,
      });
    }
  }

  for (const rel of scanCandidates) {
    const n = normalizeSeparators(rel);
    if (!finalClassification.has(n)) {
      finalClassification.set(n, classifyPath(rel));
    }
  }

  const filesByClassification: Partial<Record<FileClassification, string[]>> = {};
  const countPer: Partial<Record<FileClassification, number>> = {};
  let classifiedTotal = 0;

  for (const [p, c] of finalClassification) {
    if (classifiedTotal >= SEMANTIC_LIMITS.MAX_CLASSIFIED_PATHS) break;
    if ((countPer[c] ?? 0) >= SEMANTIC_LIMITS.MAX_PER_CATEGORY) continue;
    if (!filesByClassification[c]) filesByClassification[c] = [];
    filesByClassification[c]!.push(p);
    countPer[c] = (countPer[c] ?? 0) + 1;
    classifiedTotal += 1;
  }

  let prismaSchema: PrismaSchemaSummary | undefined;
  const schemaPath = path.join(cwd, "prisma", "schema.prisma");
  if (existsSync(schemaPath)) {
    const schemaContent = await readFile(schemaPath, "utf8").catch(() => "");
    if (schemaContent) {
      const parsed = parsePrismaSchema(schemaContent);
      prismaSchema = {
        ...parsed,
        migrationsFolderExists: existsSync(path.join(cwd, "prisma", "migrations")),
      };
    }
  }

  const importantDocs = await loadImportantDocs(cwd, docsFiles);

  const moduleMap = buildModuleMap(
    scanCandidates.map((f) => normalizeSeparators(f)),
    dependencyGraph,
  );

  let envUsage = buildEnvUsageEntries(envUsageMap);
  envUsage = attachEnvValueStatus(envUsage, envKeyPresence);
  const legacyEnvVars = Array.from(
    new Set([...envFileVarNames, ...envVarMatchesFromScan, ...envUsage.map((e) => e.name)]),
  ).sort();

  const depsList = Object.keys(dependenciesMap ?? {}).sort();
  const devDepsList = Object.keys(devDependenciesMap ?? {}).sort();
  const prismaDetected =
    Boolean(prismaSchema) ||
    depsList.some((d) => d.toLowerCase().includes("prisma")) ||
    dbFiles.some((f) => f.toLowerCase().includes("prisma"));

  const setupHints: SetupHints = {
    ...buildSetupHints({
      pkgPath: cwd,
      deps: depsList,
      devDeps: devDepsList,
      scripts: packageScripts,
      prismaDetected,
      envUsage,
      apiRoutes,
    }),
    nodeEngine: enginesNode,
  };

  const authProxy = await loadAuthProxyAnalysis(cwd);
  const missingDotEnvExample = !existsSync(path.join(cwd, ".env.example"));
  const monorepoPackages = await fg("packages/*/package.json", { cwd, onlyFiles: true, ignore: IGNORED });
  const hasCliPackage = existsSync(path.join(cwd, "packages/developerdoc-cli/package.json"));
  const scanFileCapHit = scanCandidates.length > MAX_SCAN_FILES;
  const framework = detectFramework(dependenciesMap);
  const hasClerk =
    depsList.some((d) => d.toLowerCase().includes("clerk")) ||
    devDepsList.some((d) => d.toLowerCase().includes("clerk"));
  const hasCliApi = apiRoutes.some((r) => r.routePath.includes("/api/cli"));
  const emailDetected = depsList.some((d) => /nodemailer|smtp/i.test(d));

  const pm = detectPackageManager(cwd, (p) => existsSync(p));
  const installCmd =
    pm === "pnpm"
      ? "pnpm install"
      : pm === "yarn"
        ? "yarn install"
        : pm === "bun"
          ? "bun install"
          : "npm install";

  const prismaAnalysis = buildPrismaAnalysisV3(prismaSchema, apiRoutes);
  const authAnalysis = buildAuthAnalysisV3(authProxy, apiRoutes);
  const runtimeFlows = buildRuntimeFlowsV3(apiRoutes);
  const riskAnalysis = buildRiskAnalysisV3({
    missingDotEnvExample,
    migrationsPresent: Boolean(prismaSchema?.migrationsFolderExists),
    rootBuildScript,
    apiRoutes,
    packageJsonHasTestScript: rootHasTestScript,
    scanFileCapHit,
    prismaProvider: prismaSchema?.datasourceProvider,
  });
  const warningsCount =
    riskAnalysis.items.filter((i) => i.severity === "risk" || i.severity === "needs_confirmation").length +
    (scanFileCapHit ? 1 : 0);
  const scanQuality = buildScanQuality({
    filesScanned: Math.min(scanCandidates.length, MAX_SCAN_FILES),
    cap: MAX_SCAN_FILES,
    apiRoutes,
    prisma: prismaSchema,
    envUsage,
    modules: moduleMap,
    flows: runtimeFlows,
    missingDotEnvExample,
    warningsCount,
  });

  const setupPlan = buildSetupPlanV3({
    packageManager: pm,
    installCmd,
    devCmd: packageScripts.dev ?? null,
    migrateCmd: packageScripts.prismaMigrate ?? null,
    prismaGenerateCmd: packageScripts.prismaGenerate ?? null,
    clerkDetected: Boolean(setupHints.clerkDetected ?? hasClerk),
    emailDetected,
    // Prefer real local env files (.env*) as the source of required names.
    requiredEnvNames:
      envFileVarNames.length > 0
        ? envFileVarNames
        : setupHints.requiredEnvVars ?? [],
    prismaUrlEnv: prismaSchema?.datasourceUrlEnv,
    prismaDirectEnv: prismaSchema?.datasourceDirectUrlEnv,
    hasCliPackage,
  });

  const runtimeSurfaces = [
    "Next.js App Router UI",
    ...(hasCliApi ? ["REST API (app/api)", "CLI sync endpoints (/api/cli/*)"] : ["REST API (app/api)"]),
    ...(prismaSchema ? ["PostgreSQL via Prisma"] : ["Data layer (verify ORM)"]),
    ...(hasClerk ? ["Clerk web sessions"] : []),
    ...(monorepoPackages.length ? [`Monorepo packages (${monorepoPackages.length})`] : []),
  ];

  const fcKeys = filesByClassification;
  const frontendAnalysis = {
    bullets: [
      `Classified UI pages: ${(fcKeys.ui_page ?? []).length}; layouts: ${(fcKeys.layout ?? []).length}; components: ${(fcKeys.component ?? []).length}.`,
      "Marketing and docs app routes live under app/; verify app/docs for editor vs reader.",
      ...(authProxy?.frameworkMiddlewarePath
        ? [`Auth edge file: ${authProxy.frameworkMiddlewarePath}`]
        : []),
    ],
    confidence: "medium" as const,
  };

  return {
    framework,
    dependencies: depsList,
    devDependencies: devDepsList,
    fileTree: fileTree.slice(0, MAX_FILE_TREE_ITEMS),
    envVars: legacyEnvVars,
    routes: buildLegacyRoutesFromApi(apiRoutes),
    dbFiles: dbFiles.slice(0, MAX_FILE_TREE_ITEMS),
    authFiles: authFiles.slice(0, MAX_FILE_TREE_ITEMS),
    deploymentFiles: deploymentFiles.slice(0, MAX_FILE_TREE_ITEMS),
    docsFiles: docsFiles.slice(0, MAX_FILE_TREE_ITEMS),

    metadataVersion: 3,
    filesByClassification,
    apiRoutes,
    envUsage,
    packageScripts,
    prismaSchema,
    importantDocs,
    moduleMap,
    dependencyGraph,
    setupHints,

    projectSummary: buildProjectSummaryV3({
      framework,
      deps: depsList,
      hasPrisma: Boolean(prismaSchema),
      hasClerk,
      hasCli: hasCliApi,
      moduleCount: moduleMap.length,
    }),
    runtimeSurfaces,
    apiRouteAnalysis: {
      summary: `${apiRoutes.length} route handler file(s) analyzed with auth/DB/env heuristics.`,
      confidence: scanFileCapHit ? "medium" : "high",
    },
    authAnalysis,
    prismaAnalysis,
    envAnalysis: {
      entries: envUsage,
      implicitFrameworkVars: ["CLERK_SECRET_KEY", "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY"].filter(
        (n) => !envUsage.some((e) => e.name === n),
      ),
      warnings: missingDotEnvExample ? ["No .env.example — onboarding risk"] : [],
    },
    setupPlan,
    moduleAnalysis: {
      modules: moduleMap,
      notes: monorepoPackages.length ? [`Detected ${monorepoPackages.length} workspace package(s).`] : [],
    },
    frontendAnalysis,
    runtimeFlows,
    riskAnalysis,
    generationHints: buildGenerationHintsV3(),
    scanQuality,
  };
}

/** Re-export semantic utilities for consumers/tests */
export {
  bucketClassifications,
  classifyPath,
  inferRoutePathForApiFile,
  parsePrismaSchema,
  SEMANTIC_LIMITS,
} from "./scanner-semantic.js";

export type {
  ApiRouteInfo,
  DocFileSummary,
  EnvUsageEntry,
  FileClassification,
  FileImportsSummary,
  ModuleSummary,
  PackageScriptsSummary,
  PrismaSchemaSummary,
  SetupHints,
} from "./scanner-semantic.js";
