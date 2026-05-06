import { chmod, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { logger } from "../utils/logger.js";

const START_MARKER = "# >>> developersdoc";
const END_MARKER = "# <<< developersdoc";
const HOOK_CONTENT = `${START_MARKER}
npx developersdoc changed --silent
${END_MARKER}`;

export async function runInstallHookCommand(cwd: string): Promise<void> {
  const hookPath = path.join(cwd, ".git", "hooks", "post-commit");
  await mkdir(path.dirname(hookPath), { recursive: true });

  let content = "";
  try {
    content = await readFile(hookPath, "utf8");
  } catch {
    content = "#!/bin/sh\n";
  }

  if (content.includes(START_MARKER) && content.includes(END_MARKER)) {
    logger.info("Developerdoc hook already installed.");
    return;
  }

  const separator = content.endsWith("\n") ? "" : "\n";
  const next = `${content}${separator}${HOOK_CONTENT}\n`;
  await writeFile(hookPath, next, "utf8");
  await chmod(hookPath, 0o755).catch(() => undefined);
  logger.success("Installed post-commit hook for Developerdoc.");
}
