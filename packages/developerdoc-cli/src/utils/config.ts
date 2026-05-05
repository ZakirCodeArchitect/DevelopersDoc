import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export type PrivacyMode = "safe";

export interface DeveloperdocConfig {
  apiUrl: string;
  projectId: string;
  syncProjectId: string;
  syncToken: string;
  privacyMode: PrivacyMode;
}

export interface DeveloperdocState {
  lastSyncedCommit: string | null;
}

const CONFIG_DIR = ".developerdoc";
const CONFIG_FILE = "config.json";
const STATE_FILE = "state.json";

export function getConfigDir(cwd: string): string {
  return path.join(cwd, CONFIG_DIR);
}

export function getConfigPath(cwd: string): string {
  return path.join(getConfigDir(cwd), CONFIG_FILE);
}

export function getStatePath(cwd: string): string {
  return path.join(getConfigDir(cwd), STATE_FILE);
}

export async function ensureConfigDir(cwd: string): Promise<void> {
  await mkdir(getConfigDir(cwd), { recursive: true });
}

export async function writeConfig(cwd: string, config: DeveloperdocConfig): Promise<void> {
  await ensureConfigDir(cwd);
  await writeFile(getConfigPath(cwd), `${JSON.stringify(config, null, 2)}\n`, "utf8");
}

export async function readConfig(cwd: string): Promise<DeveloperdocConfig> {
  const raw = await readFile(getConfigPath(cwd), "utf8");
  return JSON.parse(raw) as DeveloperdocConfig;
}

export async function writeState(cwd: string, state: DeveloperdocState): Promise<void> {
  await ensureConfigDir(cwd);
  await writeFile(getStatePath(cwd), `${JSON.stringify(state, null, 2)}\n`, "utf8");
}

export async function readState(cwd: string): Promise<DeveloperdocState> {
  const raw = await readFile(getStatePath(cwd), "utf8");
  return JSON.parse(raw) as DeveloperdocState;
}
