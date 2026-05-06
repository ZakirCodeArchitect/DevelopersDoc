/**
 * Generated documentation from CLI scan metadata v3 (semantic buckets + enriched apiRoutes).
 */

import { isDocGenV2Enabled } from '@/lib/sync/generated-doc-pages-v2';

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

function normalizePath(pathValue: string): string {
  return pathValue.replace(/\\/g, '/');
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
  return { title, type: 'html' as const, content: blocks };
}

type ApiRouteRecord = {
  filePath?: string;
  routePath?: string;
  methods?: string[];
  purpose?: string;
  purposeSummary?: string;
  authType?: string;
  usesPrisma?: boolean;
  usesAuth?: boolean;
  envVarsReferenced?: string[];
  prismaOperations?: string[];
  sideEffectsNarrative?: string[];
  externalEffects?: string[];
  hasErrorHandling?: boolean;
  analysisConfidence?: string;
};

type PrismaModelV3 = {
  name?: string;
  businessMeaning?: string;
  keyFieldsSample?: string[];
  relationsSample?: string[];
  usedByRoutesApprox?: string[];
};

type PackageScriptsV3 = {
  dev?: string;
  build?: string;
  start?: string;
  lint?: string;
  prismaMigrate?: string;
  prismaGenerate?: string;
  seed?: string;
};

function parseApiRoutes(metadata: JsonRecord): ApiRouteRecord[] {
  const raw = metadata.apiRoutes;
  if (!Array.isArray(raw)) return [];
  return raw.filter((r): r is ApiRouteRecord => r !== null && typeof r === 'object');
}

function buildApiTable(routes: ApiRouteRecord[]): string {
  const rows = routes.slice(0, 80).map((r) => {
    const methods = Array.isArray(r.methods) && r.methods.length ? r.methods.join(', ') : '—';
    const purpose = escapeHtml(r.purposeSummary ?? r.purpose ?? '—');
    const auth = escapeHtml(r.authType ?? (r.usesAuth ? 'session required (inferred)' : '—'));
    const db = escapeHtml((r.prismaOperations ?? []).slice(0, 6).join(', ') || (r.usesPrisma ? 'Prisma' : '—'));
    const envs = escapeHtml((r.envVarsReferenced ?? []).slice(0, 6).join(', ') || '—');
    const fx = escapeHtml((r.sideEffectsNarrative ?? []).join('; ') || '—');
    return `<tr><td class="border p-2 align-top"><code>${escapeHtml(methods)}</code></td><td class="border p-2 align-top"><code>${escapeHtml(r.routePath ?? '')}</code></td><td class="border p-2 align-top text-xs"><code>${escapeHtml(r.filePath ?? '')}</code></td><td class="border p-2 align-top text-xs">${purpose}</td><td class="border p-2 align-top text-xs">${auth}</td><td class="border p-2 align-top text-xs">${db}</td><td class="border p-2 align-top text-xs">${envs}</td><td class="border p-2 align-top text-xs">${fx}</td></tr>`;
  });
  return `<div class="overflow-x-auto"><table class="min-w-full text-xs border-collapse border border-gray-200"><thead><tr class="bg-gray-100"><th class="border p-2 text-left">Methods</th><th class="border p-2 text-left">Route</th><th class="border p-2 text-left">File</th><th class="border p-2 text-left">Purpose</th><th class="border p-2 text-left">Auth</th><th class="border p-2 text-left">Prisma ops</th><th class="border p-2 text-left">Env</th><th class="border p-2 text-left">Side effects</th></tr></thead><tbody>${rows}</tbody></table></div>`;
}

function sampleWithOverflow(items: string[], max: number): { sample: string[]; overflow: number } {
  const sample = items.slice(0, max);
  return { sample, overflow: Math.max(0, items.length - sample.length) };
}

function runScriptCommand(scriptName: string, scripts: PackageScriptsV3): string | null {
  return scripts[scriptName as keyof PackageScriptsV3] ? `npm run ${scriptName}` : null;
}

function routeMatches(route: ApiRouteRecord, keyword: string): boolean {
  const k = keyword.toLowerCase();
  return (
    String(route.routePath ?? '')
      .toLowerCase()
      .includes(k) ||
    String(route.filePath ?? '')
      .toLowerCase()
      .includes(k)
  );
}

function modelRelationshipTree(prismaModels: PrismaModelV3[]): string {
  const names = new Set(
    prismaModels
      .map((m) => (typeof m.name === 'string' ? m.name.toLowerCase() : ''))
      .filter((x) => x.length > 0),
  );
  const has = (name: string) => names.has(name.toLowerCase());
  const lines: string[] = [];
  if (has('User')) {
    lines.push('User');
    if (has('Project')) lines.push('  -> Project');
    if (has('Project') && has('Document')) lines.push('     -> Document');
    if (has('Page')) lines.push('        -> Page');
    if (has('Section')) lines.push('           -> Section');
    if (has('PublishedDocument')) lines.push('        -> PublishedDocument');
    if (has('DocSyncProject')) lines.push('     -> DocSyncProject');
    if (has('DocSyncSnapshot')) lines.push('        -> DocSyncSnapshot');
    if (has('DocSyncChange')) lines.push('        -> DocSyncChange');
    if (has('CliAuthSession')) lines.push('  -> CliAuthSession');
  }
  if (lines.length === 0) {
    return 'No canonical relationship tree inferred from model names. Use model details below to confirm actual relations.';
  }
  return lines.join('\n');
}

function classifyRiskSeverity(raw: string): string {
  if (raw === 'risk') return 'Real risk';
  if (raw === 'needs_confirmation') return 'Needs confirmation';
  if (raw === 'recommended_improvement') return 'Recommended improvement';
  if (raw === 'info') return 'Intentional public behavior';
  return 'Needs confirmation';
}

