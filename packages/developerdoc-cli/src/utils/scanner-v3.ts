import type { ApiRouteInfo, AuthProxyAnalysis, EnvUsageEntry, ModuleSummary, PrismaSchemaSummary } from "./scanner-semantic.js";

export type Confidence = "high" | "medium" | "low";

export interface ScanQualitySummary {
  metadataVersion: 3 | 4;
  filesScannedCap: number;
  filesScanned: number;
  scanFileCapHit: boolean;
  apiRoutesCount: number;
  apiRoutesWithAuthSignalCount: number;
  apiRoutesWithDbWritesApprox: number;
  publicApiRoutesCount: number;
  prismaProvider?: string;
  prismaModelCount: number;
  migrationsDetected: boolean;
  envVarsCount: number;
  missingDotEnvExample: boolean;
  modulesCount: number;
  runtimeFlowsCount: number;
  warningsCount: number;
  serviceTracedRoutesCount?: number;
  routesWithUnresolvedServiceImports?: number;
  routesWithRequestBodyFieldsDetected?: number;
  routesWithResponseShapeDetected?: number;
  routesWithAuthClassification?: number;
  routesWithUnknownAuth?: number;
  modelLifecycleCoveragePercent?: number;
  riskyScriptsDetected?: string[];
  mermaidSupport?: "enabled" | "disabled";
}

export interface ProjectSummaryV3 {
  overview: string;
  productAngle?: string;
  confidence: Confidence;
  warnings: string[];
}

export interface AuthAnalysisV3 {
  webUserAuth: string[];
  proxyMiddleware?: AuthProxyAnalysis;
  cliSyncAuth: string[];
  cliDeviceAuth: string[];
  webhookAuth: string[];
  publicPublishedRoutes: string[];
  notes: string[];
  confidence: Confidence;
}

export interface PrismaModelAnalysisV3 {
  name: string;
  businessMeaning: string;
  keyFieldsSample: string[];
  relationsSample: string[];
  usedByRoutesApprox: string[];
  confidence: Confidence;
}

export interface PrismaAnalysisV3 {
  datasourceProvider?: string;
  urlEnvVar?: string;
  directUrlEnvVar?: string;
  generatorProvider?: string;
  migrationsFolderPresent: boolean;
  models: PrismaModelAnalysisV3[];
  confidence: Confidence;
  warnings: string[];
}

export interface EnvAnalysisV3 {
  entries: EnvUsageEntry[];
  implicitFrameworkVars: string[];
  warnings: string[];
}

export interface SetupPlanV3 {
  prerequisites: string[];
  installCommand: string;
  envFileConvention: string;
  requiredVarNames: string[];
  databaseSteps: string[];
  authSteps: string[];
  emailNotes: string[];
  runLocally: string[];
  runLocallyNotes?: string[];
  cliLocalTest?: string[];
  verification: string[];
  troubleshooting: string[];
}

export interface RiskAnalysisV3 {
  items: Array<{
    severity: "info" | "needs_confirmation" | "recommended_improvement" | "risk";
    title: string;
    detail: string;
  }>;
}

export interface RuntimeFlowV3 {
  name: string;
  steps: string[];
  confidence: Confidence;
}

export interface GenerationHintsV3 {
  initialGenerationTrigger: string;
  regenerationNote: string;
  docGenFlags: string[];
}

function modelBusinessMeaning(name: string): string {
  const n = name.toLowerCase();
  const map: Record<string, string> = {
    user: "Application user (often mirrored from an auth provider such as Clerk).",
    project: "Workspace or folder owned by a user; groups documents, shares, and optional repo sync binding.",
    document: "Documentation container with ordered pages and sections; can be shared or published.",
    page: "A single page inside a document (ordering, title).",
    section: "A content block within a page (HTML, text, etc.).",
    share: "Invite / ACL linking email or user to a project or document.",
    publisheddocument: "Public slug and metadata for a published document.",
    cliauthsession: "Short-lived device-style session for CLI browser login.",
    docsyncproject: "Repository sync binding for a project (hashed sync token, repo metadata).",
    docsyncsnapshot: "Immutable repository scan payload from the CLI; feeds generated docs and drift analysis.",
    docsyncchange: "Incremental change record between scans.",
    docaisuggestion: "AI or generation audit row (e.g. initial documentation generation).",
  };
  return map[n] ?? `Domain model ${name} — confirm responsibilities in application code.`;
}

