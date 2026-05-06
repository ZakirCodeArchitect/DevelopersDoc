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
  ];
  console.log(lines.join("\n"));
  logger.success("Done.");
}
