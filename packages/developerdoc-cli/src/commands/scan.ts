import { sendScan } from "../utils/api.js";
import { readConfig, writeState } from "../utils/config.js";
import { getCurrentBranch, getHeadCommit } from "../utils/git.js";
import { logger } from "../utils/logger.js";
import { scanMetadata } from "../utils/scanner.js";

export interface RunScanOptions {
  /** After `init`, drop any previous sync cursor so a failed first scan cannot leave a stale SHA from another link. */
  invalidateCursor?: boolean;
}

export async function runScanCommand(cwd: string, options: RunScanOptions = {}): Promise<void> {
  const config = await readConfig(cwd);
  if (options.invalidateCursor) {
    await writeState(cwd, { lastSyncedCommit: null });
  }
  logger.info("Scanning repository metadata...");

  const [branch, headCommit, metadata] = await Promise.all([
    getCurrentBranch(cwd),
    getHeadCommit(cwd),
    scanMetadata(cwd),
  ]);

  try {
    await sendScan(config, {
      branch,
      commitSha: headCommit,
      metadata,
      framework: metadata.framework,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown scan error";
    if (message.includes("Invalid sync credentials")) {
      throw new Error(
        "Your local CLI link is no longer valid (project was likely deleted/unlinked). Run `developerdoc init` again.",
      );
    }
    if (message.includes("Database temporarily unavailable")) {
      throw new Error("Developerdoc database is temporarily unavailable. Please retry scan in a moment.");
    }
    throw error;
  }

  await writeState(cwd, {
    lastSyncedCommit: headCommit,
  });

  logger.success(`Scan completed on ${branch} (${headCommit.slice(0, 8)}).`);
}
