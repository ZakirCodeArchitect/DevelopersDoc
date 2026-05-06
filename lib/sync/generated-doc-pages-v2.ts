/**
 * Rich generated documentation from CLI scan metadata v2.
 * HTML fragments are joined per section for dangerouslySetInnerHTML (see DocsPageContent).
 */

type JsonRecord = Record<string, unknown>;

function toObject(value: unknown): JsonRecord {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return value as JsonRecord;
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
}

function unique<T>(values: T[]): T[] {
  return Array.from(new Set(values));
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function listItems(items: string[], emptyFallback: string): string {
  if (items.length === 0) return `<p><em>${escapeHtml(emptyFallback)}</em></p>`;
  return `<ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`;
}

function toPageSection(title: string, blocks: string[]) {
  return {
    title,
    type: 'html' as const,
    content: blocks,
  };
}

/** Few large HTML sections per page — avoids SQLite / Prisma nested-create parameter limits (100s of Section rows per Page used to fail the transaction silently). */
function buildModulesOverviewHtml(modules: ModuleRecord[]): string {
  if (modules.length === 0) return '<p><em>No module map in metadata.</em></p>';
  const blocks = modules.slice(0, 35).map((m) => {
    const name = escapeHtml(m.module ?? '?');
    const resp = escapeHtml(m.detectedResponsibility ?? '');
    const files = escapeHtml((m.keyFiles ?? []).slice(0, 8).join(', ') || '—');
    const deps = escapeHtml((m.dependenciesFromOtherModules ?? []).slice(0, 15).join(', ') || '');
    return `<div class="mb-6 border-b border-gray-100 pb-4"><h3 class="text-lg font-semibold">${name}</h3><p class="text-sm text-gray-700">${resp}</p><p class="text-xs mt-1"><strong>Example files:</strong> ${files}</p>${deps ? `<p class="text-xs mt-1"><strong>Cross-module deps:</strong> ${deps}</p>` : ''}</div>`;
  });
  return `<div class="space-y-1">${blocks.join('')}</div>`;
}

function buildApiRoutesTableHtml(routes: ApiRouteRecord[]): string {
  const rows = routes.slice(0, 80).map((r) => {
    const methods =
      Array.isArray(r.methods) && r.methods.length > 0 ? r.methods.join(', ') : 'NONE_DETECTED';
    const auth = r.usesAuth ? 'Likely auth' : '—';
    const db = r.usesPrisma ? 'Yes' : '—';
    const envs = Array.isArray(r.envVarsReferenced)
      ? escapeHtml(r.envVarsReferenced.slice(0, 8).join(', '))
      : '—';
    const purpose = escapeHtml(r.purpose ?? '—');
    const routePath = escapeHtml(r.routePath ?? '');
    const filePath = escapeHtml(r.filePath ?? '');
    const fx = escapeHtml(sideEffectsLine(r));
    return `<tr><td class="border p-2 align-top"><code>${escapeHtml(methods)}</code></td><td class="border p-2 align-top"><code>${routePath}</code></td><td class="border p-2 align-top text-xs"><code>${filePath}</code></td><td class="border p-2 align-top text-xs">${purpose}</td><td class="border p-2 align-top text-xs">${auth}</td><td class="border p-2 align-top text-xs">${db}</td><td class="border p-2 align-top text-xs">${envs}</td><td class="border p-2 align-top text-xs">${fx}</td></tr>`;
  });
  return `<div class="overflow-x-auto"><table class="min-w-full text-xs border-collapse border border-gray-200"><thead><tr class="bg-gray-100"><th class="border p-2 text-left">Methods</th><th class="border p-2 text-left">Route</th><th class="border p-2 text-left">File</th><th class="border p-2 text-left">Purpose</th><th class="border p-2 text-left">Auth</th><th class="border p-2 text-left">DB</th><th class="border p-2 text-left">Env</th><th class="border p-2 text-left">Side effects</th></tr></thead><tbody>${rows}</tbody></table></div>`;
}

function sideEffectsLine(r: ApiRouteRecord): string {
  const bits: string[] = [];
  if (r.usesPrisma) bits.push('DB');
  if (r.usesAuth) bits.push('auth');
  const env = Array.isArray(r.envVarsReferenced) ? r.envVarsReferenced.length : 0;
  if (env) bits.push(`env×${env}`);
  return bits.length ? bits.join('; ') : '—';
}

function buildPrismaModelsCombinedHtml(models: PrismaModelRecord[]): string {
  if (models.length === 0) return '<p><em>No models in prisma schema snapshot.</em></p>';
  const blocks = models.slice(0, 60).map((model) => {
    const title = escapeHtml(model.name ?? 'Model');
    const role = escapeHtml(inferBusinessRole(model.name ?? ''));
    const fields = escapeHtml((model.fields ?? []).slice(0, 40).join(', ') || '—');
    const rel = escapeHtml((model.relations ?? []).slice(0, 12).join('; ') || '—');
    return `<div class="mb-6 border-b border-gray-100 pb-4"><h3 class="text-lg font-semibold">${title}</h3><p class="text-sm"><strong>Role:</strong> ${role}</p><p class="text-xs mt-2"><strong>Fields:</strong> ${fields}</p><p class="text-xs mt-1"><strong>Relations:</strong> ${rel}</p></div>`;
  });
  return `<div class="space-y-1">${blocks.join('')}</div>`;
}

type ApiRouteRecord = {
  filePath?: string;
  routePath?: string;
  methods?: string[];
  purpose?: string;
  usesAuth?: boolean;
  usesPrisma?: boolean;
  envVarsReferenced?: string[];
  importedModules?: string[];
};

type EnvUsageRecord = {
  name?: string;
  files?: string[];
  isPublic?: boolean;
  serverOnly?: boolean;
  likelyRequired?: string;
  likelyPurpose?: string;
  nextPublicSecretWarning?: string;
};

type ModuleRecord = {
  module?: string;
  keyFiles?: string[];
  detectedResponsibility?: string;
  dependenciesFromOtherModules?: string[];
};

type PrismaModelRecord = {
  name?: string;
  fields?: string[];
  relations?: string[];
};

type DocFileRecord = {
  path?: string;
  title?: string;
  summary?: string;
  likelyTopic?: string;
};

/** When false, initial doc generation uses legacy templates even for v2 snapshots. */
export function isDocGenV2Enabled(): boolean {
  return process.env.DEVELOPERDOC_DOC_GEN_V2 !== 'false';
}

/** Use semantic v2 page builder when flag allows and CLI declared metadataVersion 2. */
export function shouldUseBuildGeneratedPagesV2(metadataInput: unknown): boolean {
  if (!isDocGenV2Enabled()) return false;
  const m = toObject(metadataInput);
  return m.metadataVersion === 2;
}

function lowerDeps(metadata: JsonRecord): string[] {
  const d = toStringArray(metadata.dependencies).map((x) => x.toLowerCase());
  const dev = toStringArray(metadata.devDependencies).map((x) => x.toLowerCase());
  return unique([...d, ...dev]);
}

function parseApiRoutes(metadata: JsonRecord): ApiRouteRecord[] {
  const raw = metadata.apiRoutes;
  if (!Array.isArray(raw)) return [];
  return raw.filter((r): r is ApiRouteRecord => r !== null && typeof r === 'object');
}

function parseEnvUsage(metadata: JsonRecord): EnvUsageRecord[] {
  const raw = metadata.envUsage;
  if (!Array.isArray(raw)) return [];
  return raw.filter((r): r is EnvUsageRecord => r !== null && typeof r === 'object');
}

function parseModuleMap(metadata: JsonRecord): ModuleRecord[] {
  const raw = metadata.moduleMap;
  if (!Array.isArray(raw)) return [];
  return raw.filter((r): r is ModuleRecord => r !== null && typeof r === 'object');
}

function parsePrismaModels(metadata: JsonRecord): PrismaModelRecord[] {
  const ps = metadata.prismaSchema;
  if (!ps || typeof ps !== 'object' || Array.isArray(ps)) return [];
  const models = (ps as JsonRecord).models;
  if (!Array.isArray(models)) return [];
  return models.filter((m): m is PrismaModelRecord => m !== null && typeof m === 'object');
}

function parseImportantDocs(metadata: JsonRecord): DocFileRecord[] {
  const raw = metadata.importantDocs;
  if (!Array.isArray(raw)) return [];
  return raw.filter((r): r is DocFileRecord => r !== null && typeof r === 'object');
}

function filesByCategory(metadata: JsonRecord): Record<string, string[]> {
  const fc = metadata.filesByClassification;
  if (!fc || typeof fc !== 'object' || Array.isArray(fc)) return {};
  return fc as Record<string, string[]>;
}

function stackSentence(depsLower: string[], framework: string): string {
  const parts: string[] = [];
  if (framework && framework !== 'unknown') parts.push(escapeHtml(framework));
  if (depsLower.some((p) => p.includes('next'))) parts.push('Next.js');
  if (depsLower.some((p) => p.includes('react'))) parts.push('React');
  if (depsLower.some((p) => p.includes('prisma'))) parts.push('Prisma ORM');
  if (depsLower.some((p) => p.includes('clerk'))) parts.push('Clerk');
  if (depsLower.some((p) => p.includes('@tiptap'))) parts.push('Tiptap editor');
  if (depsLower.some((p) => p.includes('tailwind'))) parts.push('Tailwind CSS');
  return parts.length > 0 ? parts.join(', ') : '<em>No dominant stack markers in dependency names.</em>';
}

function detectCliSyncSignals(apiRoutes: ApiRouteRecord[], modules: ModuleRecord[]): boolean {
  const pathHits = apiRoutes.some(
    (r) =>
      (typeof r.routePath === 'string' && r.routePath.includes('/api/cli')) ||
      (typeof r.filePath === 'string' && r.filePath.includes('api/cli'))
  );
  const modHits = modules.some((m) => {
    const name = typeof m.module === 'string' ? m.module : '';
    return /cli|sync|developerdoc/i.test(name);
  });
  return pathHits || modHits;
}

function detectPublishSignals(apiRoutes: ApiRouteRecord[], fc: Record<string, string[]>): boolean {
  const routes = apiRoutes.some(
    (r) =>
      (typeof r.routePath === 'string' && /publish/i.test(r.routePath)) ||
      (typeof r.filePath === 'string' && /published|publish/i.test(r.filePath))
  );
  const files = Object.entries(fc).flatMap(([k, v]) => v.map((p) => `${k}:${p}`));
  const pathStr = files.join('\n');
  return routes || /published|Publish/i.test(pathStr);
}

function inferBusinessRole(modelName: string): string {
  const n = modelName.toLowerCase();
  if (n.includes('user') || n.includes('account')) return 'Identity / accounts';
  if (n.includes('session') || n.includes('token')) return 'Sessions or tokens';
  if (n.includes('doc') || n.includes('page') || n.includes('document')) return 'Documentation content';
  if (n.includes('project')) return 'Project/workspace grouping';
  if (n.includes('share') || n.includes('permission')) return 'Sharing or access control';
  return 'Domain entity — confirm with product context';
}

function groupEnvByPurpose(entries: EnvUsageRecord[]): Record<string, EnvUsageRecord[]> {
  const map: Record<string, EnvUsageRecord[]> = {};
  for (const e of entries) {
    const purpose = typeof e.likelyPurpose === 'string' && e.likelyPurpose.trim() ? e.likelyPurpose.trim() : 'Other';
    if (!map[purpose]) map[purpose] = [];
    map[purpose].push(e);
  }
  return map;
}

function buildEnvTableHtml(entries: EnvUsageRecord[]): string {
  if (entries.length === 0) {
    return '<p><em>No environment variable usage was captured. Re-run <code>developerdoc scan</code> after adding code that references <code>process.env.*</code>.</em></p>';
  }
  const rows = entries.slice(0, 60).map((e) => {
    const name = escapeHtml(e.name ?? '?');
    const scope =
      e.isPublic === true ? 'Public (NEXT_PUBLIC_*)' : e.serverOnly !== false ? 'Server-only' : 'Unknown';
    const purpose = escapeHtml(e.likelyPurpose ?? '—');
    const files = escapeHtml((e.files ?? []).slice(0, 5).join(', ') || '—');
    const req = escapeHtml(e.likelyRequired ?? 'unknown');
    const warn = e.nextPublicSecretWarning
      ? `<span class="text-amber-700">${escapeHtml(e.nextPublicSecretWarning)}</span>`
      : '—';
    return `<tr><td><code>${name}</code></td><td>${escapeHtml(scope)}</td><td>${purpose}</td><td><small>${files}</small></td><td>${req}</td><td>${warn}</td></tr>`;
  });
  return `<div class="overflow-x-auto"><table class="min-w-full border-collapse border border-gray-300 text-sm"><thead><tr class="bg-gray-100"><th class="border p-2 text-left">Name</th><th class="border p-2 text-left">Scope</th><th class="border p-2 text-left">Likely purpose</th><th class="border p-2 text-left">Files (sample)</th><th class="border p-2 text-left">Req/opt</th><th class="border p-2 text-left">Warning</th></tr></thead><tbody>${rows.join('')}</tbody></table></div>`;
}

export function buildGeneratedPagesV2(metadataInput: unknown, detectedFramework?: string | null) {
  const metadata = toObject(metadataInput);
  const framework =
    (typeof metadata.framework === 'string' && metadata.framework) || detectedFramework || 'unknown';
  const deps = unique(toStringArray(metadata.dependencies));
  const devDeps = unique(toStringArray(metadata.devDependencies));
  const depsLower = lowerDeps(metadata);

  const apiRoutes = parseApiRoutes(metadata);
  const envUsage = parseEnvUsage(metadata);
  const moduleMap = parseModuleMap(metadata);
  const prismaModels = parsePrismaModels(metadata);
  const prismaSchema = metadata.prismaSchema;
  const prismaObj = prismaSchema && typeof prismaSchema === 'object' && !Array.isArray(prismaSchema) ? prismaSchema : null;
  const migrationsExist =
    prismaObj && typeof (prismaObj as JsonRecord).migrationsFolderExists === 'boolean'
      ? (prismaObj as JsonRecord).migrationsFolderExists === true
      : false;
  const datasourceProvider =
    prismaObj && typeof (prismaObj as JsonRecord).datasourceProvider === 'string'
      ? ((prismaObj as JsonRecord).datasourceProvider as string)
      : undefined;

  const importantDocs = parseImportantDocs(metadata);
  const fc = filesByCategory(metadata);
  const authFiles = unique(toStringArray(metadata.authFiles)).slice(0, 40);
  const deploymentFiles = unique(toStringArray(metadata.deploymentFiles)).slice(0, 30);
  const docsFiles = unique(toStringArray(metadata.docsFiles)).slice(0, 30);

  const scripts = metadata.packageScripts as JsonRecord | undefined;
  const hints = metadata.setupHints as JsonRecord | undefined;

  const pm =
    hints && typeof hints.packageManager === 'string' ? (hints.packageManager as string) : 'unknown';
  const installCmd =
    pm === 'pnpm'
      ? 'pnpm install'
      : pm === 'yarn'
        ? 'yarn install'
        : pm === 'bun'
          ? 'bun install'
          : 'npm install';

  const devCmd = scripts && typeof scripts.dev === 'string' ? (scripts.dev as string) : null;
  const buildCmd = scripts && typeof scripts.build === 'string' ? (scripts.build as string) : null;
  const startCmd = scripts && typeof scripts.start === 'string' ? (scripts.start as string) : null;
  const lintCmd = scripts && typeof scripts.lint === 'string' ? (scripts.lint as string) : null;
  const migrateCmd =
    (hints && typeof hints.migrationCommand === 'string' && hints.migrationCommand) ||
    (scripts && typeof scripts.prismaMigrate === 'string' && scripts.prismaMigrate) ||
    null;
  const seedCmd =
    (hints && typeof hints.seedCommand === 'string' && hints.seedCommand) ||
    (scripts && typeof scripts.seed === 'string' && scripts.seed) ||
    null;

  const nodeEngine = hints && typeof hints.nodeEngine === 'string' ? hints.nodeEngine : '';
  const clerkDetected =
    depsLower.some((d) => d.includes('clerk')) ||
    (hints && hints.clerkDetected === true) ||
    authFiles.some((f) => f.toLowerCase().includes('clerk'));
  const vercelDetected = depsLower.some((d) => d.includes('vercel')) || hints?.vercelDetected === true;
  const emailDetected = depsLower.some((d) => d.includes('nodemailer') || d.includes('smtp'));
  const cacheDetected = depsLower.some((d) => d.includes('redis') || d.includes('ioredis'));

  const uiPages = fc.ui_page ?? [];
  const layouts = fc.layout ?? [];
  const components = fc.component ?? [];
  const apiClass = fc.api_route ?? [];
  const middlewareFiles = fc.middleware ?? [];
  const serverActions = fc.server_action ?? [];

  const usesAppRouter =
    uiPages.some((p) => p.includes('app/') || p.includes('/app/')) ||
    apiClass.some((p) => p.includes('app/'));
  const usesPagesRouter = apiRoutes.some((r) => typeof r.filePath === 'string' && r.filePath.startsWith('pages/'));

  const hasEditorSignals = depsLower.some((d) => d.includes('@tiptap') || d.includes('prosemirror'));
  const hasDocsViewerSignals =
    hasEditorSignals ||
    moduleMap.some((m) => typeof m.module === 'string' && /docs|editor|tiptap/i.test(m.module));

  const syncDetected = detectCliSyncSignals(apiRoutes, moduleMap);
  const publishDetected = detectPublishSignals(apiRoutes, fc);
  const cliScanRoute = apiRoutes.find(
    (r) => typeof r.routePath === 'string' && r.routePath.includes('/api/cli')
  );

  const capabilities: string[] = [];
  if (apiRoutes.length > 0) capabilities.push(`${apiRoutes.length} API route handler file(s) analyzed`);
  if (moduleMap.length > 0)
    capabilities.push(`${moduleMap.length} module bucket(s) mapped from folder structure`);
  if (importantDocs.length > 0) capabilities.push(`${importantDocs.length} existing markdown/doc file(s) summarized`);
  if (prismaModels.length > 0) capabilities.push(`Prisma schema with ${prismaModels.length} model(s)`);
  if (clerkDetected) capabilities.push('Clerk authentication packages or files present');

  const entryPoints: string[] = [];
  if (cliScanRoute?.routePath) entryPoints.push(`CLI sync endpoint: <code>${escapeHtml(cliScanRoute.routePath)}</code>`);
  uiPages.slice(0, 6).forEach((p) => entryPoints.push(`UI page file: <code>${escapeHtml(p)}</code>`));
  if (entryPoints.length === 0)
    entryPoints.push(
      '<em>No ui_page or /api/cli routes were classified — scanner depth or ignore rules may need adjustment.</em>'
    );

  const architectureAscii = [
    ' +-------------+         +------------------+',
    ' |   Browser   | ------> |  Next.js (app)   |',
    ' +-------------+         +------------------+',
    '                                |',
    '                   +------------+------------+',
    '                   |            |            |',
    '             +-----v----+  +----v-----+  +---v----------+',
    '             |  route   |  | layouts |  | components   |',
    '             | handlers |  | / pages |  | (UI layers)  |',
    '             +-----+----+  +---------+  +--------------+',
    '                   |',
    usesAppRouter ? '                   +--> App Router segments under app/' : '                   +--> See file paths in metadata',
    prismaModels.length > 0 ? '             +-----v-----+\n             |  Prisma   |\n             +-----+-----+\n                   |\n             +-----v-----+\n             | Database  |\n             +-----------+' : '',
  ]
    .filter(Boolean)
    .join('\n');

  const mermaidSource = [
    'flowchart LR',
    '  U[Client] --> N[Next.js]',
    '  N --> R[Route handlers]',
    prismaModels.length > 0 ? '  N --> P[Prisma Client]' : '',
    prismaModels.length > 0 ? '  P --> D[(Database)]' : '',
  ]
    .filter(Boolean)
    .join('\n');

  // --- Page 1 ---
  const page1 = {
    title: 'Project Overview',
    sections: [
      toPageSection('', [
        `<p>This page is generated from <strong>semantic scan metadata v2</strong> (file classification, API routes, env usage, Prisma, modules). It is only as accurate as the last <code>developerdoc scan</code>.</p>`,
      ]),
      toPageSection('What this project appears to be', [
        `<p>Dependency signals suggest: ${stackSentence(depsLower, framework)}.</p>`,
        importantDocs.length > 0
          ? `<p>Existing docs titles sampled: ${importantDocs
              .slice(0, 5)
              .map((d) => `<strong>${escapeHtml(d.title ?? d.path ?? '')}</strong>`)
              .join(', ')}.</p>`
          : '<p><em>No prioritized markdown files were summarized — scanner did not find README/docs candidates within limits.</em></p>',
      ]),
      toPageSection('Detected stack', [
        `<p><strong>Framework field:</strong> ${escapeHtml(framework)}</p>`,
        `<p><strong>dependencies (sample):</strong></p>`,
        listItems(deps.slice(0, 20), 'dependencies[] empty in snapshot'),
        `<p><strong>devDependencies (sample):</strong></p>`,
        listItems(devDeps.slice(0, 20), 'devDependencies[] empty in snapshot'),
      ]),
      toPageSection('Main capabilities (from scan)', [listItems(capabilities, 'No capability bullets — metadata may be incomplete.')]),
      toPageSection('Important entry points', [`<ul>${entryPoints.map((e) => `<li>${e}</li>`).join('')}</ul>`]),
      toPageSection('Repository scan & documentation sync', [
        syncDetected
          ? '<p><strong>Developerdoc-style sync is present</strong> in this codebase: an <code>/api/cli</code> route and/or sync-related modules were detected. Typical flow: local <code>developerdoc scan</code> posts metadata to your hosted app, which stores a <code>DocSyncSnapshot</code> and may trigger generated documentation.</p>'
          : '<p><em>No /api/cli route or sync module bucket was detected in this snapshot. If this project uses Developerdoc CLI linking, re-scan after ensuring API routes are not excluded.</em></p>',
      ]),
    ],
  };

  // --- Page 2 ---
  const page2 = {
    title: 'Architecture Overview',
    sections: [
      toPageSection('', [
        `<p><strong>Boundary:</strong> ${
          usesAppRouter
            ? 'Next.js App Router is indicated by <code>app/</code> UI and route handler paths.'
            : 'App Router not clearly indicated from classified paths.'
        } API handlers run on the server; UI routes use React server/client components depending on file content (not fully detected statically).</p>`,
      ]),
      toPageSection('Major modules', [
        moduleMap.length > 0
          ? `<ul>${moduleMap
              .slice(0, 25)
              .map(
                (m) =>
                  `<li><strong>${escapeHtml(m.module ?? '?')}</strong> — ${escapeHtml(m.detectedResponsibility ?? '')}</li>`
              )
              .join('')}</ul>`
          : '<p><em>moduleMap empty — scanner needs more files or deeper glob depth.</em></p>',
      ]),
      toPageSection(
        'Data flow (summary)',
        [
          prismaModels.length > 0
            ? '<p>Data persistence goes through <strong>Prisma</strong> to the configured datasource (see Database page). API routes that import Prisma may read/write during requests.</p>'
            : '<p><em>No Prisma models in snapshot — database layer unclear.</em></p>',
          clerkDetected
            ? '<p>Authentication flows through <strong>Clerk</strong> (packages/files detected); session is validated on the server for protected routes.</p>'
            : '<p><em>No Clerk signal in this snapshot.</em></p>',
        ].filter((s) => s.length > 0)
      ),
      toPageSection('Diagrams', [
        `<pre class="whitespace-pre-wrap font-mono text-xs bg-gray-50 p-4 rounded border border-gray-200">${escapeHtml(architectureAscii)}</pre>`,
        `<p><strong>Mermaid</strong> (renderer may not execute — paste into a Mermaid viewer if needed):</p>`,
        `<pre class="whitespace-pre-wrap font-mono text-xs bg-gray-50 p-4 rounded border border-gray-200">${escapeHtml(mermaidSource)}</pre>`,
      ]),
    ],
  };

  const envByPurpose = groupEnvByPurpose(envUsage);
  const setupPrereq = [
    nodeEngine ? `Node.js version constraint from package.json: <code>${escapeHtml(nodeEngine)}</code>` : null,
    `Package manager (from lockfiles): <strong>${escapeHtml(pm)}</strong>`,
    prismaModels.length > 0 || datasourceProvider
      ? `Database: Prisma datasource ${datasourceProvider ? `<code>${escapeHtml(datasourceProvider)}</code>` : 'unknown'}`
      : null,
    clerkDetected ? 'Clerk dashboard keys required for auth' : null,
  ].filter(Boolean) as string[];

  const troubleshooting: string[] = [];
  if (clerkDetected)
    troubleshooting.push(
      'Clerk: verify publishable/secret keys, authorized redirect URLs, and middleware matcher paths vs routes.'
    );
  if (prismaModels.length > 0 || migrationsExist)
    troubleshooting.push(
      `Prisma: confirm DATABASE_URL/DIRECT_URL match local DB; migrations folder ${migrationsExist ? 'present' : 'not flagged present'} in scan.`
    );
  if (vercelDetected) troubleshooting.push('Vercel: align env vars between local .env and project settings.');
  if (emailDetected) troubleshooting.push('Email: SMTP-related deps detected — verify mail env vars in non-dev environments.');
  if (cacheDetected) troubleshooting.push('Cache: Redis-related deps detected — ensure cache URL env vars for deployed environments.');

  // --- Page 3 ---
  const page3 = {
    title: 'Local Setup Guide',
    sections: [
      toPageSection('Prerequisites', [listItems(setupPrereq, 'No engine or DS hints — add engines.node in package.json for clearer docs.')]),
      toPageSection('Install dependencies', [
        `<p>Recommended install for detected manager:</p><pre class="bg-gray-50 p-3 rounded border"><code>${escapeHtml(installCmd)}</code></pre>`,
      ]),
      toPageSection('Environment file', [
        `<p>Create <code>.env.local</code> (or your team standard) and declare keys <strong>without committing secrets</strong>. Names inferred by scan:</p>`,
        listItems(
          envUsage.slice(0, 40).map((e) => e.name ?? ''),
          'Run developerdoc scan after references exist in code'
        ),
      ]),
      ...(Object.keys(envByPurpose).length > 0
        ? Object.entries(envByPurpose).map(([purpose, arr]) =>
            toPageSection(`Environment — ${purpose}`, [
              listItems(
                arr.map((e) => `${e.name ?? ''} (${e.likelyRequired ?? 'unknown'})`),
                'empty group'
              ),
            ])
          )
        : [
            toPageSection('Required env vars by purpose', [
              '<p><em>No env usage grouped — run scan or ensure process.env references exist in code.</em></p>',
            ]),
          ]),
      toPageSection('Database', [
        prismaModels.length > 0
          ? `<p>Prisma schema detected with ${prismaModels.length} model(s). Configure database URLs before migrate.</p>`
          : '<p><em>No Prisma models in metadata — skip DB steps if not applicable.</em></p>',
        migrateCmd
          ? `<p>Migration command from scripts/hints:</p><pre class="bg-gray-50 p-3 rounded border"><code>${escapeHtml(migrateCmd)}</code></pre>`
          : '<p><em>No prisma migrate script captured — add a script or run prisma migrate manually.</em></p>',
        seedCmd
          ? `<p>Seed command:</p><pre class="bg-gray-50 p-3 rounded border"><code>${escapeHtml(seedCmd)}</code></pre>`
          : '<p><em>No seed script detected in package scripts or prisma.seed.</em></p>',
      ]),
      toPageSection('Run locally', [
        devCmd
          ? `<pre class="bg-gray-50 p-3 rounded border"><code>${escapeHtml(devCmd)}</code></pre>`
          : '<p><em>No dev script in metadata — check package.json.</em></p>',
        `<p>Verify: open the app root URL (often <code>http://localhost:3000</code>) and hit a known page or API route listed in the API Reference page.</p>`,
      ]),
      toPageSection('Troubleshooting', [listItems(troubleshooting, 'No provider-specific troubleshooting signals.')]),
    ],
  };

  // --- Page 4 ---
  const page4 = {
    title: 'Folder & Module Structure',
    sections: [
      toPageSection('', [
        '<p>Grouped by scanner module buckets — not a raw file tree. Limits apply per module to keep payloads small.</p>',
      ]),
      toPageSection('Modules overview', [buildModulesOverviewHtml(moduleMap)]),
    ],
  };

  // --- Page 5 ---
  const page5 = {
    title: 'API Reference',
    sections: [
      toPageSection('', [
        `<p>Only <strong>real route handler files</strong> from metadata.apiRoutes (${apiRoutes.length} entries). Not UI routes.</p>`,
      ]),
      ...(apiRoutes.length > 0
        ? [toPageSection('Route handlers (table)', [buildApiRoutesTableHtml(apiRoutes)])]
        : [
            toPageSection('Missing data', [
              '<p><em>No apiRoutes in snapshot. Ensure App Router <code>route.ts</code> / Pages API files exist and are not gitignored from scan depth.</em></p>',
            ]),
          ]),
    ],
  };

  const prismaMeta = prismaObj as JsonRecord | null;
  const enumsBlock =
    prismaMeta && Array.isArray(prismaMeta.enums)
      ? (prismaMeta.enums as { name?: string; values?: string[] }[])
          .slice(0, 20)
          .map((en) => `<li><strong>${escapeHtml(en.name ?? '')}</strong>: ${escapeHtml((en.values ?? []).join(', '))}</li>`)
          .join('')
      : '';

  // --- Page 6 ---
  const page6 = {
    title: 'Database & Data Model',
    sections: [
      toPageSection(
        '',
        [
          prismaModels.length > 0
            ? `<p>Prisma datasource: <code>${escapeHtml(datasourceProvider ?? 'unknown')}</code>. Migrations directory flag: <strong>${migrationsExist ? 'present' : 'not detected or absent'}</strong>.</p>`
            : '<p><em>No prismaSchema.models in metadata — run scan with prisma/schema.prisma present.</em></p>',
          enumsBlock ? `<p><strong>Enums:</strong></p><ul>${enumsBlock}</ul>` : '',
        ].filter((s) => s.length > 0)
      ),
      toPageSection('Models', [buildPrismaModelsCombinedHtml(prismaModels)]),
    ],
  };

  const protectedRouteHints = apiRoutes
    .filter((r) => r.usesAuth)
    .map((r) => r.routePath ?? r.filePath)
    .filter(Boolean) as string[];

  // --- Page 7 ---
  const page7 = {
    title: 'Authentication & Authorization',
    sections: [
      toPageSection('Provider', [
        clerkDetected
          ? '<p><strong>Clerk</strong> is indicated by dependencies and/or auth-related files.</p>'
          : '<p><em>No Clerk-specific dependency lock-in detected — verify NextAuth or custom auth in source.</em></p>',
      ]),
      toPageSection('Middleware', [
        middlewareFiles.length > 0
          ? listItems(middlewareFiles, '')
          : '<p><em>No middleware.ts classified — scanner may skip root if depth limits apply.</em></p>',
      ]),
      toPageSection('Auth-related files (paths)', [listItems(authFiles, 'None listed')]),
      toPageSection('Routes with auth signals in handler', [
        protectedRouteHints.length > 0
          ? listItems(protectedRouteHints.slice(0, 30), '')
          : '<p><em>No API routes flagged usesAuth — handlers may still protect via layout or server-only checks.</em></p>',
      ]),
      toPageSection('Session flow', [
        clerkDetected
          ? '<p>Typical Clerk + Next.js App Router flow: browser obtains session via Clerk-hosted pages; server components and route handlers call Clerk server APIs or <code>auth()</code> patterns (exact API depends on version).</p>'
          : '<p><em>Session mechanics not inferred — inspect auth package docs for this repo.</em></p>',
      ]),
      toPageSection('Roles / permissions', [
        '<p><em>Role matrices are not extracted by the scanner today. To document RBAC, add explicit exports or comments, or extend the CLI analyzer.</em></p>',
      ]),
    ],
  };

  // --- Page 8 ---
  const page8 = {
    title: 'Frontend Architecture',
    sections: [
      toPageSection('Router', [
        `<p><strong>App Router evidence:</strong> ${usesAppRouter ? 'yes (classified app/ paths)' : 'weak or absent'}.</p>`,
        `<p><strong>Pages Router evidence:</strong> ${usesPagesRouter ? 'yes (pages/ api or legacy paths)' : 'not dominant in API metadata'}.</p>`,
      ]),
      toPageSection('Layouts, pages, components (counts from classification)', [
        `<ul>`,
        `<li><strong>ui_page:</strong> ${uiPages.length} path(s) sampled</li>`,
        `<li><strong>layout:</strong> ${layouts.length}</li>`,
        `<li><strong>component:</strong> ${components.length}</li>`,
        `<li><strong>loading_state / error_boundary:</strong> ${(fc.loading_state ?? []).length} / ${(fc.error_boundary ?? []).length}</li>`,
        `</ul>`,
      ]),
      toPageSection('Key UI modules', [
        moduleMap
          .filter((m) => typeof m.module === 'string' && /component|app\/|ui/i.test(m.module))
          .slice(0, 12)
          .map((m) => `<p><strong>${escapeHtml(m.module!)}</strong> — ${escapeHtml(m.detectedResponsibility ?? '')}</p>`)
          .join('') || '<p><em>No component-dedicated module buckets matched.</em></p>',
      ]),
      toPageSection('Docs / editor surfaces', [
        hasDocsViewerSignals
          ? '<p>Tiptap / docs-related signals detected — likely rich-text editing for documentation content.</p>'
          : '<p><em>No Tiptap/docs module signals — scanner may need broader dependency list.</em></p>',
      ]),
      toPageSection('Server vs client components', [
        `<p><strong>Server actions files classified:</strong> ${serverActions.length}.`,
        ` Full RSC vs client boundaries require AST analysis — not fully determined here.</p>`,
      ]),
    ],
  };

  const docGenModule = moduleMap.some((m) => /doc-generation|generated-doc/i.test(m.module ?? ''));
  const syncModule = moduleMap.some((m) => /sync/i.test(m.module ?? ''));

  // --- Page 9 ---
  const page9 = {
    title: 'Key Runtime Flows',
    sections: [
      toPageSection('CLI scan → hosted snapshot', [
        syncDetected || cliScanRoute
          ? `<ol>
              <li>Run <code>developerdoc scan</code> in the linked repo (CLI sends branch, commit, metadata).</li>
              <li>POST to <code>/api/cli/scan</code> (or equivalent) with sync credentials.</li>
              <li>Server persists JSON metadata on <code>DocSyncSnapshot</code>.</li>
            </ol>`
          : '<p><em>Flow not grounded — /api/cli routes missing from snapshot.</em></p>',
      ]),
      toPageSection('Generated documentation', [
        docGenModule || syncModule
          ? '<p>After first snapshot, server may invoke generated documentation (see <code>generateInitialDocumentationForSyncProject</code> in this codebase pattern).</p>'
          : '<p><em>doc-generation module not detected in moduleMap — may still exist outside scanned paths.</em></p>',
      ]),
      toPageSection('Publish', [
        publishDetected
          ? '<p>Publish-related routes or <code>published</code> paths appeared — review publish API and UI for production checklist.</p>'
          : '<p><em>No publish routes detected in apiRoutes classification.</em></p>',
      ]),
      toPageSection('Authentication', [
        clerkDetected
          ? '<p>Users authenticate via Clerk; middleware and/or server handlers gate access — align with routes listed under Authentication page.</p>'
          : '<p><em>Auth flow not specific enough from metadata alone.</em></p>',
      ]),
    ],
  };

  const ciFiles = deploymentFiles.filter((f) => f.includes('.github/workflows'));
  const vercelFile = deploymentFiles.some((f) => f.includes('vercel.json'));

  // --- Page 10 ---
  const page10 = {
    title: 'Deployment & Operations',
    sections: [
      toPageSection('Target', [
        vercelDetected || vercelFile
          ? '<p><strong>Vercel</strong> is likely based on deps or <code>vercel.json</code>.</p>'
          : '<p><em>No strong Vercel signal — confirm hosting separately.</em></p>',
      ]),
      toPageSection('Build', [
        buildCmd
          ? `<pre class="bg-gray-50 p-3 rounded border"><code>${escapeHtml(buildCmd)}</code></pre>`
          : '<p><em>No build script captured.</em></p>',
        startCmd
          ? `<p>Production start:</p><pre class="bg-gray-50 p-3 rounded border"><code>${escapeHtml(startCmd)}</code></pre>`
          : '',
        lintCmd ? `<p>Lint:</p><pre class="bg-gray-50 p-3 rounded border"><code>${escapeHtml(lintCmd)}</code></pre>` : '',
      ]),
      toPageSection('Production environment variables', [
        `<p>Names flagged likely required:</p>`,
        listItems(
          envUsage.filter((e) => e.likelyRequired === 'likely_required').map((e) => e.name ?? ''),
          'none flagged'
        ),
      ]),
      toPageSection('CI/CD artifacts', [
        ciFiles.length > 0
          ? listItems(ciFiles, '')
          : '<p><em>No .github/workflows paths in deploymentFiles list.</em></p>',
      ]),
      toPageSection('Operational checks', [
        listItems(
          [
            'Confirm health/readiness routes if defined in API reference',
            'Verify database migrations applied before traffic',
            'Rotate secrets and validate Clerk/Vercel dashboards after env changes',
          ],
          ''
        ),
      ]),
    ],
  };

  // --- Page 11 ---
  const page11 = {
    title: 'Environment Variables',
    sections: [
      toPageSection('', [
        '<p>Values are <strong>never</strong> stored; only names and static references from scanned files.</p>',
        buildEnvTableHtml(envUsage),
      ]),
    ],
  };

  const readmeDetected = importantDocs.some((d) => /readme/i.test(d.path ?? '')) || docsFiles.some((f) => /readme/i.test(f));
  const routesWeakMethods = apiRoutes.filter((r) => !Array.isArray(r.methods) || r.methods.length === 0);
  const unclearEnv = envUsage.filter((e) => e.likelyPurpose === 'Application configuration' || !e.likelyPurpose);

  // --- Page 12 ---
  const page12 = {
    title: 'Maintenance, Risks & Technical Debt',
    sections: [
      toPageSection('Documentation inventory', [
        importantDocs.length > 0
          ? `<p>${importantDocs.length} markdown summaries captured (first ~300 chars each). Large docs remain in-repo only.</p>`
          : '<p><em>No importantDocs entries — expand scanner doc discovery.</em></p>',
        !readmeDetected
          ? '<p><strong>Gap:</strong> README not detected among prioritized docs — add or rename for better onboarding docs.</p>'
          : '<p>README-like doc detected in scan samples.</p>',
      ]),
      toPageSection('API clarity', [
        routesWeakMethods.length > 0
          ? `<p><strong>Risk:</strong> ${routesWeakMethods.length} route file(s) had no exported HTTP methods matched by regex — verify dynamic handlers or re-exports.</p>`
          : '<p>Methods detected or explicitly absent for all sampled routes.</p>',
      ]),
      toPageSection('Environment ambiguity', [
        unclearEnv.length > 0
          ? `<p>${unclearEnv.length} variable(s) have generic purpose classification — rename or document in code comments.</p>`
          : '<p>No env purpose ambiguity flagged.</p>',
      ]),
      toPageSection('Likely risks', [
        listItems(
          [
            prismaModels.length > 0 && !migrationsExist ? 'Migrations folder not reported — confirm DB drift.' : '',
            clerkDetected && protectedRouteHints.length === 0 ? 'Clerk present but few routes flagged usesAuth — audit protection.' : '',
            apiRoutes.length > 50 ? 'Large API surface — consider pagination of docs or ownership tags.' : '',
          ].filter(Boolean),
          'No automated risk flags beyond metadata completeness.'
        ),
      ]),
      toPageSection('Recommended next improvements', [
        listItems(
          [
            'Extend CLI scanner with AST-based HTTP method detection for edge exports',
            'Capture OpenAPI or route middleware metadata if introduced',
            'Add README sections for setup matching Local Setup Guide',
          ],
          ''
        ),
      ]),
    ],
  };

  return [
    page1,
    page2,
    page3,
    page4,
    page5,
    page6,
    page7,
    page8,
    page9,
    page10,
    page11,
    page12,
  ];
}