export function buildPrismaAnalysisV3(
  prisma: PrismaSchemaSummary | undefined,
  apiRoutes: ApiRouteInfo[],
): PrismaAnalysisV3 {
  const warnings: string[] = [];
  if (!prisma?.models?.length) {
    warnings.push("No Prisma models parsed — confirm prisma/schema.prisma exists and is readable.");
  }
  if (prisma && !prisma.migrationsFolderExists) {
    warnings.push("No prisma/migrations folder detected — team may use db push or migrations live elsewhere.");
  }

  const models: PrismaModelAnalysisV3[] = (prisma?.models ?? []).slice(0, 80).map((m) => {
    const lower = m.name.toLowerCase();
    const used = apiRoutes
      .filter((r) => {
        const blob = `${r.filePath}\n${r.prismaOperations?.join(" ") ?? ""}`;
        return blob.toLowerCase().includes(lower);
      })
      .map((r) => r.routePath)
      .slice(0, 8);
    return {
      name: m.name,
      businessMeaning: modelBusinessMeaning(m.name),
      keyFieldsSample: (m.fields ?? []).slice(0, 12),
      relationsSample: (m.relations ?? []).slice(0, 8),
      usedByRoutesApprox: used,
      confidence: used.length ? "high" : "medium",
    };
  });

  return {
    datasourceProvider: prisma?.datasourceProvider,
    urlEnvVar: prisma?.datasourceUrlEnv,
    directUrlEnvVar: prisma?.datasourceDirectUrlEnv,
    generatorProvider: prisma?.generatorProvider,
    migrationsFolderPresent: Boolean(prisma?.migrationsFolderExists),
    models,
    confidence: prisma?.datasourceProvider ? "high" : "medium",
    warnings,
  };
}

export function buildAuthAnalysisV3(proxy: AuthProxyAnalysis | undefined, apiRoutes: ApiRouteInfo[]): AuthAnalysisV3 {
  const notes: string[] = [];
  const cliSync = apiRoutes
    .filter((r) => r.routePath.includes("/api/cli/scan") || r.routePath.includes("/api/cli/changes"))
    .map((r) => r.routePath);
  const device = apiRoutes.filter((r) => r.routePath.includes("/api/cli/auth")).map((r) => r.routePath);
  const webhook = apiRoutes.filter((r) => r.routePath.includes("/webhooks/")).map((r) => r.routePath);
  const published = apiRoutes.filter((r) => r.routePath.startsWith("/api/published")).map((r) => r.routePath);

  const webRoutes = apiRoutes
    .filter(
      (r) =>
        (r.authType === "Clerk session" || r.authType === "Clerk session auth" || r.usesAuth) &&
        !r.routePath.includes("/api/cli/") &&
        !r.routePath.includes("/api/webhooks/") &&
        !r.routePath.startsWith("/api/published"),
    )
    .map((r) => r.routePath);

  if (!proxy) {
    notes.push("No root proxy.ts / middleware.ts captured — confirm Clerk middleware file path and matcher.");
  }

  return {
    webUserAuth: [
      "Server sessions via Clerk (auth/currentUser patterns in route handlers and RSC).",
      ...webRoutes.slice(0, 15),
    ],
    proxyMiddleware: proxy,
    cliSyncAuth: [
      "Project-linked sync token validated on /api/cli/scan and related endpoints (hashed server-side).",
      ...cliSync,
    ],
    cliDeviceAuth: [
      "Device-style flow: /api/cli/auth/start, poll, confirm returning cliAuthToken for linking.",
      ...device,
    ],
    webhookAuth: [...webhook],
    publicPublishedRoutes: [...published],
    notes,
    confidence: proxy ? "high" : "medium",
  };
}

