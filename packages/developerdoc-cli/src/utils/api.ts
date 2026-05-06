import type { DeveloperdocConfig } from "./config.js";

interface ApiErrorBody {
  error?: string;
  message?: string;
}

function parseJsonSafe<T>(raw: string): T | null {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

async function parseError(response: Response): Promise<string> {
  const raw = await response.text();
  const body = parseJsonSafe<ApiErrorBody>(raw);
  if (body) {
    return body.error ?? body.message ?? `HTTP ${response.status}`;
  }

  const snippet = raw.slice(0, 120).replace(/\s+/g, " ").trim();
  return `HTTP ${response.status} (non-JSON response: ${snippet || "empty body"})`;
}

async function parseSuccess<TResponse>(response: Response): Promise<TResponse> {
  const raw = await response.text();
  const parsed = parseJsonSafe<TResponse>(raw);
  if (parsed) return parsed;

  const snippet = raw.slice(0, 120).replace(/\s+/g, " ").trim();
  throw new Error(
    `Request failed: Expected JSON but got non-JSON response (status ${response.status}). ` +
      `Check that DevelopersDoc app URL is correct and server is running. Response starts with: ${snippet || "empty body"}`,
  );
}

async function post<TResponse>(url: string, payload: unknown): Promise<TResponse> {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const message = await parseError(response);
    throw new Error(`Request failed: ${message}`);
  }

  return parseSuccess<TResponse>(response);
}


export interface RegisterResponse {
  projectId: string;
  syncProjectId: string;
  syncToken: string;
}

export async function registerProject(
  apiUrl: string,
  payload: { projectId: string; repoName: string },
): Promise<RegisterResponse> {
  return post<RegisterResponse>(new URL("/api/cli/register", apiUrl).toString(), payload);
}

export interface CliAuthStartResponse {
  deviceCode: string;
  userCode: string;
  verificationUrl: string;
  expiresAt: string;
}

export interface CliAuthPollResponse {
  status: "pending" | "approved" | "expired" | "used";
  cliAuthToken?: string;
}

export async function startCliAuth(
  apiUrl: string,
  payload?: { apiUrl?: string },
): Promise<CliAuthStartResponse> {
  return post<CliAuthStartResponse>(new URL("/api/cli/auth/start", apiUrl).toString(), payload ?? {});
}

export async function pollCliAuth(
  apiUrl: string,
  payload: { deviceCode: string },
): Promise<CliAuthPollResponse> {
  return post<CliAuthPollResponse>(new URL("/api/cli/auth/poll", apiUrl).toString(), payload);
}

export async function registerFromAuth(
  apiUrl: string,
  payload: {
    cliAuthToken: string;
    repoName: string;
    projectName?: string;
    privacyMode?: string;
  },
): Promise<RegisterResponse> {
  return post<RegisterResponse>(new URL("/api/cli/register-from-auth", apiUrl).toString(), payload);
}

export async function sendScan(
  config: DeveloperdocConfig,
  payload: Record<string, unknown>,
): Promise<void> {
  await post(new URL("/api/cli/scan", config.apiUrl).toString(), {
    ...payload,
    syncProjectId: config.syncProjectId,
    syncToken: config.syncToken,
  });
}

export async function sendChanges(
  config: DeveloperdocConfig,
  payload: { changedFiles: string[]; fromCommit: string | null; toCommit: string },
): Promise<void> {
  await post(new URL("/api/cli/changes", config.apiUrl).toString(), {
    ...payload,
    syncProjectId: config.syncProjectId,
    syncToken: config.syncToken,
  });
}