function buildRouteDetailSection(route: ApiRouteRecord): { title: string; html: string } {
  const methods = Array.isArray(route.methods) && route.methods.length ? route.methods.join(', ') : '—';
  const sideEffects = (route.sideEffectsNarrative ?? []).length
    ? route.sideEffectsNarrative ?? []
    : route.externalEffects ?? [];
  const likelyFailures: string[] = [];
  if (!route.hasErrorHandling) likelyFailures.push('Error responses may be inconsistent (inferred from limited error handling signal).');
  if (route.usesPrisma) likelyFailures.push('Database validation, missing rows, and transaction conflicts can fail requests.');
  if (route.usesAuth) likelyFailures.push('Session/token verification can reject unauthorized callers.');
  if ((route.envVarsReferenced ?? []).length > 0) likelyFailures.push('Missing required environment variables can fail this route at runtime.');

  return {
    title: `${route.routePath ?? route.filePath ?? 'Route'} details`,
    html: `<div class="mb-6 rounded border border-gray-200 p-4">
      <p><strong>Purpose:</strong> ${escapeHtml(route.purposeSummary ?? route.purpose ?? 'No purpose summary captured.')}</p>
      <p><strong>Methods:</strong> <code>${escapeHtml(methods)}</code></p>
      <p><strong>Auth:</strong> ${escapeHtml(route.authType ?? (route.usesAuth ? 'Protected route (inferred)' : 'Public or unknown (needs confirmation)'))}</p>
      <p><strong>Database models touched:</strong> ${escapeHtml((route.prismaOperations ?? []).join(', ') || (route.usesPrisma ? 'Prisma usage detected (model inference unavailable).' : 'No DB operation detected'))}</p>
      <p><strong>Side effects:</strong> ${escapeHtml(sideEffects.join('; ') || 'No side effects captured.')}</p>
      <p><strong>Likely failure cases:</strong> ${escapeHtml(likelyFailures.join(' ') || 'No specific failure signal captured in metadata.')}</p>
      <p><strong>Source file:</strong> <code>${escapeHtml(route.filePath ?? 'unknown')}</code></p>
    </div>`,
  };
}

function extractEnvEntryNames(metadata: JsonRecord): string[] {
  const envAnalysis = metadata.envAnalysis as JsonRecord | undefined;
  const rawEntries = envAnalysis?.entries;
  if (!Array.isArray(rawEntries)) return [];
  return rawEntries
    .map((entry) => (entry && typeof entry === 'object' ? String((entry as JsonRecord).name ?? '') : ''))
    .filter((name) => name.length > 0);
}

function buildEnvTableV3(metadata: JsonRecord): string {
  const envAnalysis = metadata.envAnalysis as JsonRecord | undefined;
  const entries = envAnalysis && Array.isArray(envAnalysis.entries) ? envAnalysis.entries : metadata.envUsage;
  if (!Array.isArray(entries) || entries.length === 0) {
    return '<p><em>No environment variable usage captured.</em></p>';
  }
  const rows = (entries as JsonRecord[]).slice(0, 80).map((e) => {
    const name = escapeHtml(String(e.name ?? '?'));
    const scope = escapeHtml(String(e.scopeLabel ?? (e.isPublic ? 'public' : 'server-only')));
    const cls = escapeHtml(String(e.envClassification ?? e.likelyPurpose ?? '—'));
    const vs = escapeHtml(String(e.valueStatus ?? '—'));
    const files = escapeHtml(toStringArray(e.files).slice(0, 4).join(', ') || '—');
    const req = escapeHtml(String(e.likelyRequired ?? 'unknown'));
    const warn = e.nextPublicSecretWarning
      ? `<span class="text-amber-700">${escapeHtml(String(e.nextPublicSecretWarning))}</span>`
      : '—';
    return `<tr><td><code>${name}</code></td><td>${scope}</td><td>${cls}</td><td>${vs}</td><td><small>${files}</small></td><td>${req}</td><td>${warn}</td></tr>`;
  });
  return `<div class="overflow-x-auto"><table class="min-w-full border-collapse border border-gray-300 text-sm"><thead><tr class="bg-gray-100"><th class="border p-2 text-left">Name</th><th class="border p-2 text-left">Scope</th><th class="border p-2 text-left">Class</th><th class="border p-2 text-left">Value status</th><th class="border p-2 text-left">Files</th><th class="border p-2 text-left">Req</th><th class="border p-2 text-left">Warn</th></tr></thead><tbody>${rows.join('')}</tbody></table></div>`;
}

export function isDocGenV3Enabled(): boolean {
  return process.env.DEVELOPERDOC_DOC_GEN_V3 !== 'false';
}

export function shouldUseBuildGeneratedPagesV3(metadataInput: unknown): boolean {
  if (!isDocGenV3Enabled()) return false;
  const m = toObject(metadataInput);
  return m.metadataVersion === 3;
}

