import { spawn } from "node:child_process";
import prompts from "prompts";
import { pollCliAuth, startCliAuth } from "../utils/api.js";
import { logger } from "../utils/logger.js";

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

export async function runLoginCommand(): Promise<void> {
  const response = await prompts(
    {
      type: "text",
      name: "apiUrl",
      message: "DevelopersDoc app URL",
      initial: "https://developersdoc.com",
    },
    {
      onCancel: () => {
        throw new Error("Login cancelled.");
      },
    },
  );

  const apiUrl = response.apiUrl ?? "https://developersdoc.com";
  logger.info("Starting secure browser sign-in...");
  const authSession = await startCliAuth(apiUrl, { apiUrl });
  logger.info(`Open this URL to sign in: ${authSession.verificationUrl}`);

  const opened = tryOpenBrowser(authSession.verificationUrl);
  if (opened) {
    logger.info("A browser tab was opened automatically.");
  } else {
    logger.warn("Could not open browser automatically. Open the URL manually.");
  }

  logger.info("Waiting for authorization...");
  const pollDeadline = Date.now() + 10 * 60 * 1000;
  while (Date.now() < pollDeadline) {
    const result = await pollCliAuth(apiUrl, { deviceCode: authSession.deviceCode });
    if (result.status === "approved") {
      logger.success("Login successful.");
      logger.info("Run `developersdoc init` to link this repository.");
      logger.info("TODO: persist auth tokens in a secure local keychain store.");
      return;
    }
    if (result.status === "expired") {
      throw new Error("Authorization session expired. Run `developersdoc login` again.");
    }
    if (result.status === "used") {
      throw new Error("Authorization session already used. Run `developersdoc login` again.");
    }
    await sleep(2000);
  }

  throw new Error("Timed out waiting for authorization. Run `developersdoc login` again.");
}