export function buildRuntimeFlowsV3(apiRoutes: ApiRouteInfo[]): RuntimeFlowV3[] {
  const flows: RuntimeFlowV3[] = [];
  const hasCli = apiRoutes.some((r) => r.routePath.includes("/api/cli"));
  if (hasCli) {
    flows.push({
      name: "CLI init / link",
      steps: [
        "Entry: developersdoc init — writes .developerdoc/config.json.",
        "Optional: browser/device auth hits /api/cli/auth/* then /api/cli/register-from-auth.",
        "Or: POST /api/cli/register under Clerk session returns one-time sync token.",
      ],
      confidence: "medium",
    });
    flows.push({
      name: "CLI scan",
      steps: [
        "Entry: developersdoc scan — scanMetadata locally.",
        "POST /api/cli/scan with bearer/body token → validateSyncToken → DocSyncSnapshot.create.",
        "May call generateInitialDocumentationForSyncProject on first snapshot (single generated doc per project).",
      ],
      confidence: "high",
    });
  }
  flows.push({
    name: "Documentation rendering",
    steps: [
      "UI: app/docs/[[...slug]] loads document and pages from DB (nav cache in lib/db).",
      "Sections type html render via controlled HTML (sanitize in viewer).",
    ],
    confidence: "medium",
  });
  flows.push({
    name: "Publish & share",
    steps: [
      "Publish: document owner uses publish API → PublishedDocument row + public slug.",
      "Share routes may send email via SMTP when configured.",
    ],
    confidence: "low",
  });
  flows.push({
    name: "Webhook user sync",
    steps: [
      "POST /api/webhooks/clerk with Svix signature → upsert User rows.",
    ],
    confidence: "medium",
  });
  return flows;
}

export function buildRiskAnalysisV3(input: {
  missingDotEnvExample: boolean;
  migrationsPresent: boolean;
  rootBuildScript?: string;
  apiRoutes: ApiRouteInfo[];
  packageJsonHasTestScript: boolean;
  scanFileCapHit: boolean;
  prismaProvider?: string;
}): RiskAnalysisV3 {
  const items: RiskAnalysisV3["items"] = [];

  if (input.missingDotEnvExample) {
    items.push({
      severity: "recommended_improvement",
      title: "Missing .env.example",
      detail: "Add committed .env.example with variable names only to speed onboarding.",
    });
  }
  if (!input.migrationsPresent) {
    items.push({
      severity: "needs_confirmation",
      title: "No prisma/migrations in tree",
      detail: "May be intentional (db push) — confirm migration strategy for production.",
    });
  }
  if (input.rootBuildScript && /\|\|\s*true/.test(input.rootBuildScript)) {
    items.push({
      severity: "risk",
      title: "Build script masks failures",
      detail: "package.json build uses `|| true` — CI may pass when Next.js build failed.",
    });
  }

  const publicWriteRoutes = input.apiRoutes.filter(
    (r) => r.authType?.startsWith("public") && (r.sideEffectsNarrative?.some((x) => x.includes("writes")) ?? false),
  );
  if (publicWriteRoutes.length) {
    items.push({
      severity: "needs_confirmation",
      title: "Public routes with DB writes",
      detail: `Review: ${publicWriteRoutes
        .slice(0, 5)
        .map((r) => r.routePath)
        .join(", ")}`,
    });
  }

  const published = input.apiRoutes.find((r) => r.routePath.includes("/api/published/") && r.routePath.includes("["));
  if (published) {
    items.push({
      severity: "info",
      title: "Public published API",
      detail: "Published slug API is intentionally public — confirm no sensitive fields in JSON payloads.",
    });
  }

  if (input.scanFileCapHit) {
    items.push({
      severity: "needs_confirmation",
      title: "Scan file cap reached",
      detail: "Partial repo scan — metadata may omit routes/modules. Increase limits or narrow ignore rules.",
    });
  }

  if (!input.packageJsonHasTestScript) {
    items.push({
      severity: "recommended_improvement",
      title: "No root test script",
      detail: "Consider adding automated tests at repo root for CI confidence.",
    });
  }

  items.push({
    severity: "info",
    title: "Generated documentation regeneration",
    detail:
      "Initial generated doc is created once per project from latest snapshot; use product regenerate action after new scans to refresh pages.",
  });

  return { items };
}

