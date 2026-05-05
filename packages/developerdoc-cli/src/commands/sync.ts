import { runChangedCommand } from "./changed.js";
import { runScanCommand } from "./scan.js";

export async function runSyncCommand(cwd: string, silent = false): Promise<void> {
  await runScanCommand(cwd);
  await runChangedCommand(cwd, silent);
}
