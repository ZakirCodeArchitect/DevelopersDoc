#!/usr/bin/env node

import { Command } from "commander";
import { runChangedCommand } from "./commands/changed.js";
import { runInitCommand } from "./commands/init.js";
import { runInstallHookCommand } from "./commands/install-hook.js";
import { runLoginCommand } from "./commands/login.js";
import { runScanQualityCommand } from "./commands/scan-quality.js";
import { runScanCommand } from "./commands/scan.js";
import { runSyncCommand } from "./commands/sync.js";
import { logger } from "./utils/logger.js";

const program = new Command();
const cwd = process.cwd();

function wrap<TArgs extends unknown[]>(action: (...args: TArgs) => Promise<void>) {
  return async (...args: TArgs) => {
    try {
      await action(...args);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      logger.error(message);
      process.exitCode = 1;
    }
  };
}

program.name("developersdoc").description("DevelopersDoc sync CLI").version("0.1.0");

program
  .command("init")
  .description("Register and initialize project sync")
  .option("--manual", "Use the legacy manual projectId init flow")
  .action(wrap(async (options?: { manual?: boolean }) => runInitCommand(cwd, { manual: Boolean(options?.manual) })));

program.command("login").description("Authenticate with DevelopersDoc").action(wrap(() => runLoginCommand()));

program.command("scan").description("Scan and sync repository metadata").action(wrap(() => runScanCommand(cwd)));

program
  .command("scan-quality")
  .description("Print compact scan metadata quality summary (no full JSON)")
  .action(wrap(() => runScanQualityCommand(cwd)));

program
  .command("changed")
  .description("Sync only files changed since last sync")
  .option("--silent", "Suppress successful output")
  .action(wrap(async (options?: { silent?: boolean }) => runChangedCommand(cwd, Boolean(options?.silent))));

program
  .command("sync")
  .description("Run scan and changed sync together")
  .option("--silent", "Suppress successful output")
  .action(wrap(async (options?: { silent?: boolean }) => runSyncCommand(cwd, Boolean(options?.silent))));

program
  .command("install-hook")
  .description("Install git post-commit hook for developersdoc")
  .action(wrap(() => runInstallHookCommand(cwd)));

await program.parseAsync(process.argv);
