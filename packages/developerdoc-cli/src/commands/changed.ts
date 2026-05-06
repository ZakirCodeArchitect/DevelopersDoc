import { sendChanges } from "../utils/api.js";
import { readConfig, readState, writeState } from "../utils/config.js";
import { getChangedFiles, getHeadCommit } from "../utils/git.js";
import { logger } from "../utils/logger.js";

export async function runChangedCommand(cwd: string, silent = false): Promise<void> {
  const config = await readConfig(cwd);
  const state = await readState(cwd);
  const toCommit = await getHeadCommit(cwd);
  const fromCommit = state.lastSyncedCommit;

  if (!fromCommit) {
    if (!silent) {
      logger.warn("No lastSyncedCommit found. Run `developersdoc scan` first.");
    }
    await sendChanges(config, {
      changedFiles: [],
      fromCommit: null,
      toCommit,
    });
    await writeState(cwd, { lastSyncedCommit: toCommit });
    return;
  }

  const changedFiles = await getChangedFiles(cwd, fromCommit, toCommit);
  await sendChanges(config, {
    changedFiles,
    fromCommit,
    toCommit,
  });

  await writeState(cwd, { lastSyncedCommit: toCommit });
  if (!silent) {
    logger.success(`Synced ${changedFiles.length} changed file(s).`);
  }
}
