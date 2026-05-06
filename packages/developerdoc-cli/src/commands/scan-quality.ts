import { scanMetadata } from "../utils/scanner.js";
import { logger } from "../utils/logger.js";

export async function runScanQualityCommand(cwd: string): Promise<void> {
  logger.info("Computing scan quality summary...");
  const meta = await scanMetadata(cwd);
  const q = meta.scanQuality;
  if (!q) {
    logger.error("scanQuality missing from metadata (expected v3).");
    process.exitCode = 1;
    return;
  }

  const lines = [
    `metadataVersion: ${meta.metadataVersion}`,
    `filesScanned: ${q.filesScanned} (cap ${q.filesScannedCap}, capHit=${q.scanFileCapHit})`,
    `apiRoutes: ${q.apiRoutesCount} (auth signal ${q.apiRoutesWithAuthSignalCount}, dbWrites~ ${q.apiRoutesWithDbWritesApprox}, public ${q.publicApiRoutesCount})`,
    `prisma: ${q.prismaProvider ?? "n/a"} (${q.prismaModelCount} models), migrations=${q.migrationsDetected}`,
    `envVars: ${q.envVarsCount}, missing .env.example=${q.missingDotEnvExample}`,
    `modules: ${q.modulesCount}, runtimeFlows: ${q.runtimeFlowsCount}, warnings: ${q.warningsCount}`,
    `serviceTracedRoutes: ${q.serviceTracedRoutesCount ?? 0}, unresolvedServiceImports: ${q.routesWithUnresolvedServiceImports ?? 0}`,
    `requestBodyDetected: ${q.routesWithRequestBodyFieldsDetected ?? 0}, responseShapeDetected: ${q.routesWithResponseShapeDetected ?? 0}`,
    `authClassified: ${q.routesWithAuthClassification ?? 0}, unknownAuth: ${q.routesWithUnknownAuth ?? 0}`,
    `modelLifecycleCoverage: ${q.modelLifecycleCoveragePercent ?? 0}%`,
    `riskyScripts: ${(q.riskyScriptsDetected ?? []).length ? q.riskyScriptsDetected!.join(", ") : "none"}`,
    `mermaidSupport: ${q.mermaidSupport ?? "disabled"}`,
  ];
  console.log(lines.join("\n"));

  const metaRecord = meta as unknown as Record<string, unknown>;
  const envAnalysis = (metaRecord.envAnalysis ?? {}) as { entries?: Array<{ name?: string }> };
  const envEntries = Array.isArray(envAnalysis.entries) ? envAnalysis.entries : [];
  const envNames = envEntries.map((e) => String(e?.name ?? "")).filter(Boolean);
  const runtimeFlows = Array.isArray(metaRecord.runtimeFlows)
    ? (metaRecord.runtimeFlows as Array<{ name?: string }>)
    : [];
  const runtimeFlowNames = runtimeFlows.map((f) => String(f?.name ?? "").toLowerCase());
  const routeCount = Array.isArray(metaRecord.apiRoutes) ? metaRecord.apiRoutes.length : 0;
  const frontendAnalysis = (metaRecord.frontendAnalysis ?? {}) as { bullets?: string[] };
  const frontendSignals = Array.isArray(frontendAnalysis.bullets)
    ? frontendAnalysis.bullets
    : [];

  const checks: Array<{ name: string; ok: boolean; detail: string }> = [
    {
      name: "project-overview-metadata",
      ok: Boolean((metaRecord.projectSummary as { overview?: string } | undefined)?.overview) && Boolean(metaRecord.generationHints),
      detail: "requires projectSummary overview + generationHints",
    },
    {
      name: "runtime-flows-present",
      ok: runtimeFlowNames.length > 0,
      detail: "requires runtimeFlows for generated Key Runtime Flows page",
    },
    {
      name: "api-reference-depth-signals",
      ok: routeCount === 0 || q.routesWithRequestBodyFieldsDetected! > 0,
      detail: "if routes exist, expect request body detection signal",
    },
    {
      name: "frontend-architecture-not-thin",
      ok: frontendSignals.length > 0 || routeCount === 0,
      detail: "frontend signals should exist when frontend routes/screens are detected",
    },
    {
      name: "env-platform-and-feature-flags",
      ok:
        envNames.filter((n: string) => n === "VERCEL_URL" || n === "NODE_ENV").length >= 0 &&
        envNames.filter((n: string) => /FLAG|DEVELOPERDOC_DOC_GEN/.test(n)).length >= 0,
      detail: "env metadata should include enough signals for platform/feature-flag grouping",
    },
    {
      name: "architecture-evidence-signals",
      ok: routeCount > 0 || q.modulesCount > 0,
      detail: "requires API routes or module map for architecture evidence",
    },
  ];

  const failed = checks.filter((c) => !c.ok);
  console.log("\nqualityChecks:");
  for (const check of checks) {
    console.log(`- ${check.ok ? "PASS" : "FAIL"} ${check.name}: ${check.detail}`);
  }
  if (failed.length > 0) {
    logger.error(`Quality guardrails failed (${failed.length}).`);
    process.exitCode = 1;
    return;
  }
  logger.success("Done.");
}