export function buildSetupPlanV3(input: {
  packageManager: string;
  installCmd: string;
  devCmd: string | null;
  migrateCmd: string | null;
  prismaGenerateCmd: string | null;
  studioCmd?: string | null;
  clerkDetected: boolean;
  emailDetected: boolean;
  requiredEnvNames: string[];
  prismaUrlEnv?: string;
  prismaDirectEnv?: string;
  hasCliPackage: boolean;
  devScriptName?: string | null;
  buildScriptName?: string | null;
  startScriptName?: string | null;
}): SetupPlanV3 {
  const dbSteps: string[] = [];
  if (input.prismaUrlEnv) dbSteps.push(`Set ${input.prismaUrlEnv} and ${input.prismaDirectEnv ?? "DIRECT_URL"} for PostgreSQL.`);
  if (input.prismaGenerateCmd) dbSteps.push(`Run: ${input.prismaGenerateCmd}`);
  else dbSteps.push("Run: npx prisma generate");
  if (input.migrateCmd) dbSteps.push(`Apply schema: ${input.migrateCmd}`);
  else dbSteps.push("Apply schema: npx prisma db push (or add migrate script)");

  const cliLocal: string[] | undefined = input.hasCliPackage
    ? [
        "cd packages/developerdoc-cli",
        "npm run build",
        "npm run test",
        "npm link",
        "Run `developersdoc` from a sample repo",
      ]
    : undefined;

  return {
    prerequisites: [
      "Node.js (match engines in package.json if present)",
      "npm or detected package manager",
      "PostgreSQL (when using Prisma postgres provider)",
      ...(input.clerkDetected ? ["Clerk application (publishable + secret keys)"] : []),
      ...(input.emailDetected ? ["SMTP credentials for share-email testing"] : []),
    ],
    installCommand: input.installCmd,
    envFileConvention: "Use .env.local for Next.js secrets; never commit real values.",
    requiredVarNames: input.requiredEnvNames.slice(0, 40),
    databaseSteps: dbSteps,
    authSteps: input.clerkDetected
      ? [
          "Create Clerk app; add NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY and CLERK_SECRET_KEY.",
          "Configure sign-in/sign-up URLs to match your deployment.",
          "Optional: configure Clerk webhook + WEBHOOK_SECRET for user sync testing.",
        ]
      : ["Configure auth provider keys per your stack."],
    emailNotes: input.emailDetected
      ? ["EMAIL_USER / EMAIL_PASS (or provider-specific vars) only needed when testing outbound mail."]
      : [],
    runLocally: input.devScriptName
      ? [`npm run ${input.devScriptName}`, "Open http://localhost:3000 (or port shown in terminal)."]
      : input.devCmd
        ? [input.devCmd, "Open http://localhost:3000 (or port shown in terminal)."]
        : ["npm run dev"],
    runLocallyNotes: input.devScriptName && input.devCmd ? [`runs: ${input.devCmd}`] : undefined,
    cliLocalTest: cliLocal,
    verification: [
      "Sign in, create a project, link CLI, run scan.",
      "Confirm DocSyncSnapshot rows and generated documentation document.",
    ],
    troubleshooting: [
      "Prisma client errors: run prisma generate.",
      "Database URL errors: verify pooled vs direct URLs.",
      "Clerk errors: keys and redirect URLs must match environment.",
      "Generated doc stale: run regenerate from dashboard after upgrading scanner.",
    ],
  };
}

export function buildProjectSummaryV3(input: {
  framework: string;
  deps: string[];
  hasPrisma: boolean;
  hasClerk: boolean;
  hasCli: boolean;
  moduleCount: number;
}): ProjectSummaryV3 {
  const warnings: string[] = [];
  const bits: string[] = [];
  bits.push(`Framework signal: ${input.framework}.`);
  if (input.hasPrisma) bits.push("Uses Prisma for persistence.");
  if (input.hasClerk) bits.push("Clerk for web authentication.");
  if (input.hasCli) bits.push("Hosts or integrates Developerdoc-style CLI sync endpoints.");
  if (input.moduleCount === 0) warnings.push("Module map empty — check scan depth.");

  return {
    overview: bits.join(" "),
    productAngle: input.hasCli
      ? "Documentation platform with optional linked-repository scans and generated onboarding docs."
      : undefined,
    confidence: input.moduleCount > 0 ? "high" : "medium",
    warnings,
  };
}

