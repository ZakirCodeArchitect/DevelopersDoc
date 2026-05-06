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

function parseApiRoutes(metadata: JsonRecord): ApiRouteRecord[] {
  const raw = metadata.apiRoutes;
  if (!Array.isArray(raw)) return [];
  return raw.filter((r): r is ApiRouteRecord => r !== null && typeof r === 'object');
}

function buildApiTable(routes: ApiRouteRecord[]): string {
  const rows = routes.slice(0, 80).map((r) => {
    const methods = Array.isArray(r.methods) && r.methods.length ? r.methods.join(', ') : '—';
    const purpose = escapeHtml(r.purposeSummary ?? r.purpose ?? '—');
    const auth = escapeHtml(r.authType ?? (r.usesAuth ? 'session signal' : '—'));
    const db = escapeHtml((r.prismaOperations ?? []).slice(0, 6).join(', ') || (r.usesPrisma ? 'Prisma' : '—'));
    const envs = escapeHtml((r.envVarsReferenced ?? []).slice(0, 6).join(', ') || '—');
    const fx = escapeHtml((r.sideEffectsNarrative ?? []).join('; ') || '—');
    return `<tr><td class="border p-2 align-top"><code>${escapeHtml(methods)}</code></td><td class="border p-2 align-top"><code>${escapeHtml(r.routePath ?? '')}</code></td><td class="border p-2 align-top text-xs"><code>${escapeHtml(r.filePath ?? '')}</code></td><td class="border p-2 align-top text-xs">${purpose}</td><td class="border p-2 align-top text-xs">${auth}</td><td class="border p-2 align-top text-xs">${db}</td><td class="border p-2 align-top text-xs">${envs}</td><td class="border p-2 align-top text-xs">${fx}</td></tr>`;
  });
  return `<div class="overflow-x-auto"><table class="min-w-full text-xs border-collapse border border-gray-200"><thead><tr class="bg-gray-100"><th class="border p-2 text-left">Methods</th><th class="border p-2 text-left">Route</th><th class="border p-2 text-left">File</th><th class="border p-2 text-left">Purpose</th><th class="border p-2 text-left">Auth</th><th class="border p-2 text-left">Prisma ops</th><th class="border p-2 text-left">Env</th><th class="border p-2 text-left">Side effects</th></tr></thead><tbody>${rows}</tbody></table></div>`;
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

  const overviewText =
    (projectSummary && typeof projectSummary.overview === 'string' && projectSummary.overview) ||
    `Semantic scan (v3) for ${framework}.`;

  const mermaid = [
    'flowchart LR',
    '  Browser[Browser] --> Next[Next.js app]',
    '  Next --> Api[REST handlers]',
    '  Next --> Ui[Docs UI]',
    '  Api --> Db[(Database)]',
    apiRoutes.some((r) => r.routePath?.includes('/api/cli')) ? '  Cli[CLI] --> Api' : '',
  ]
    .filter(Boolean)
    .join('\n');

  const page1 = {
    title: 'Project Overview',
    sections: [
      toPageSection('', [
        `<p>${escapeHtml(overviewText)}</p>`,
        projectSummary && typeof projectSummary.productAngle === 'string'
          ? `<p><strong>Product angle:</strong> ${escapeHtml(projectSummary.productAngle)}</p>`
          : '',
        scanQuality
          ? `<p><strong>Scan quality:</strong> files scanned (capped) ${escapeHtml(String(scanQuality.filesScanned ?? ''))}/${escapeHtml(String(scanQuality.filesScannedCap ?? ''))}; cap hit: ${escapeHtml(String(scanQuality.scanFileCapHit ?? ''))}; API routes: ${escapeHtml(String(scanQuality.apiRoutesCount ?? ''))}; Prisma: ${escapeHtml(String(scanQuality.prismaProvider ?? 'n/a'))} (${escapeHtml(String(scanQuality.prismaModelCount ?? 0))} models); warnings: ${escapeHtml(String(scanQuality.warningsCount ?? 0))}.</p>`
          : '',
      ].filter(Boolean)),
      toPageSection('Runtime surfaces', [listItems(runtimeSurfaces, 'No surfaces listed — re-scan with v3 CLI.')]),
      toPageSection('Dependencies (sample)', [
        listItems(deps.slice(0, 25), 'No dependencies'),
        `<p><strong>devDependencies (sample):</strong></p>`,
        listItems(devDeps.slice(0, 15), 'None'),
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
    ],
  };

  const page2 = {
    title: 'Architecture Overview',
    sections: [
      toPageSection('', [
        '<p>This architecture summary is grounded in scan metadata: App Router, API routes, optional CLI sync, Prisma, Clerk, and email/share subsystems when detected.</p>',
      ]),
      toPageSection('Surfaces', [listItems(runtimeSurfaces, 'Run developerdoc scan with v3 CLI.')]),
      toPageSection('Mermaid', [
        `<pre class="whitespace-pre-wrap font-mono text-xs bg-gray-50 p-4 rounded border">${escapeHtml(mermaid)}</pre>`,
      ]),
      toPageSection('Evidence paths (from scan)', [
        listItems(
          unique([
            ...toStringArray((moduleAnalysis?.notes as string[]) || []),
            ...(apiRoutes.slice(0, 8).map((r) => r.filePath).filter(Boolean) as string[]),
          ]),
          'No paths',
        ),
      ]),
    ],
  };

  const setupPrereq = toStringArray(setupPlan?.prerequisites);
  const setupInstall = typeof setupPlan?.installCommand === 'string' ? setupPlan.installCommand : 'npm install';
  const setupEnvNames = toStringArray(setupPlan?.requiredVarNames);

  const page3 = {
    title: 'Local Setup Guide',
    sections: [
      toPageSection('Prerequisites', [listItems(setupPrereq, 'Add prerequisites to scanner setupPlan.')]),
      toPageSection('Install', [
        `<pre class="bg-gray-50 p-3 rounded border"><code>${escapeHtml(setupInstall)}</code></pre>`,
      ]),
      toPageSection('Environment file', [
        `<p>${escapeHtml(
          (setupPlan && typeof setupPlan.envFileConvention === 'string'
            ? setupPlan.envFileConvention
            : 'Create .env.local with names only in docs; never commit secrets.') as string,
        )}</p>`,
        listItems(setupEnvNames, 'No required names captured'),
      ]),
      toPageSection('Database', [
        listItems(toStringArray(setupPlan?.databaseSteps), 'Configure Prisma datasource URLs.'),
      ]),
      toPageSection('Auth', [listItems(toStringArray(setupPlan?.authSteps), 'Configure auth provider.')]),
      toPageSection('Email', [listItems(toStringArray(setupPlan?.emailNotes), 'Optional email setup.')]),
      toPageSection('Run locally', [listItems(toStringArray(setupPlan?.runLocally), 'npm run dev')]),
      ...(Array.isArray(setupPlan?.cliLocalTest) && (setupPlan?.cliLocalTest as string[]).length > 0
        ? [toPageSection('CLI package (local test)', [listItems(setupPlan?.cliLocalTest as string[], '')])]
        : []),
      toPageSection('Verify', [listItems(toStringArray(setupPlan?.verification), 'Sign in and exercise main flows.')]),
      toPageSection('Troubleshooting', [
        listItems(toStringArray(setupPlan?.troubleshooting), 'See Environment and Maintenance pages.'),
      ]),
    ],
  };

  const modules = moduleAnalysis && Array.isArray(moduleAnalysis.modules) ? moduleAnalysis.modules : [];
  const modBlocks =
    modules.slice(0, 35).map((m: JsonRecord) => {
      const name = escapeHtml(String(m.module ?? '?'));
      const resp = escapeHtml(String(m.detectedResponsibility ?? ''));
      const files = escapeHtml(toStringArray(m.keyFiles).slice(0, 8).join(', ') || '—');
      return `<div class="mb-6 border-b border-gray-100 pb-4"><h3 class="text-lg font-semibold">${name}</h3><p class="text-sm text-gray-700">${resp}</p><p class="text-xs mt-1"><strong>Example files:</strong> ${files}</p></div>`;
    }) || [];

  const page4 = {
    title: 'Folder & Module Structure',
    sections: [
      toPageSection('', ['<p>Module buckets from scanner (not a raw tree).</p>']),
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
    ],
  };

  const prismaModels: PrismaModelV3[] =
    prismaAnalysis && Array.isArray(prismaAnalysis.models) ? (prismaAnalysis.models as PrismaModelV3[]) : [];

  const prismaBlocks = prismaModels.slice(0, 60).map((model) => {
    const title = escapeHtml(model.name ?? 'Model');
    const role = escapeHtml(model.businessMeaning ?? '—');
    const fields = escapeHtml((model.keyFieldsSample ?? []).join(', ') || '—');
    const rel = escapeHtml((model.relationsSample ?? []).join('; ') || '—');
    const routes = escapeHtml((model.usedByRoutesApprox ?? []).join(', ') || '—');
    return `<div class="mb-6 border-b border-gray-100 pb-4"><h3 class="text-lg font-semibold">${title}</h3><p class="text-sm"><strong>Role:</strong> ${role}</p><p class="text-xs mt-2"><strong>Fields:</strong> ${fields}</p><p class="text-xs mt-1"><strong>Relations:</strong> ${rel}</p><p class="text-xs mt-1"><strong>Routes (heuristic):</strong> ${routes}</p></div>`;
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
        '<p>Flows are heuristic narratives; validate against source before relying on them for compliance.</p>',
      ]),
      ...flowSections,
    ],
  };

  const page10 = {
    title: 'Deployment & Operations',
    sections: [
      toPageSection('Artifacts', [
        listItems(unique(toStringArray(metadata.deploymentFiles)).slice(0, 30), 'No deployment files listed'),
      ]),
      toPageSection('Hints', [
        '<p>Align local and hosted env vars; rotate secrets after Clerk or database changes.</p>',
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

  const riskItems =
    riskAnalysis && Array.isArray(riskAnalysis.items) ? (riskAnalysis.items as JsonRecord[]) : [];
  const riskLines = riskItems.map((it) => {
    const sev = escapeHtml(String(it.severity ?? ''));
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
