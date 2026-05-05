import { readFile } from "node:fs/promises";
import path from "node:path";
import fg from "fast-glob";

const IGNORED = ["**/node_modules/**", "**/.git/**", "**/dist/**", "**/build/**", "**/.next/**"];
const MAX_FILE_TREE_ITEMS = 500;
const MAX_SCAN_FILES = 200;
const MAX_FILE_SIZE_BYTES = 1024 * 1024;
const FILE_TREE_DEPTH = 4;
const ENV_FILE_CANDIDATES = [
  ".env",
  ".env.local",
  ".env.development",
  ".env.development.local",
  ".env.production",
  ".env.production.local",
  ".env.test",
  ".env.test.local",
];

export interface ScanMetadata {
  framework: string;
  dependencies: string[];
  devDependencies: string[];
  fileTree: string[];
  envVars: string[];
  routes: Array<{ method: string; path: string }>;
  dbFiles: string[];
  authFiles: string[];
  deploymentFiles: string[];
  docsFiles: string[];
}

function detectFramework(dependencies: Record<string, string> | undefined): string {
  if (!dependencies) {
    return "unknown";
  }
  if (dependencies.next) return "nextjs";
  if (dependencies.express) return "express";
  if (dependencies.nestjs || dependencies["@nestjs/core"]) return "nestjs";
  if (dependencies.fastify) return "fastify";
  if (dependencies.react) return "react";
  return "unknown";
}

async function readEnvFileVarNames(cwd: string): Promise<string[]> {
  const names = new Set<string>();

  for (const envFile of ENV_FILE_CANDIDATES) {
    const envPath = path.join(cwd, envFile);
    const content = await readFile(envPath, "utf8").catch(() => "");
    if (!content) continue;

    for (const rawLine of content.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#")) continue;
      const normalized = line.startsWith("export ") ? line.slice(7).trim() : line;
      const match = normalized.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=/);
      if (match?.[1]) names.add(match[1]);
    }
  }

  return Array.from(names);
}

export async function readDependencies(cwd: string): Promise<string[]> {
  const packagePath = path.join(cwd, "package.json");
  try {
    const content = await readFile(packagePath, "utf8");
    const pkg = JSON.parse(content) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    const merged = { ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) };
    return Object.keys(merged).sort();
  } catch {
    return [];
  }
}

export async function scanMetadata(cwd: string): Promise<ScanMetadata> {
  const packagePath = path.join(cwd, "package.json");
  let dependenciesMap: Record<string, string> | undefined;
  let devDependenciesMap: Record<string, string> | undefined;
  try {
    const content = await readFile(packagePath, "utf8");
    const pkg = JSON.parse(content) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    dependenciesMap = pkg.dependencies ?? {};
    devDependenciesMap = pkg.devDependencies ?? {};
  } catch {
    dependenciesMap = undefined;
    devDependenciesMap = undefined;
  }

  const fileTree = await fg(["**/*"], {
    cwd,
    onlyFiles: false,
    deep: FILE_TREE_DEPTH,
    dot: false,
    ignore: IGNORED,
    markDirectories: true,
  });

  const routeFiles = await fg(["app/**/*", "pages/**/*", "api/**/*"], {
    cwd,
    onlyFiles: true,
    deep: FILE_TREE_DEPTH + 2,
    ignore: IGNORED,
  });

  const dbFiles = await fg(
    [
      "prisma/**/*",
      "**/*{schema,migration,seed,model}*.{prisma,sql,ts,js}",
      "**/*{db,database}*.{ts,tsx,js,jsx,sql,prisma}",
    ],
    { cwd, onlyFiles: true, deep: FILE_TREE_DEPTH + 3, ignore: IGNORED },
  );

  const authFiles = await fg(
    [
      "**/*{auth,clerk,session,middleware,oauth,jwt}*.{ts,tsx,js,jsx}",
      "app/**/sign-in/**/*",
      "app/**/sign-up/**/*",
      "api/**/{auth,login,signin,signup}/**/*",
    ],
    { cwd, onlyFiles: true, deep: FILE_TREE_DEPTH + 3, ignore: IGNORED },
  );

  const deploymentFiles = await fg(
    [
      "Dockerfile*",
      "docker-compose*.{yml,yaml}",
      "vercel.json",
      "netlify.toml",
      "render.yaml",
      ".github/workflows/*.{yml,yaml}",
      "**/*{deploy,release,ci,cd}*.{yml,yaml,ts,js,sh}",
    ],
    { cwd, onlyFiles: true, deep: FILE_TREE_DEPTH + 4, ignore: IGNORED },
  );

  const docsFiles = await fg(
    [
      "**/*.{md,mdx}",
      "docs/**/*",
      "**/*{readme,changelog,contributing,architecture}*",
    ],
    { cwd, onlyFiles: true, deep: FILE_TREE_DEPTH + 4, ignore: IGNORED },
  );

  const scanCandidates = await fg(["**/*.{js,jsx,ts,tsx,mjs,cjs}"], {
    cwd,
    onlyFiles: true,
    deep: FILE_TREE_DEPTH + 2,
    ignore: IGNORED,
  });

  const envVarMatches = new Set<string>();
  const envFileVarNames = await readEnvFileVarNames(cwd);
  const routeEntries: Array<{ method: string; path: string }> = [];

  for (const routeFile of routeFiles.slice(0, MAX_FILE_TREE_ITEMS)) {
    const normalized = routeFile.replace(/\\/g, "/");
    const methodMatch = normalized.match(/\/(GET|POST|PUT|PATCH|DELETE|OPTIONS|HEAD)\./i);
    const method = methodMatch?.[1]?.toUpperCase() ?? "ANY";
    routeEntries.push({ method, path: normalized });
  }

  for (const relativeFile of scanCandidates.slice(0, MAX_SCAN_FILES)) {
    const absoluteFile = path.join(cwd, relativeFile);
    const content = await readFile(absoluteFile, "utf8").catch(() => "");
    if (!content || Buffer.byteLength(content, "utf8") > MAX_FILE_SIZE_BYTES) continue;
    const regex = /process\.env\.([A-Z0-9_]+)/g;
    for (const match of content.matchAll(regex)) {
      if (match[1]) envVarMatches.add(match[1]);
    }
  }

  return {
    framework: detectFramework(dependenciesMap),
    dependencies: Object.keys(dependenciesMap ?? {}).sort(),
    devDependencies: Object.keys(devDependenciesMap ?? {}).sort(),
    fileTree: fileTree.slice(0, MAX_FILE_TREE_ITEMS),
    envVars: Array.from(new Set([...envFileVarNames, ...Array.from(envVarMatches)])).sort(),
    routes: routeEntries.slice(0, MAX_FILE_TREE_ITEMS),
    dbFiles: dbFiles.slice(0, MAX_FILE_TREE_ITEMS),
    authFiles: authFiles.slice(0, MAX_FILE_TREE_ITEMS),
    deploymentFiles: deploymentFiles.slice(0, MAX_FILE_TREE_ITEMS),
    docsFiles: docsFiles.slice(0, MAX_FILE_TREE_ITEMS),
  };
}