export function buildScanQuality(input: {
  filesScanned: number;
  cap: number;
  apiRoutes: ApiRouteInfo[];
  prisma?: PrismaSchemaSummary;
  envUsage: EnvUsageEntry[];
  modules: ModuleSummary[];
  flows: RuntimeFlowV3[];
  missingDotEnvExample: boolean;
  warningsCount: number;
  metadataVersion?: 3 | 4;
  packageScriptsAnalysis?: {
    packages: Array<{
      packagePath: string;
      scripts: Record<string, string>;
    }>;
  };
}): ScanQualitySummary {
  const scanFileCapHit = input.filesScanned >= input.cap;
  const publicApi = input.apiRoutes.filter((r) => r.authType?.toLowerCase().startsWith("public")).length;
  const authSignal = input.apiRoutes.filter((r) => r.usesAuth || (r.authType && r.authType !== "unknown / verify handler")).length;
  const dbWrites = input.apiRoutes.filter((r) =>
    (r.prismaOperations ?? []).some((op) => /\.(create|update|upsert|delete|deleteMany)$/i.test(op)),
  ).length;

  const serviceTracedRoutesCount = input.apiRoutes.filter((r) => (r.importedServices?.length ?? 0) > 0).length;
  const routesWithUnresolvedServiceImports = input.apiRoutes.filter((r) =>
    (r.analysisNotes ?? []).some((n) => n.startsWith("unresolvedImports=")),
  ).length;
  const routesWithRequestBodyFieldsDetected = input.apiRoutes.filter((r) => (r.requestBodyFields?.length ?? 0) > 0).length;
  const routesWithResponseShapeDetected = input.apiRoutes.filter((r) => (r.responseFields?.length ?? 0) > 0).length;
  const routesWithAuthClassification = input.apiRoutes.filter((r) => Boolean(r.authType)).length;
  const routesWithUnknownAuth = input.apiRoutes.filter((r) =>
    String(r.authType ?? "").toLowerCase().includes("unknown"),
  ).length;
  const riskyScriptsDetected: string[] = [];
  for (const pkg of input.packageScriptsAnalysis?.packages ?? []) {
    for (const [key, val] of Object.entries(pkg.scripts)) {
      if (/build/i.test(key) && /\|\|\s*true/.test(val)) riskyScriptsDetected.push(`${pkg.packagePath}:${key}`);
    }
  }
  const modelLifecycleCoveragePercent =
    (input.prisma?.models?.length ?? 0) > 0
      ? Math.round(
          (input.prisma!.models.filter((m) =>
            input.apiRoutes.some((r) => (r.dbModelsTouched ?? []).some((x) => x.toLowerCase() === m.name.toLowerCase())),
          ).length /
            input.prisma!.models.length) *
            100,
        )
      : 0;

  return {
    metadataVersion: input.metadataVersion ?? 3,
    filesScannedCap: input.cap,
    filesScanned: input.filesScanned,
    scanFileCapHit,
    apiRoutesCount: input.apiRoutes.length,
    apiRoutesWithAuthSignalCount: authSignal,
    apiRoutesWithDbWritesApprox: dbWrites,
    publicApiRoutesCount: publicApi,
    prismaProvider: input.prisma?.datasourceProvider,
    prismaModelCount: input.prisma?.models?.length ?? 0,
    migrationsDetected: Boolean(input.prisma?.migrationsFolderExists),
    envVarsCount: input.envUsage.length,
    missingDotEnvExample: input.missingDotEnvExample,
    modulesCount: input.modules.length,
    runtimeFlowsCount: input.flows.length,
    warningsCount: input.warningsCount,
    serviceTracedRoutesCount,
    routesWithUnresolvedServiceImports,
    routesWithRequestBodyFieldsDetected,
    routesWithResponseShapeDetected,
    routesWithAuthClassification,
    routesWithUnknownAuth,
    modelLifecycleCoveragePercent,
    riskyScriptsDetected,
    mermaidSupport: "enabled",
  };
}

export function buildGenerationHintsV3(): GenerationHintsV3 {
  return {
    initialGenerationTrigger: "First successful /api/cli/scan may create one generated document per project (idempotent guards).",
    regenerationNote: "Subsequent scans store snapshots; refresh generated pages via dashboard regenerate or product API.",
    docGenFlags: ["DEVELOPERDOC_DOC_GEN_V2", "DEVELOPERDOC_DOC_GEN_V3"],
  };
}
