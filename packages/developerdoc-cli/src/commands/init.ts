import { appendFile, readFile, stat, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";
import prompts from "prompts";
import { registerFromAuth, registerProject, startCliAuth, pollCliAuth } from "../utils/api.js";
import { writeConfig, writeState } from "../utils/config.js";
import { logger } from "../utils/logger.js";
import { runScanCommand } from "./scan.js";

async function ensureConfigInGitIgnore(cwd: string): Promise<void> {
  const gitIgnorePath = path.join(cwd, ".gitignore");
  const entry = ".developerdoc/config.json";
  let existing = "";
  try {
    existing = await readFile(gitIgnorePath, "utf8");
  } catch {
    await writeFile(gitIgnorePath, "", "utf8");
  }

  if (!existing.includes(entry)) {
    const prefix = existing.endsWith("\n") || existing.length === 0 ? "" : "\n";
    await appendFile(gitIgnorePath, `${prefix}${entry}\n`, "utf8");
  }
}

interface InitOptions {
  manual?: boolean;
}

async function ensureRepositoryRoot(cwd: string): Promise<void> {
  const gitPath = path.join(cwd, ".git");
  try {
    await stat(gitPath);
  } catch {
    throw new Error("Run `developersdoc init` from the root of your target codebase (a folder with .git).");
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function tryOpenBrowser(url: string): boolean {
  const platform = process.platform;
  try {
    if (platform === "win32") {
      spawn("cmd", ["/c", "start", "", url], { detached: true, stdio: "ignore" }).unref();
      return true;
    }
    if (platform === "darwin") {
      spawn("open", [url], { detached: true, stdio: "ignore" }).unref();
      return true;
    }
    spawn("xdg-open", [url], { detached: true, stdio: "ignore" }).unref();
    return true;
  } catch {
    return false;
  }
}

async function runManualInit(
  apiUrl: string,
  defaultRepoName: string,
): Promise<{ projectId: string; syncProjectId: string; syncToken: string }> {
  const manualResponse = await prompts(
    [
      {
        type: "text",
        name: "projectId",
        message: "Project ID",
      },
      {
        type: "text",
        name: "repoName",
        message: "Repository name",
        initial: defaultRepoName,
      },
    ],
    {
      onCancel: () => {
        throw new Error("Initialization cancelled.");
      },
    },
  );

  if (!manualResponse.projectId) {
    throw new Error("projectId is required in manual mode.");
  }

  logger.info("Registering project...");
  const registration = await registerProject(apiUrl, {
    projectId: manualResponse.projectId,
    repoName: manualResponse.repoName || defaultRepoName,
  });

  return {
    projectId: manualResponse.projectId,
    syncProjectId: registration.syncProjectId,
    syncToken: registration.syncToken,
  };
}

export async function runInitCommand(cwd: string, options: InitOptions = {}): Promise<void> {
  await ensureRepositoryRoot(cwd);
  const defaultRepoName = path.basename(cwd);
  const response = await prompts(
    [
      {
        type: "text",
        name: "apiUrl",
        message: "DevelopersDoc app URL",
        initial: "https://developersdoc.com",
      },
      {
        type: "text",
        name: "projectName",
        message: "Project name",
        initial: defaultRepoName,
      },
      {
        type: "select",
        name: "privacyMode",
        message: "Privacy mode",
        choices: [{ title: "safe", value: "safe" }],
        initial: 0,
      },
    ],
    {
      onCancel: () => {
        throw new Error("Initialization cancelled.");
      },
    },
  );

  const apiUrl = response.apiUrl ?? "https://developersdoc.com";
  const projectName = (response.projectName || defaultRepoName) as string;
  const privacyMode = (response.privacyMode || "safe") as "safe";

  let projectId = "";
  let syncProjectId = "";
  let syncToken = "";

  if (options.manual) {
    const manualRegistration = await runManualInit(apiUrl, defaultRepoName);
    projectId = manualRegistration.projectId;
    syncProjectId = manualRegistration.syncProjectId;
    syncToken = manualRegistration.syncToken;
  } else {
    logger.info("Starting secure browser sign-in...");
    const authSession = await startCliAuth(apiUrl, { apiUrl });
    logger.info(`Open this URL to sign in and authorize CLI: ${authSession.verificationUrl}`);

    const opened = tryOpenBrowser(authSession.verificationUrl);
    if (opened) {
      logger.info("A browser tab was opened automatically.");
    } else {
      logger.warn("Could not open browser automatically. Open the URL manually.");
    }

    logger.info("Waiting for authorization...");
    const pollDeadline = Date.now() + 10 * 60 * 1000;
    let cliAuthToken: string | null = null;

    while (Date.now() < pollDeadline) {
      try {
        const result = await pollCliAuth(apiUrl, { deviceCode: authSession.deviceCode });
        if (result.status === "approved" && result.cliAuthToken) {
          cliAuthToken = result.cliAuthToken;
          break;
        }
        if (result.status === "expired") {
          throw new Error("Authorization session expired. Run `developersdoc init` again.");
        }
        if (result.status === "used") {
          throw new Error("Authorization session already used. Run `developersdoc init` again.");
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown polling error";
        if (message.includes("HTTP 404")) {
          throw new Error("Invalid device code for auth session.");
        }
        if (message.includes("HTTP 410")) {
          throw new Error("Authorization session expired. Run `developersdoc init` again.");
        }
        if (message.includes("HTTP 409")) {
          throw new Error("Authorization session already used. Run `developersdoc init` again.");
        }
        throw error;
      }

      await sleep(2000);
    }

    if (!cliAuthToken) {
      throw new Error("Timed out waiting for authorization. Run `developersdoc init` again.");
    }

    logger.info("Authorization approved. Registering project...");
    const registration = await registerFromAuth(apiUrl, {
      cliAuthToken,
      repoName: defaultRepoName,
      projectName,
      privacyMode,
    });
    projectId = registration.projectId;
    syncProjectId = registration.syncProjectId;
    syncToken = registration.syncToken;
  }

  await writeConfig(cwd, { apiUrl, projectId, syncProjectId, syncToken, privacyMode });

  await ensureConfigInGitIgnore(cwd);

  const scanPrompt = await prompts(
    {
      type: "confirm",
      name: "runScanNow",
      message: "Run first scan now?",
      initial: true,
    },
    {
      onCancel: () => ({ runScanNow: false }),
    },
  );

  if (scanPrompt.runScanNow) {
    await runScanCommand(cwd, { invalidateCursor: true });
  } else {
    await writeState(cwd, { lastSyncedCommit: null });
    logger.info("You can run the first scan later with `developersdoc scan`.");
  }

  logger.success("DevelopersDoc initialized successfully.");
}