export function buildGeneratedPagesV3(metadataInput: unknown, detectedFramework?: string | null) {
  const metadata = toObject(metadataInput);
  const framework =
    (typeof metadata.framework === 'string' && metadata.framework) || detectedFramework || 'unknown';
  const deps = unique(toStringArray(metadata.dependencies));
  const devDeps = unique(toStringArray(metadata.devDependencies));
  const apiRoutes = parseApiRoutes(metadata);
  const projectSummary = metadata.projectSummary as JsonRecord | undefined;
  const runtimeSurfaces = toStringArray(metadata.runtimeSurfaces);
  const authAnalysis = metadata.authAnalysis as JsonRecord | undefined;
  const prismaAnalysis = metadata.prismaAnalysis as JsonRecord | undefined;
  const setupPlan = metadata.setupPlan as JsonRecord | undefined;
  const moduleAnalysis = metadata.moduleAnalysis as JsonRecord | undefined;
  const frontendAnalysis = metadata.frontendAnalysis as JsonRecord | undefined;
  const runtimeFlows = Array.isArray(metadata.runtimeFlows) ? metadata.runtimeFlows : [];
  const riskAnalysis = metadata.riskAnalysis as JsonRecord | undefined;
  const generationHints = metadata.generationHints as JsonRecord | undefined;
  const scanQuality = metadata.scanQuality as JsonRecord | undefined;
  const packageScripts = (metadata.packageScripts as PackageScriptsV3 | undefined) ?? {};
  const fileTree = toStringArray(metadata.fileTree).map(normalizePath);
  const deploymentFiles = unique(toStringArray(metadata.deploymentFiles).map(normalizePath));
  const moduleMap =
    moduleAnalysis && Array.isArray(moduleAnalysis.modules) ? (moduleAnalysis.modules as JsonRecord[]) : [];
  const prismaModels: PrismaModelV3[] =
    prismaAnalysis && Array.isArray(prismaAnalysis.models) ? (prismaAnalysis.models as PrismaModelV3[]) : [];
  const riskItems =
    riskAnalysis && Array.isArray(riskAnalysis.items) ? (riskAnalysis.items as JsonRecord[]) : [];

  const hasApi = apiRoutes.length > 0;
  const hasCliSync = apiRoutes.some((r) => routeMatches(r, '/api/cli')) || moduleMap.some((m) => /cli|sync/i.test(String(m.module ?? '')));
  const hasDocsPipeline =
    fileTree.some((p) => p.includes('generated-doc-pages-v3.ts')) ||
    fileTree.some((p) => p.includes('doc-generation.service.ts'));
  const hasDb = prismaModels.length > 0;
  const hasWebApp = fileTree.some((p) => p.startsWith('app/')) || fileTree.some((p) => p.startsWith('src/app/'));
  const hasPublicPublished = apiRoutes.some((r) => routeMatches(r, '/api/published'));
  const hasShareRoutes = apiRoutes.some((r) => routeMatches(r, '/share'));
  const hasWebhookRoutes = apiRoutes.some((r) => routeMatches(r, '/webhooks'));

  const overviewText =
    (projectSummary && typeof projectSummary.overview === 'string' && projectSummary.overview) ||
    `${framework} application scanned with metadata version 3.`;

  const overviewBullets: string[] = [
    hasWebApp
      ? 'The repository appears to host a web dashboard and user-facing documentation pages.'
      : 'Web app surface is inferred but needs confirmation.',
    hasApi
      ? 'API routes provide backend capabilities for project, document, publishing, and sync workflows.'
      : 'No API routes were detected in this scan.',
    hasCliSync
      ? 'A local CLI sync surface is detected through /api/cli endpoints for registration, auth, and scan upload.'
      : 'CLI sync endpoints were not strongly detected in this snapshot.',
    hasDb
      ? `Data persistence appears to use Prisma with ${prismaModels.length} model(s).`
      : 'Database model signals are limited; confirm persistence layer.',
    hasDocsPipeline
      ? 'Generated documentation pipeline files are present, indicating snapshot-based document generation and regeneration.'
      : 'Generated documentation pipeline files were not detected in scanned paths.',
  ];

  const projectSummaryLines = unique([
    typeof projectSummary?.productAngle === 'string' ? projectSummary.productAngle : '',
    overviewText,
  ]).filter(Boolean);

  const mermaid = [
    'flowchart LR',
    '  Browser[Browser / Web UI] --> App[Next.js App Router]',
    authAnalysis?.proxyMiddleware ? '  Auth[Clerk + proxy.ts/middleware.ts] --> App' : '',
    '  App --> Api[API Routes (app/api/*)]',
    '  Api --> Service[Service layer + lib/db.ts]',
    hasDb ? '  Service --> Prisma[Prisma Client]' : '',
    hasDb ? '  Prisma --> Pg[(PostgreSQL)]' : '',
    hasCliSync ? '  CLI[packages/developerdoc-cli] --> CliAuth[/api/cli/auth/*]' : '',
    hasCliSync ? '  CLI --> CliRegister[/api/cli/register*]' : '',
    hasCliSync ? '  CLI --> CliScan[/api/cli/scan]' : '',
    hasCliSync ? '  CliScan --> Snapshot[DocSyncSnapshot]' : '',
    hasDocsPipeline ? '  Snapshot --> V3[buildGeneratedPagesV3]' : '',
    hasDocsPipeline ? '  V3 --> Output[Document / Page / Section]' : '',
  ]
    .filter(Boolean)
    .join('\n');

  const page1 = {
    title: 'Project Overview',
    sections: [
      toPageSection('', [
        `<p>${escapeHtml(
          projectSummaryLines[0] ??
            'Project summary inferred from the latest CLI scan metadata and repository signals.',
        )}</p>`,
        `<p>${escapeHtml(
          'DevelopersDoc appears to be a hosted documentation platform with a web dashboard, editor and publishing surfaces, plus local CLI sync where /api/cli endpoints are detected.',
        )} ${hasCliSync ? '' : escapeHtml('(CLI sync wording is inferred and should be confirmed in your repository.)')}</p>`,
        listItems(overviewBullets, 'No reliable product summary signals captured from this scan.'),
      ].filter(Boolean)),
      toPageSection('Runtime surfaces', [listItems(runtimeSurfaces, 'No runtime surfaces listed — re-run v3 scan.')]),
      toPageSection('Main dependencies', [
        listItems(deps.slice(0, 25), 'No dependencies'),
        `<p><strong>devDependencies (sample):</strong></p>`,
        listItems(devDeps.slice(0, 15), 'None'),
      ]),
      toPageSection('Web app and API purpose', [
        `<ul>
          <li><strong>Web app purpose:</strong> ${escapeHtml(
            hasWebApp
              ? 'Provide project dashboard, editor views, generated docs review, and publishing controls.'
              : 'Needs confirmation from app/ routes.',
          )}</li>
          <li><strong>API purpose:</strong> ${escapeHtml(
            hasApi
              ? 'Handle auth-aware CRUD, publish/share flows, webhook ingestion, and CLI sync endpoints.'
              : 'No API handlers detected.',
          )}</li>
          <li><strong>CLI sync purpose:</strong> ${escapeHtml(
            hasCliSync
              ? 'Link repositories, upload scans, and refresh generated documentation snapshots.'
              : 'No strong CLI sync signals in this snapshot.',
          )}</li>
          <li><strong>Database purpose:</strong> ${escapeHtml(
            hasDb
              ? 'Persist users, projects, documents, sections, publish/share state, and sync snapshots.'
              : 'Persistence model requires confirmation.',
          )}</li>
          <li><strong>Documentation pipeline:</strong> ${escapeHtml(
            hasDocsPipeline
              ? 'Snapshot metadata is transformed by buildGeneratedPagesV3 into Document/Page/Section rows.'
              : 'Pipeline files not captured.',
          )}</li>
        </ul>`,
      ]),
      toPageSection('Documentation generation', [
        `<p>${escapeHtml(
          (generationHints && typeof generationHints.initialGenerationTrigger === 'string'
            ? generationHints.initialGenerationTrigger
            : 'Initial doc generation runs once per project when scan triggers it.') as string,
        )}</p>`,
        `<p>${escapeHtml(
          (generationHints && typeof generationHints.regenerationNote === 'string'
            ? generationHints.regenerationNote
            : 'Use dashboard regenerate after scanner upgrades.') as string,
        )}</p>`,
      ]),
      ...(scanQuality
        ? [
            toPageSection('Documentation confidence', [
              `<p>Files scanned (capped): <strong>${escapeHtml(String(scanQuality.filesScanned ?? ''))}/${escapeHtml(
                String(scanQuality.filesScannedCap ?? ''),
              )}</strong>. Cap reached: <strong>${escapeHtml(String(scanQuality.scanFileCapHit ?? ''))}</strong>. API routes: <strong>${escapeHtml(
                String(scanQuality.apiRoutesCount ?? ''),
              )}</strong>. Prisma models: <strong>${escapeHtml(String(scanQuality.prismaModelCount ?? 0))}</strong>. Warnings: <strong>${escapeHtml(
                String(scanQuality.warningsCount ?? 0),
              )}</strong>.</p>`,
            ]),
          ]
        : []),
    ],
  };

  const page2 = {
    title: 'Architecture Overview',
    sections: [
      toPageSection('', [
        '<p>This architecture view describes how browser requests, auth boundaries, route handlers, data persistence, and CLI scan ingestion connect in this repository. It is grounded in detected files and route metadata, with inferred labels where scanner confidence is limited.</p>',
      ]),
      toPageSection('Runtime surfaces', [listItems(runtimeSurfaces, 'Run developerdoc scan with v3 CLI.')]),
      toPageSection('Architecture diagram', [
        `<pre class="whitespace-pre-wrap font-mono text-xs bg-gray-50 p-4 rounded border">${escapeHtml(mermaid)}</pre>`,
      ]),
      toPageSection('Evidence files', [
        listItems(
          unique([
            ...(apiRoutes.slice(0, 10).map((r) => r.filePath).filter(Boolean) as string[]),
            ...fileTree.filter((p) =>
              [
                'proxy.ts',
                'middleware.ts',
                'lib/db.ts',
                'doc-generation.service.ts',
                'generated-doc-pages-v3.ts',
                'prisma/schema.prisma',
              ].some((needle) => p.includes(needle)),
            ),
          ]),
          'No paths',
        ),
      ]),
    ],
  };

  const setupPrereq = toStringArray(setupPlan?.prerequisites);
  const setupInstall = typeof setupPlan?.installCommand === 'string' ? setupPlan.installCommand : 'npm install';
  const setupEnvNames = toStringArray(setupPlan?.requiredVarNames);
  const prismaGenerateCmd = runScriptCommand('prismaGenerate', packageScripts) ?? 'npx prisma generate';
  const prismaMigrateCmd = runScriptCommand('prismaMigrate', packageScripts) ?? 'npx prisma migrate dev';
  const prismaPushCmd = fileTree.some((p) => p.includes('prisma/')) ? 'npm run db:push (if defined) or npx prisma db push' : '';
  const prismaStudioCmd = fileTree.some((p) => p.includes('prisma/')) ? 'npm run db:studio (if defined) or npx prisma studio' : '';

  const envGroups = {
    Database: setupEnvNames.filter((n) => /DATABASE|DIRECT_URL|POSTGRES|PRISMA/i.test(n)),
    Clerk: setupEnvNames.filter((n) => /CLERK|SVIX/i.test(n)),
    'App URL': setupEnvNames.filter((n) => /APP_URL|NEXT_PUBLIC_APP_URL|NEXTAUTH_URL|SITE_URL/i.test(n)),
    Webhook: setupEnvNames.filter((n) => /WEBHOOK|SVIX/i.test(n)),
    'Email optional': setupEnvNames.filter((n) => /EMAIL|SMTP|MAIL/i.test(n)),
    'Debug/cache optional': setupEnvNames.filter((n) => /DEBUG|REDIS|CACHE|LOG/i.test(n)),
  };

  const page3 = {
    title: 'Local Setup Guide',
    sections: [
      toPageSection('Prerequisites', [listItems(setupPrereq, 'Add prerequisites to scanner setupPlan.')]),
      toPageSection('Install', [
        `<pre class="bg-gray-50 p-3 rounded border"><code>${escapeHtml(setupInstall)}</code></pre>`,
      ]),
      toPageSection('Minimal env template', [
        `<p>${escapeHtml(
          (setupPlan && typeof setupPlan.envFileConvention === 'string'
            ? setupPlan.envFileConvention
            : 'Create .env.local with names only in docs; never commit secrets.') as string,
        )}</p>`,
        ...Object.entries(envGroups).map(
          ([group, vars]) =>
            `<p><strong>${escapeHtml(group)}:</strong> ${
              vars.length
                ? vars.map((v) => `<code>${escapeHtml(v)}</code>`).join(', ')
                : '<em>none detected</em>'
            }</p>`,
        ),
        setupEnvNames.length === 0 ? '<p><em>No required variable names captured in this scan.</em></p>' : '',
      ]),
      toPageSection('Database', [
        listItems(toStringArray(setupPlan?.databaseSteps), 'Configure Prisma datasource URLs.'),
        `<pre class="bg-gray-50 p-3 rounded border"><code>${escapeHtml(
          [prismaGenerateCmd, prismaMigrateCmd, prismaPushCmd, prismaStudioCmd].filter(Boolean).join('\n'),
        )}</code></pre>`,
      ]),
      toPageSection('Auth', [listItems(toStringArray(setupPlan?.authSteps), 'Configure auth provider.')]),
      toPageSection('Email', [listItems(toStringArray(setupPlan?.emailNotes), 'Optional email setup.')]),
      toPageSection('Run locally', [listItems(toStringArray(setupPlan?.runLocally), 'npm run dev')]),
      ...(Array.isArray(setupPlan?.cliLocalTest) && (setupPlan?.cliLocalTest as string[]).length > 0
        ? [toPageSection('CLI package (local test)', [listItems(setupPlan?.cliLocalTest as string[], '')])]
        : []),
      toPageSection('Verification checklist', [
        listItems(
          [
            'App opens locally.',
            'Sign-in flow works.',
            'Database connection works.',
            'Create project flow works.',
            'Run CLI scan successfully.',
            'Generated docs appear in the dashboard.',
            ...toStringArray(setupPlan?.verification),
          ],
          'Sign in and exercise main flows.',
        ),
      ]),
      toPageSection('Troubleshooting', [
        listItems(toStringArray(setupPlan?.troubleshooting), 'See Environment and Maintenance pages.'),
      ]),
    ],
  };

  const modules = moduleMap;
  const specialFileDescriptions: Array<{ match: RegExp; title: string; desc: string }> = [
    { match: /(^|\/)(proxy|middleware)\.ts$/i, title: 'Auth middleware/proxy', desc: 'Guards route access and applies auth/session policies at edge or server boundary.' },
    { match: /(^|\/)next\.config\.(js|ts|mjs|cjs)$/i, title: 'Next.js runtime/build config', desc: 'Controls build output, image handling, and runtime options.' },
    { match: /(^|\/)postcss\.config\.(js|ts|mjs|cjs)$/i, title: 'CSS/PostCSS pipeline config', desc: 'Defines CSS processing plugins used during build.' },
    { match: /(^|\/)eslint\.config\.(js|ts|mjs|cjs)$/i, title: 'Linting rules', desc: 'Defines static analysis rules and code quality gates.' },
    { match: /(^|\/)prisma\/schema\.prisma$/i, title: 'Database schema', desc: 'Source of truth for Prisma models, relations, and datasource configuration.' },
    { match: /(^|\/)packages\/[^/]+\//i, title: 'Workspace package', desc: 'Reusable package surface (CLI, shared library, or tooling) within the monorepo.' },
    { match: /(^|\/)scripts\//i, title: 'Operational scripts', desc: 'Automation entry points for setup, migrations, release, or maintenance tasks.' },
  ];
  const modBlocks =
    modules.slice(0, 35).map((m: JsonRecord) => {
      const name = escapeHtml(String(m.module ?? '?'));
      const resp = escapeHtml(String(m.detectedResponsibility ?? ''));
      const moduleFiles = toStringArray(m.keyFiles);
      const sampled = sampleWithOverflow(moduleFiles, 5);
      const files = escapeHtml(sampled.sample.join(', ') || '—');
      return `<div class="mb-6 rounded border border-gray-200 p-4">
        <h3 class="text-lg font-semibold">${name}</h3>
        <p class="text-sm text-gray-700"><strong>Responsibility:</strong> ${resp || 'Needs confirmation from source.'}</p>
        <p class="text-sm text-gray-700"><strong>Why a new developer should care:</strong> This module contains key runtime behavior and is commonly touched during feature work or debugging.</p>
        <p class="text-xs mt-1"><strong>Important files:</strong> ${files}${sampled.overflow > 0 ? ` <em>plus ${sampled.overflow} more.</em>` : ''}</p>
      </div>`;
    }) || [];

  const specialFileNotes = fileTree
    .flatMap((filePath) =>
      specialFileDescriptions
        .filter((s) => s.match.test(filePath))
        .map((s) => `<li><code>${escapeHtml(filePath)}</code> — <strong>${escapeHtml(s.title)}:</strong> ${escapeHtml(s.desc)}</li>`),
    )
    .slice(0, 20);

  const page4 = {
    title: 'Folder & Module Structure',
    sections: [
      toPageSection('', ['<p>This page summarizes module responsibilities and critical files so new engineers can quickly orient to runtime ownership and likely change impact.</p>']),
      toPageSection('Important common files', [specialFileNotes.length ? `<ul>${specialFileNotes.join('')}</ul>` : '<p><em>No common root/runtime config files were detected within scan depth.</em></p>']),
      toPageSection('Modules', [`<div class="space-y-1">${modBlocks.join('') || '<p><em>No modules</em></p>'}</div>`]),
    ],
  };

  const page5 = {
    title: 'API Reference',
    sections: [
      toPageSection('', [
        `<p>${escapeHtml(
          (metadata.apiRouteAnalysis &&
          typeof (metadata.apiRouteAnalysis as JsonRecord).summary === 'string'
            ? (metadata.apiRouteAnalysis as JsonRecord).summary
            : `${apiRoutes.length} route files`) as string,
        )}</p>`,
      ]),
      ...(apiRoutes.length ? [toPageSection('Routes', [buildApiTable(apiRoutes)])] : []),
      ...(() => {
        const routePriority = [
          '/api/cli/scan',
          '/api/cli/register',
          '/api/cli/register-from-auth',
          '/api/cli/auth/start',
          '/api/cli/auth/poll',
          '/api/cli/auth/confirm',
          '/api/documents/[id]/publish',
          '/share',
          '/webhooks',
          '/api/published',
        ];
        const matched = routePriority
          .map((needle) => apiRoutes.find((r) => routeMatches(r, needle)))
          .filter((r): r is ApiRouteRecord => Boolean(r));
        const uniqueMatched = unique(matched.map((r) => r.filePath ?? `${r.routePath}`))
          .map((k) => matched.find((r) => (r.filePath ?? `${r.routePath}`) === k))
          .filter((r): r is ApiRouteRecord => Boolean(r));
        return uniqueMatched.map((route) => {
          const detail = buildRouteDetailSection(route);
          return toPageSection(detail.title, [detail.html]);
        });
      })(),
    ],
  };

  const prismaBlocks = prismaModels.slice(0, 60).map((model) => {
    const title = escapeHtml(model.name ?? 'Model');
    const role = escapeHtml(model.businessMeaning ?? '—');
    const fields = escapeHtml((model.keyFieldsSample ?? []).join(', ') || '—');
    const rel = escapeHtml((model.relationsSample ?? []).join('; ') || '—');
    const routes = escapeHtml((model.usedByRoutesApprox ?? []).join(', ') || '—');
    return `<div class="mb-6 border-b border-gray-100 pb-4"><h3 class="text-lg font-semibold">${title}</h3><p class="text-sm"><strong>Role:</strong> ${role}</p><p class="text-xs mt-2"><strong>Fields:</strong> ${fields}</p><p class="text-xs mt-1"><strong>Relations:</strong> ${rel}</p><p class="text-xs mt-1"><strong>Inferred route usage:</strong> ${routes}</p></div>`;
  });

  const dsProv =
    prismaAnalysis && typeof prismaAnalysis.datasourceProvider === 'string'
      ? prismaAnalysis.datasourceProvider
      : (metadata.prismaSchema as JsonRecord | undefined)?.datasourceProvider;
  const urlEnv =
    prismaAnalysis && typeof prismaAnalysis.urlEnvVar === 'string'
      ? prismaAnalysis.urlEnvVar
      : (metadata.prismaSchema as JsonRecord | undefined)?.datasourceUrlEnv;
  const directEnv =
    prismaAnalysis && typeof prismaAnalysis.directUrlEnvVar === 'string'
      ? prismaAnalysis.directUrlEnvVar
      : (metadata.prismaSchema as JsonRecord | undefined)?.datasourceDirectUrlEnv;

  const page6 = {
    title: 'Database & Data Model',
    sections: [
      toPageSection('Relationship overview', [
        `<pre class="whitespace-pre-wrap font-mono text-xs bg-gray-50 p-4 rounded border">${escapeHtml(
          modelRelationshipTree(prismaModels),
        )}</pre>`,
      ]),
      toPageSection('', [
        `<p><strong>Datasource:</strong> <code>${escapeHtml(String(dsProv ?? 'unknown'))}</code></p>`,
        urlEnv ? `<p><strong>URL env:</strong> <code>${escapeHtml(String(urlEnv))}</code></p>` : '',
        directEnv ? `<p><strong>Direct URL env:</strong> <code>${escapeHtml(String(directEnv))}</code></p>` : '',
        prismaAnalysis && Array.isArray(prismaAnalysis.warnings)
          ? `<p><strong>Notes:</strong> ${escapeHtml((prismaAnalysis.warnings as string[]).join(' '))}</p>`
          : '',
      ].filter(Boolean)),
      toPageSection('Models', [`<div class="space-y-1">${prismaBlocks.join('') || '<p><em>No Prisma models in v3 analysis</em></p>'}</div>`]),
    ],
  };

  const proxy = authAnalysis?.proxyMiddleware as JsonRecord | undefined;

  const page7 = {
    title: 'Authentication & Authorization',
    sections: [
      toPageSection('A. Web user authentication (Clerk)', [
        listItems(toStringArray(authAnalysis?.webUserAuth), 'No Clerk session routes inferred.'),
      ]),
      toPageSection('B. proxy.ts / middleware', [
        proxy
          ? `<p><strong>File:</strong> <code>${escapeHtml(String(proxy.frameworkMiddlewarePath ?? ''))}</code></p>
             <p><strong>Signals:</strong> ${escapeHtml(toStringArray(proxy.authProviderSignals).join(', '))}</p>
             <p><strong>Public HTML routes:</strong> ${escapeHtml(toStringArray(proxy.publicRoutePatterns).join(', '))}</p>
             <p><strong>Public API patterns:</strong> ${escapeHtml(toStringArray(proxy.publicApiRoutePatterns).join(', '))}</p>
             <p><strong>auth.protect:</strong> ${proxy.usesAuthProtect ? 'yes' : 'no'}</p>`
          : '<p><em>No proxy/middleware file captured — confirm proxy.ts or middleware.ts path.</em></p>',
      ]),
      toPageSection('C. CLI sync authentication', [
        listItems(toStringArray(authAnalysis?.cliSyncAuth), 'No CLI sync routes.'),
      ]),
      toPageSection('D. CLI device/browser auth', [
        listItems(toStringArray(authAnalysis?.cliDeviceAuth), 'No CLI auth routes.'),
      ]),
      toPageSection('E. Webhooks', [listItems(toStringArray(authAnalysis?.webhookAuth), 'No webhook routes.')]),
      toPageSection('F. Public published docs API', [
        listItems(toStringArray(authAnalysis?.publicPublishedRoutes), 'None detected.'),
        '<p>Verify published JSON does not leak private fields (e.g. author email).</p>',
      ]),
    ],
  };

  const feBullets = frontendAnalysis && Array.isArray(frontendAnalysis.bullets) ? frontendAnalysis.bullets : [];

  const page8 = {
    title: 'Frontend Architecture',
    sections: [
      toPageSection('', [
        '<p>Scanner-derived frontend signals (App Router classifications, layouts, components).</p>',
      ]),
      toPageSection('Signals', [listItems(toStringArray(feBullets), 'Re-run scan for frontendAnalysis.')]),
    ],
  };

  const flowSections = (runtimeFlows as JsonRecord[]).map((flow) =>
    toPageSection(typeof flow.name === 'string' ? flow.name : 'Flow', [
      listItems(toStringArray(flow.steps), 'No steps'),
    ]),
  );

  const page9 = {
    title: 'Key Runtime Flows',
    sections: [
      toPageSection('', [
        '<p>These flows are grounded in route and module metadata. Each step references concrete endpoints/services/models where detected, and marks assumptions as inferred.</p>',
      ]),
      toPageSection('CLI init / link', [
        listItems(
          [
            'User runs `developerdoc init` and stores local project configuration.',
            apiRoutes.some((r) => routeMatches(r, '/api/cli/auth/start'))
              ? 'Browser/device auth starts at `/api/cli/auth/start`, then `/api/cli/auth/poll` and `/api/cli/auth/confirm`.'
              : 'CLI browser auth endpoints were not fully detected (inferred).',
            apiRoutes.some((r) => routeMatches(r, '/api/cli/register'))
              ? 'Project registration uses `/api/cli/register` or `/api/cli/register-from-auth` to issue/link sync credentials.'
              : 'Registration endpoint mapping needs confirmation.',
          ],
          'No CLI init/link signals detected.',
        ),
      ]),
      toPageSection('CLI scan', [
        listItems(
          [
            'CLI runs scan locally and sends metadata payload.',
            apiRoutes.some((r) => routeMatches(r, '/api/cli/scan'))
              ? 'Server receives scan at `/api/cli/scan` and validates token/session.'
              : 'Scan endpoint path not found in metadata.',
            'Snapshot persistence is expected to create `DocSyncSnapshot` records (inferred from scanner/risk/runtime flow metadata).',
          ],
          'No CLI scan flow detected.',
        ),
      ]),
      toPageSection('Generated documentation creation', [
        listItems(
          [
            hasDocsPipeline
              ? 'New snapshots can trigger `generateInitialDocumentationForSyncProject` to build initial generated pages.'
              : 'Generated doc service file not detected in scan scope.',
            hasDocsPipeline
              ? '`buildGeneratedPagesV3` creates page structures persisted as `Document` / `Page` / `Section`.'
              : 'Document generation persistence flow needs confirmation.',
          ],
          'Generated docs creation path not detected.',
        ),
      ]),
      toPageSection('Regeneration from latest scan', [
        listItems(
          [
            apiRoutes.some((r) => routeMatches(r, 'regenerate-generated-docs'))
              ? 'Regeneration route refreshes generated pages from the latest snapshot metadata.'
              : 'Regeneration endpoint not found in metadata; confirm UI/action wiring.',
            'Existing generated page rows are replaced while preserving the generated document identity.',
          ],
          'Regeneration flow not detected.',
        ),
      ]),
      toPageSection('Document rendering', [
        listItems(
          [
            'Docs pages load persisted document/page/section data through web routes.',
            'HTML sections are rendered through sanitized viewer paths before display.',
          ],
          'Document rendering flow needs confirmation.',
        ),
      ]),
      toPageSection('Publishing', [
        listItems(
          [
            apiRoutes.some((r) => routeMatches(r, '/api/documents/') && routeMatches(r, '/publish'))
              ? 'Publish action appears to use `/api/documents/[id]/publish`.'
              : 'Publish route path requires confirmation.',
            hasPublicPublished ? 'Published output is served from public published routes (intentional public behavior).' : 'No public published route detected in this scan.',
          ],
          'Publishing flow not detected.',
        ),
      ]),
      toPageSection('Sharing', [
        listItems(
          [
            hasShareRoutes
              ? 'Share routes are present and likely manage invite/access behavior.'
              : 'Share route signals were not detected.',
          ],
          'Sharing flow not detected.',
        ),
      ]),
      toPageSection('Clerk webhook user sync', [
        listItems(
          [
            hasWebhookRoutes
              ? 'Webhook endpoints are present and likely process auth-provider user events.'
              : 'Webhook routes were not detected in this snapshot.',
            'User/project access data should be verified against webhook handler logic for idempotency and signature checks.',
          ],
          'Webhook sync flow not detected.',
        ),
      ]),
      ...flowSections,
    ],
  };

  const riskyBuildScript = typeof packageScripts.build === 'string' && /\|\|\s*true/.test(packageScripts.build);
  const rootTestsMissing = riskItems.some((it) => String(it.title ?? '').toLowerCase().includes('no root test script'));
  const hasMigrationsFolder = fileTree.some((p) => p.startsWith('prisma/migrations/'));
  const missingDotEnvExample = !fileTree.some((p) => p.endsWith('.env.example'));
  const openApiDetected = fileTree.some((p) => /openapi|swagger|schema/i.test(p));
  const deployPlatform =
    deploymentFiles.some((f) => f.includes('vercel.json'))
      ? 'Vercel (detected)'
      : deploymentFiles.some((f) => f.includes('netlify.toml'))
        ? 'Netlify (detected)'
        : deploymentFiles.some((f) => f.includes('render.yaml'))
          ? 'Render (detected)'
          : 'Needs confirmation';

  const page10 = {
    title: 'Deployment & Operations',
    sections: [
      toPageSection('Deployment platform', [
        `<p><strong>Detected platform:</strong> ${escapeHtml(deployPlatform)}</p>`,
      ]),
      toPageSection('Deployment files', [
        listItems(deploymentFiles.slice(0, 30), 'No deployment files listed'),
      ]),
      toPageSection('Build and start commands', [
        `<pre class="bg-gray-50 p-3 rounded border"><code>${escapeHtml(
          [runScriptCommand('build', packageScripts) ?? 'npm run build', runScriptCommand('start', packageScripts) ?? 'npm run start']
            .filter(Boolean)
            .join('\n'),
        )}</code></pre>`,
      ]),
      toPageSection('CI/CD files', [
        listItems(deploymentFiles.filter((f) => f.includes('.github/workflows')).slice(0, 20), 'No CI/CD workflow files detected.'),
      ]),
      toPageSection('Required production env vars', [
        listItems(
          extractEnvEntryNames(metadata).slice(0, 40),
          'No production env names detected in metadata.',
        ),
      ]),
      toPageSection('Database migration/deploy notes', [
        listItems(
          [
            hasMigrationsFolder
              ? 'Prisma migrations folder detected; ensure migration step is part of deploy.'
              : 'No prisma/migrations folder detected. Confirm whether `db push` is intentional for this environment.',
            runScriptCommand('prismaMigrate', packageScripts)
              ? `Use script-based migration command: ${runScriptCommand('prismaMigrate', packageScripts)}.`
              : 'No prisma migrate script detected; confirm deployment migration command.',
          ],
          'No migration notes detected.',
        ),
      ]),
      toPageSection('Operational checks', [
        listItems(
          [
            'Deploy target receives all required env vars and secrets.',
            'Auth flow works end-to-end in production.',
            'Database migrations are applied before serving traffic.',
            'CLI scan endpoint can ingest snapshots safely.',
            'Generated documentation and publish surfaces render as expected.',
          ],
          'No operational checks available.',
        ),
      ]),
      toPageSection('Operational risks', [
        listItems(
          [
            riskyBuildScript ? 'Build script contains `|| true`, which can mask failed builds.' : '',
            rootTestsMissing ? 'Root test script is missing (if this is monorepo-intentional, document policy).' : '',
            !hasMigrationsFolder ? 'No prisma/migrations folder detected; migration strategy needs explicit confirmation.' : '',
            missingDotEnvExample ? 'Missing .env.example increases onboarding and deployment misconfiguration risk.' : '',
          ].filter(Boolean),
          'No high-signal deployment risks detected in scan metadata.',
        ),
      ]),
    ],
  };

  const page11 = {
    title: 'Environment Variables',
    sections: [
      toPageSection('', [
        '<p>Values are never stored. Status columns reflect file presence vs code references only.</p>',
        buildEnvTableV3(metadata),
      ]),
    ],
  };

  const riskLines = riskItems.map((it) => {
    const sev = escapeHtml(classifyRiskSeverity(String(it.severity ?? '')));
    const title = escapeHtml(String(it.title ?? ''));
    const detail = escapeHtml(String(it.detail ?? ''));
    return `<li><strong>${sev}</strong> — ${title}: ${detail}</li>`;
  });

  const page12 = {
    title: 'Maintenance, Risks & Technical Debt',
    sections: [
      toPageSection('Codebase health', [
        riskLines.length > 0
          ? `<ul>${riskLines.join('')}</ul>`
          : '<p><em>No risk items — add scanner rules or re-run scan.</em></p>',
      ]),
      toPageSection('Actionable checks', [
        listItems(
          [
            missingDotEnvExample ? 'Add `.env.example` with names only (no values).' : '',
            !hasMigrationsFolder ? 'Confirm and document migration strategy (`migrate` vs `db push`).' : '',
            riskyBuildScript ? 'Remove `|| true` from build script or isolate non-blocking steps.' : '',
            hasPublicPublished ? 'Public published routes are intentional; verify payload excludes sensitive fields.' : '',
            'HTML rendering path should remain sanitizer-protected; verify sanitizer status during releases.',
            scanQuality?.scanFileCapHit ? 'Scan file cap hit; increase cap or narrow ignores for complete docs.' : '',
            apiRoutes.some((r) => r.usesPrisma) ? 'Audit DB-writing routes for auth, validation, and idempotency.' : '',
            !openApiDetected ? 'No OpenAPI/schema file detected; consider adding contract documentation.' : '',
            rootTestsMissing ? 'Add or document root test strategy for CI confidence.' : '',
          ].filter(Boolean),
          'No additional actionable checks.',
        ),
      ]),
      toPageSection('Scanner', [
        `<p>V3 flags: <code>DEVELOPERDOC_DOC_GEN_V3</code> (default on unless <code>false</code>). V2 builder: <code>DEVELOPERDOC_DOC_GEN_V2</code> (${isDocGenV2Enabled() ? 'enabled' : 'disabled'}).</p>`,
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
