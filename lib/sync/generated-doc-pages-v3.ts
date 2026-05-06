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

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function confidenceLabel(raw: unknown): string {
  const value = String(raw ?? '').toLowerCase();
  if (value === 'high' || value === 'medium' || value === 'low') return value;
  return 'inferred';
}

function uniqueSectionSlugs(sections: Array<{ title: string; type: 'html'; content: string[] }>) {
  const seen = new Map<string, number>();
  return sections.map((section) => {
    const base = slugify(section.title || 'section') || 'section';
    const count = seen.get(base) ?? 0;
    seen.set(base, count + 1);
    if (count === 0) return section;
    return { ...section, title: `${section.title} (${count + 1})` };
  });
}

function classifyDependencyRole(dep: string): string {
  const key = dep.toLowerCase();
  if (/clerk|auth|oauth|passport/.test(key)) return 'Auth';
  if (/prisma|drizzle|typeorm|sequelize|mongoose|pg|mysql|redis/.test(key)) return 'Database / data';
  if (/next|react|vue|svelte|router|nuxt/.test(key)) return 'Frontend / runtime';
  if (/tailwind|chakra|mui|radix|lucide|ui|style/.test(key)) return 'UI / styling';
  if (/nodemailer|smtp|mail|svix|webhook|queue|bull/.test(key)) return 'Integration / messaging';
  if (/eslint|typescript|vitest|jest|playwright|tsx|webpack|vite/.test(key)) return 'Tooling / quality';
  return 'Other';
}

function classifyRouteFamily(routePath: string): string {
  const p = routePath.toLowerCase();
  if (p.includes('/api/cli/')) return 'CLI/sync';
  if (p.includes('/publish') || p.includes('/published')) return 'publish/share';
  if (p.includes('/share')) return 'publish/share';
  if (p.includes('/webhook')) return 'webhook';
  if (p.includes('/auth') || p.includes('/session') || p.includes('/sign')) return 'auth/session';
  if (p.includes('/regen')) return 'regeneration';
  if (p.includes('/document')) return 'document CRUD';
  if (p.includes('/project') || p.includes('/resource')) return 'project/resource CRUD';
  return 'other';
}

function classifyEnvVarPurpose(envName: string): string {
  const key = envName.toUpperCase();
  if (key === 'NODE_ENV' || key === 'VERCEL_URL') return 'platform/runtime-provided';
  if (/FLAG|FEATURE|DEVELOPERDOC_DOC_GEN/i.test(key)) return 'feature flags';
  if (/DATABASE|DIRECT_URL|PRISMA|PG|MYSQL|REDIS/.test(key)) return 'database';
  if (/CLERK|AUTH|JWT|SESSION|TOKEN/.test(key)) return 'auth';
  if (/EMAIL|SMTP|MAIL|SENDGRID/.test(key)) return 'email/share';
  if (/DEBUG|CACHE|LOG/.test(key)) return 'optional debug/cache';
  if (/NEXT_PUBLIC/.test(key)) return 'required for local app';
  return 'required for local app';
}

function inferSetupCommands(
  rootPkgScripts?: {
    detectedDevScript?: string;
    detectedBuildScript?: string;
    detectedStartScript?: string;
    detectedTestScript?: string;
    detectedLintScript?: string;
  },
  packageManager = 'npm',
) {
  const pmInstall =
    packageManager === 'pnpm' ? 'pnpm install' : packageManager === 'yarn' ? 'yarn' : packageManager === 'bun' ? 'bun install' : 'npm install';
  const run = (scriptName?: string, fallback?: string) =>
    scriptName ? `npm run ${scriptName}` : fallback ?? '';
  return {
    install: pmInstall,
    dev: run(rootPkgScripts?.detectedDevScript, 'npm run dev'),
    build: run(rootPkgScripts?.detectedBuildScript, 'npm run build'),
    start: run(rootPkgScripts?.detectedStartScript, 'npm run start'),
    test: run(rootPkgScripts?.detectedTestScript, ''),
    lint: run(rootPkgScripts?.detectedLintScript, 'npm run lint'),
  };
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
  dbModelsTouched?: string[];
  httpStatuses?: string[];
  importedServices?: string[];
  responseStatusCodes?: string[];
  requestFields?: string[];
  requestBodyFields?: string[];
  queryParams?: string[];
  headersUsed?: string[];
  formDataFields?: string[];
  validationSignals?: string[];
  responseFields?: string[];
  failureCases?: string[];
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

type PackageScriptsAnalysisV4 = {
  packages?: Array<{
    packagePath?: string;
    packageName?: string;
    scripts?: Record<string, string>;
    detectedDevScript?: string;
    detectedBuildScript?: string;
    detectedStartScript?: string;
    detectedLintScript?: string;
    detectedTestScript?: string;
    detectedPrismaGenerateScript?: string;
    detectedPrismaMigrateScript?: string;
    detectedPrismaPushScript?: string;
    detectedPrismaStudioScript?: string;
    detectedSeedScript?: string;
    detectedScannerScripts?: string[];
  }>;
};

function parseApiRoutes(metadata: JsonRecord): ApiRouteRecord[] {
  const raw = metadata.apiRoutes;
  if (!Array.isArray(raw)) return [];
  return raw.filter((r): r is ApiRouteRecord => r !== null && typeof r === 'object');
}

function buildDependencyCategoryBlocks(deps: string[], devDeps: string[]): string[] {
  const grouped = new Map<string, string[]>();
  [...deps, ...devDeps].forEach((dep) => {
    const role = classifyDependencyRole(dep);
    grouped.set(role, [...(grouped.get(role) ?? []), dep]);
  });
  const categories: Array<{ name: string; values: string[] }> = Array.from(grouped.entries()).map(([name, vals]) => ({
    name,
    values: unique(vals).slice(0, 8),
  }));

  return categories
    .filter((c) => c.values.length > 0)
    .map(
      (c) =>
        `<div class="mb-3"><p><strong>${escapeHtml(c.name)}:</strong> ${c.values
          .map((v) => `<code>${escapeHtml(v)}</code>`)
          .join(', ')}</p></div>`,
    );
}

function buildApiTable(routes: ApiRouteRecord[]): string {
  const rows = routes.slice(0, 80).map((r) => {
    const methods = Array.isArray(r.methods) && r.methods.length ? r.methods.join(', ') : '—';
    const purpose = escapeHtml(r.purposeSummary ?? r.purpose ?? '—');
    const auth = escapeHtml(r.authType ?? (r.usesAuth ? 'session required (inferred)' : '—'));
    const models = escapeHtml((r.dbModelsTouched ?? []).slice(0, 4).join(', ') || (r.usesPrisma ? 'DB usage detected' : '—'));
    const fx = escapeHtml((r.sideEffectsNarrative ?? []).join('; ') || 'low');
    return `<tr><td class="border p-2 align-top"><code>${escapeHtml(methods)}</code></td><td class="border p-2 align-top"><code>${escapeHtml(r.routePath ?? '')}</code></td><td class="border p-2 align-top text-xs">${purpose}</td><td class="border p-2 align-top text-xs">${auth}</td><td class="border p-2 align-top text-xs">${models}</td><td class="border p-2 align-top text-xs">${fx}</td><td class="border p-2 align-top text-xs"><code>${escapeHtml(r.filePath ?? '')}</code></td></tr>`;
  });
  return `<div class="overflow-x-auto"><table class="min-w-full text-xs border-collapse border border-gray-200"><thead><tr class="bg-gray-100"><th class="border p-2 text-left">Method</th><th class="border p-2 text-left">Route</th><th class="border p-2 text-left">Purpose</th><th class="border p-2 text-left">Auth</th><th class="border p-2 text-left">Models touched / DB</th><th class="border p-2 text-left">Risk/Side effect</th><th class="border p-2 text-left">Source</th></tr></thead><tbody>${rows}</tbody></table></div>`;
}

function sampleWithOverflow(items: string[], max: number): { sample: string[]; overflow: number } {
  const sample = items.slice(0, max);
  return { sample, overflow: Math.max(0, items.length - sample.length) };
}

function scriptCmdFromDetected(key: string | undefined, fallback: string): string {
  return key ? `npm run ${key}` : fallback;
}

function requirednessLabel(raw: string): string {
  const v = String(raw || 'unknown');
  const map: Record<string, string> = {
    likely_required: 'likely_required',
    likely_optional: 'likely_optional',
    required_for_webhook: 'required_for_webhook',
    required_for_email_feature: 'required_for_email_feature',
    platform_provided: 'platform/runtime-provided',
    runtime_provided: 'platform/runtime-provided',
    optional_debug: 'optional_debug',
    optional_cache: 'optional_cache',
    feature_flag: 'feature_flag',
    unknown: 'unknown',
  };
  return map[v] ?? v;
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

function inferRuntimeFlows(args: {
  apiRoutes: ApiRouteRecord[];
  fileTree: string[];
  runtimeFlows: JsonRecord[];
}): Array<{ name: string; lines: string[]; evidence: string[]; confidence: string }> {
  const { apiRoutes, fileTree, runtimeFlows } = args;
  const hasRoute = (needle: string) => apiRoutes.some((r) => routeMatches(r, needle));
  const fromMetadata = runtimeFlows.map((f) => ({
    name: String(f.name ?? 'Flow'),
    lines: toStringArray(f.steps),
    evidence: [],
    confidence: confidenceLabel(f.confidence),
  }));
  const inferred: Array<{ name: string; lines: string[]; evidence: string[]; confidence: string }> = [];
  if (hasRoute('/api/cli/auth') || hasRoute('/api/cli/register')) {
    inferred.push({ name: 'CLI init / link', lines: ['Trigger: developer runs CLI init/link.', 'Entry: CLI auth/register routes.', 'Failure cases: invalid auth code, missing token, duplicate link.'], evidence: apiRoutes.filter((r) => routeMatches(r, '/api/cli/auth') || routeMatches(r, '/api/cli/register')).map((r) => r.filePath ?? '').filter(Boolean), confidence: 'medium' });
  }
  if (hasRoute('/api/cli/scan')) {
    inferred.push({ name: 'CLI scan', lines: ['Trigger: developer runs CLI scan.', 'Entry: /api/cli/scan.', 'Side effects: snapshot persistence and possible doc generation.'], evidence: apiRoutes.filter((r) => routeMatches(r, '/api/cli/scan')).map((r) => r.filePath ?? '').filter(Boolean), confidence: 'high' });
  }
  if (fileTree.some((p) => p.includes('doc-generation.service'))) {
    inferred.push({ name: 'Generated documentation creation/regeneration', lines: ['Trigger: first scan or explicit regenerate action.', 'Entry: doc generation service.', 'Outputs: document/page/section records refreshed from snapshot metadata.'], evidence: fileTree.filter((p) => p.includes('doc-generation.service') || p.includes('generated-doc-pages-v3')).slice(0, 4), confidence: 'high' });
  }
  if (fileTree.some((p) => /app\/docs|docs\//i.test(p))) {
    inferred.push({ name: 'Document rendering', lines: ['Trigger: docs reader/editor page request.', 'Entry: docs pages/components.', 'Failure cases: missing page slug, malformed HTML, auth boundary mismatch.'], evidence: fileTree.filter((p) => /docs/i.test(p)).slice(0, 6), confidence: 'medium' });
  }
  if (hasRoute('/publish') || hasRoute('/share') || hasRoute('/api/published')) {
    inferred.push({ name: 'Publishing and sharing', lines: ['Trigger: publish/share action.', 'Entry: publish/share routes.', 'Side effects: writes published/share records and may send notifications.'], evidence: apiRoutes.filter((r) => /publish|share|published/i.test(String(r.routePath ?? ''))).map((r) => r.filePath ?? '').filter(Boolean).slice(0, 6), confidence: 'medium' });
  }
  if (hasRoute('/webhooks')) {
    inferred.push({ name: 'Webhook/user sync', lines: ['Trigger: webhook event delivery.', 'Entry: webhook route.', 'Failure cases: invalid signature, payload parsing, idempotency gaps.'], evidence: apiRoutes.filter((r) => routeMatches(r, '/webhooks')).map((r) => r.filePath ?? '').filter(Boolean), confidence: 'medium' });
  }
  return [...fromMetadata, ...inferred];
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

  const bodyFields = (route.requestBodyFields ?? route.requestFields ?? []) as string[];
  const directModels = (route.dbModelsTouched ?? []).slice(0, 6);
  const serviceModels = (route.importedServices ?? []).length > 0 && route.usesPrisma ? ['service-level DB usage likely'] : [];
  const inferredModels = directModels.length === 0 && route.usesPrisma ? ['model inference unavailable'] : [];
  const requestLine = bodyFields.length ? bodyFields.map((f) => `${f} (detected from handler)`).join(', ') : 'Unknown';
  return {
    title: `${route.routePath ?? route.filePath ?? 'Route'} details`,
    html: `<div class="mb-6 rounded border border-gray-200 p-4">
      <p><strong>Purpose:</strong> ${escapeHtml(route.purposeSummary ?? route.purpose ?? 'No purpose summary captured.')}</p>
      <p><strong>Methods:</strong> <code>${escapeHtml(methods)}</code></p>
      <p><strong>Auth:</strong> ${escapeHtml(route.authType ?? (route.usesAuth ? 'Protected route (inferred)' : 'Public or unknown (needs confirmation)'))}</p>
      <p><strong>Expected request/body data:</strong> ${escapeHtml(requestLine)}</p>
      <p><strong>Query params:</strong> ${escapeHtml(((route.queryParams ?? []) as string[]).join(', ') || 'Unknown')}</p>
      <p><strong>Headers:</strong> ${escapeHtml(((route.headersUsed ?? []) as string[]).join(', ') || 'Unknown')}</p>
      <p><strong>Response shape:</strong> ${escapeHtml(
        (route.responseFields ?? []).join(', ') || 'Not explicitly extracted from NextResponse payloads (inferred).',
      )}</p>
      <p><strong>Response status codes:</strong> ${escapeHtml(
        (route.httpStatuses ?? []).join(', ') || 'No explicit status code literals detected.',
      )}</p>
      <p><strong>Direct models touched:</strong> ${escapeHtml(directModels.join(', ') || 'No direct model detected in handler')}</p>
      <p><strong>Service-level models touched:</strong> ${escapeHtml(serviceModels.join(', ') || 'No service-level model inference available')}</p>
      <p><strong>Inferred models:</strong> ${escapeHtml(inferredModels.join(', ') || 'none')}</p>
      <p><strong>Prisma operations:</strong> ${escapeHtml((route.prismaOperations ?? []).join(', ') || 'None detected')}</p>
      <p><strong>Service files inspected:</strong> ${escapeHtml(((route.importedServices ?? []) as string[]).join(', ') || 'None detected')}</p>
      <p><strong>Side effects:</strong> ${escapeHtml(sideEffects.join('; ') || 'No side effects captured.')}</p>
      <p><strong>Likely failure cases:</strong> ${escapeHtml((([...(route.failureCases ?? []), ...likelyFailures]) as string[]).join(' ') || 'No specific failure signal captured in metadata.')}</p>
      <p><strong>Source file:</strong> <code>${escapeHtml(route.filePath ?? 'unknown')}</code></p>
      <p><strong>Confidence:</strong> ${escapeHtml(confidenceLabel(route.analysisConfidence))}</p>
    </div>`,
  };
}

function moduleNarrative(moduleName: string): { responsibility: string; whyCare: string } | null {
  const key = moduleName.toLowerCase();
  const map: Record<string, { responsibility: string; whyCare: string }> = {
    app: {
      responsibility: 'Next.js App Router entry point for pages, layouts, auth screens, docs UI, and route segments.',
      whyCare: 'Changes here affect what users see and how routes are composed. New page-level features usually start here.',
    },
    'app/api': {
      responsibility: 'Backend route handlers for document CRUD, project management, publishing, sharing, CLI sync, and webhooks.',
      whyCare: 'Changes here affect auth boundaries, persistence, public/private APIs, and side effects such as email or doc generation.',
    },
    'app/docs': {
      responsibility: 'Private and published documentation reading/editing surface.',
      whyCare: 'This is the core user-facing documentation experience. It controls document layout, page rendering, editor behavior, and navigation.',
    },
    'app/published': {
      responsibility: 'Published documentation entry points or redirects.',
      whyCare: 'Changes here affect public documentation access and SEO/public sharing behavior.',
    },
    components: {
      responsibility: 'Reusable UI and feature components.',
      whyCare: 'Shared component changes can affect multiple pages and user flows.',
    },
    'components/docs': {
      responsibility: 'Documentation editor, reader, navigation, and published-view components.',
      whyCare: 'This is where most document interaction UX lives, including Tiptap rendering and HTML section display.',
    },
    lib: {
      responsibility: 'Server-side domain logic, helpers, and shared application services.',
      whyCare: 'This module is commonly imported by API routes and server components. Changes here can affect persistence, auth, caching, sharing, publishing, and email.',
    },
    'lib/sync': {
      responsibility: 'Repository sync, CLI token validation, snapshot storage, generated documentation creation, and regeneration.',
      whyCare: 'This is the bridge between a scanned local repo and generated documentation inside the hosted app.',
    },
    prisma: {
      responsibility: 'Database schema and Prisma client configuration.',
      whyCare: 'Model or relation changes affect persistence, API behavior, generated docs, and migrations.',
    },
    'packages/developerdoc-cli': {
      responsibility: 'Local CLI package used inside external repositories for init, scan, sync, and scan-quality commands.',
      whyCare: 'Bugs here directly affect onboarding, repo scan accuracy, and the quality of generated documentation.',
    },
    scripts: {
      responsibility: 'Operational or migration scripts.',
      whyCare: 'Scripts often perform one-off data migration or maintenance tasks and should be reviewed before production use.',
    },
    'proxy.ts': {
      responsibility: 'Authentication boundary for public/protected routes.',
      whyCare: 'Incorrect route matching can expose protected pages or block public/CLI/webhook endpoints.',
    },
    'middleware.ts': {
      responsibility: 'Authentication boundary for public/protected routes.',
      whyCare: 'Incorrect route matching can expose protected pages or block public/CLI/webhook endpoints.',
    },
    'next.config.ts': {
      responsibility: 'Next.js build/runtime configuration.',
      whyCare: 'Changes here affect image handling, compiler behavior, bundling, runtime behavior, and deployment output.',
    },
    'postcss.config': {
      responsibility: 'CSS/PostCSS pipeline configuration.',
      whyCare: 'Changes here affect Tailwind/CSS processing during local and production builds.',
    },
    'eslint.config': {
      responsibility: 'Linting and code-quality rules.',
      whyCare: 'Changes here affect CI/code-quality gates and developer feedback.',
    },
  };

  if (map[key]) return map[key];
  if (key.startsWith('components/docs')) return map['components/docs'];
  if (key.startsWith('components')) return map.components;
  if (key.startsWith('lib/sync')) return map['lib/sync'];
  if (key.startsWith('lib')) return map.lib;
  if (key.startsWith('postcss.config')) return map['postcss.config'];
  if (key.startsWith('eslint.config')) return map['eslint.config'];
  return null;
}

function extractEnvEntryNames(metadata: JsonRecord): string[] {
  const envAnalysis = metadata.envAnalysis as JsonRecord | undefined;
  const rawEntries = envAnalysis?.entries;
  if (!Array.isArray(rawEntries)) return [];
  return rawEntries
    .map((entry) => (entry && typeof entry === 'object' ? String((entry as JsonRecord).name ?? '') : ''))
    .filter((name) => name.length > 0);
}

function groupEnvNames(names: string[]) {
  const has = (n: string) => names.includes(n);
  const pickRegex = (re: RegExp) => names.filter((n) => re.test(n));
  const byPurpose = (purpose: string) => names.filter((n) => classifyEnvVarPurpose(n) === purpose);
  return {
    requiredLocal: unique([
      ...['DATABASE_URL', 'DIRECT_URL', 'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY', 'CLERK_SECRET_KEY', 'NEXT_PUBLIC_APP_URL'].filter(has),
      ...byPurpose('required for local app'),
      ...byPurpose('database'),
    ]),
    requiredWebhook: unique(['WEBHOOK_SECRET', ...pickRegex(/WEBHOOK|SVIX/i)].filter(has)),
    requiredEmail: unique(['EMAIL_USER', 'EMAIL_PASS', ...byPurpose('email/share')].filter(has)),
    clerkRouting: [
      ...[
        'NEXT_PUBLIC_CLERK_SIGN_IN_URL',
        'NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL',
        'NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL',
      ].filter(has),
    ],
    optionalDebugCache: unique([
      ...['DEBUG_PRISMA_QUERIES', 'DEBUG_API_SAVE', 'NAV_CACHE_SECONDS', 'PAGE_CACHE_SECONDS'].filter(has),
      ...byPurpose('optional debug/cache'),
      ...pickRegex(/^DEBUG_/i).filter((n) => !['DEBUG_PRISMA_QUERIES', 'DEBUG_API_SAVE'].includes(n)),
    ]),
    featureFlags: unique(['DEVELOPERDOC_DOC_GEN_V2', 'DEVELOPERDOC_DOC_GEN_V3', ...byPurpose('feature flags')].filter(has)),
    platformProvided: unique(['VERCEL_URL', 'NODE_ENV', ...byPurpose('platform/runtime-provided')].filter(has)),
  };
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
    const cls = escapeHtml(String(e.envClassification ?? e.likelyPurpose ?? classifyEnvVarPurpose(String(e.name ?? ''))));
    const vs = escapeHtml(String(e.valueStatus ?? '—'));
    const files = escapeHtml(toStringArray(e.files).slice(0, 4).join(', ') || '—');
    const req = escapeHtml(requirednessLabel(String(e.likelyRequired ?? 'unknown')));
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
  return m.metadataVersion === 3 || m.metadataVersion === 4;
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
  const packageScriptsAnalysis = (metadata.packageScriptsAnalysis as PackageScriptsAnalysisV4 | undefined) ?? {};
  const rootPkgScripts = packageScriptsAnalysis.packages?.find((p) => p.packagePath === 'package.json');
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

  const overviewText =
    (projectSummary && typeof projectSummary.overview === 'string' && projectSummary.overview) ||
    `${framework} application scanned with metadata version 3.`;

  const overviewBullets: string[] = [
    hasWebApp
      ? 'The repository hosts a web dashboard and user-facing documentation pages.'
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
  const startHereByRole: Array<{ role: string; paths: string[] }> = [
    { role: 'Frontend entry points', paths: fileTree.filter((p) => /(^|\/)(app|src\/app)\/(page|layout)\.(t|j)sx?$/.test(p)).slice(0, 5) },
    { role: 'Docs reader/editor', paths: fileTree.filter((p) => /docs|editor|viewer/i.test(p) && /\.(t|j)sx?$/.test(p)).slice(0, 6) },
    { role: 'API routes', paths: apiRoutes.map((r) => r.filePath ?? '').filter(Boolean).slice(0, 8) },
    { role: 'CLI package', paths: fileTree.filter((p) => /packages\/.*cli|\/cli\//i.test(p)).slice(0, 6) },
    { role: 'Database/schema', paths: fileTree.filter((p) => /prisma\/schema\.prisma|schema|migrations/i.test(p)).slice(0, 6) },
    { role: 'Sync/doc generation services', paths: fileTree.filter((p) => /sync|doc-generation|generated-doc-pages/i.test(p)).slice(0, 6) },
    { role: 'Auth boundary', paths: fileTree.filter((p) => /proxy\.ts|middleware\.ts|auth/i.test(p)).slice(0, 6) },
  ];
  const dependencyCategoryBlocks = buildDependencyCategoryBlocks(deps, devDeps);

  const mermaid = [
    'flowchart LR',
    '  Browser["Browser / Web UI"] --> App["App / router layer"]',
    authAnalysis?.proxyMiddleware ? '  Auth["Clerk + proxy.ts/middleware.ts"] --> App' : '',
    '  App --> Api["API Routes (app/api/*)"]',
    '  Api --> Service["Service layer + lib/db.ts"]',
    hasDb ? '  Service --> Prisma["Prisma Client"]' : '',
    hasDb ? '  Prisma --> Pg[("PostgreSQL")]' : '',
    hasCliSync ? '  CLI["packages/developerdoc-cli"] --> CliAuth["/api/cli/auth/*"]' : '',
    hasCliSync ? '  CLI --> CliRegister["/api/cli/register*"]' : '',
    hasCliSync ? '  CLI --> CliScan["/api/cli/scan"]' : '',
    hasCliSync ? '  CliScan --> Snapshot["DocSyncSnapshot"]' : '',
    hasDocsPipeline ? '  Snapshot --> V3["Generated docs builder"]' : '',
    hasDocsPipeline ? '  V3 --> Output["Document / Page / Section output"]' : '',
    hasPublicPublished ? '  Output --> Public["Publish/share/public access"]' : '',
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
          hasCliSync
            ? 'The product appears to combine a web documentation surface with optional local CLI sync and generated-doc automation.'
            : 'The product appears to provide a documentation web surface with optional backend automation inferred from scanned routes and modules.',
        )}</p>`,
        listItems(overviewBullets, 'No reliable product summary signals captured from this scan.'),
      ].filter(Boolean)),
      toPageSection('Runtime surfaces', [listItems(runtimeSurfaces, 'No runtime surfaces listed — re-run v3 scan.')]),
      toPageSection('Start here for developers', [
        startHereByRole
          .filter((g) => g.paths.length > 0)
          .map((g) => `<p><strong>${escapeHtml(g.role)}:</strong> ${g.paths.map((p) => `<code>${escapeHtml(p)}</code>`).join(', ')}</p>`)
          .join('') || '<p><em>Role-grouped onboarding paths not detected in current scan depth.</em></p>',
      ]),
      toPageSection('Main dependencies', [
        '<p>Dependencies are grouped by role to help onboarding; only high-signal packages are shown here.</p>',
        dependencyCategoryBlocks.length
          ? dependencyCategoryBlocks.join('')
          : '<p><em>No categorized dependency signals detected from this scan.</em></p>',
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
        `<pre data-generated-mermaid="true" class="whitespace-pre-wrap font-mono text-xs bg-gray-50 p-4 rounded border">${escapeHtml(mermaid)}</pre>`,
        '<p><em>Mermaid source (rendered inline when Mermaid is available). If rendering is unavailable, this source block remains the canonical diagram input.</em></p>',
      ]),
      toPageSection('How data moves', [
        `<ul>
          <li><strong>Web document editing flow:</strong> User opens docs UI; Clerk session protects private routes; UI mutations hit docs APIs; handlers call <code>lib/db.ts</code> and service logic; Prisma persists <code>Document</code>/<code>Page</code>/<code>Section</code>; cache revalidation updates navigation and rendered state.</li>
          <li><strong>CLI scan flow:</strong> Developer runs CLI scan; scanner builds <code>metadataVersion 3</code>; payload posts to <code>/api/cli/scan</code>; server validates sync token; snapshot is stored as <code>DocSyncSnapshot</code>; generated docs are created/refreshed from snapshot metadata.</li>
          <li><strong>Publish/share flow:</strong> Authenticated user publishes or shares docs through publish/share routes; API writes publish/share records (inferred from route + Prisma operations); public or invited access reads from those records.</li>
        </ul>`,
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
  const setupEnvNames = unique([...toStringArray(setupPlan?.requiredVarNames), ...extractEnvEntryNames(metadata)]);
  const devRunCmd = scriptCmdFromDetected(rootPkgScripts?.detectedDevScript, 'next dev');
  const prismaGenerateCmd = scriptCmdFromDetected(rootPkgScripts?.detectedPrismaGenerateScript, 'npx prisma generate');
  const prismaMigrateCmd = scriptCmdFromDetected(rootPkgScripts?.detectedPrismaMigrateScript, 'npx prisma migrate dev');
  const prismaDeployCmd = rootPkgScripts?.scripts
    ? (() => {
        const deploy = Object.entries(rootPkgScripts.scripts).find(([, value]) =>
          /prisma\s+migrate\s+deploy/i.test(value),
        )?.[0];
        return deploy ? `npm run ${deploy}` : 'npx prisma migrate deploy';
      })()
    : 'npx prisma migrate deploy';
  const prismaPushCmd =
    rootPkgScripts?.detectedPrismaPushScript
      ? `npm run ${rootPkgScripts.detectedPrismaPushScript}`
      : fileTree.some((p) => p.includes('prisma/'))
        ? 'npx prisma db push'
        : '';
  const prismaStudioCmd =
    rootPkgScripts?.detectedPrismaStudioScript
      ? `npm run ${rootPkgScripts.detectedPrismaStudioScript}`
      : fileTree.some((p) => p.includes('prisma/'))
        ? 'npx prisma studio'
        : '';
  const setupHasMigrationsFolder = fileTree.some((p) => p.startsWith('prisma/migrations/'));
  const setupCommands = inferSetupCommands(rootPkgScripts, String(metadata.packageManager ?? 'npm'));

  const envGroups = groupEnvNames(setupEnvNames);
  const localTemplateVars = unique([
    ...envGroups.requiredLocal,
    ...envGroups.requiredWebhook,
    ...envGroups.requiredEmail,
    ...envGroups.clerkRouting,
  ]);
  const localEnvTemplate = localTemplateVars.length
    ? localTemplateVars.map((name) => `${name}=`).join('\n')
    : '# No required env names detected in scan metadata';

  const page3 = {
    title: 'Local Setup Guide',
    sections: [
      toPageSection('Prerequisites', [listItems(setupPrereq, 'Add prerequisites to scanner setupPlan.')]),
      toPageSection('Install', [
        `<pre class="bg-gray-50 p-3 rounded border"><code>${escapeHtml(setupInstall || setupCommands.install)}</code></pre>`,
      ]),
      toPageSection('Detected package scripts', [
        rootPkgScripts
          ? `<ul>
              <li><strong>dev:</strong> <code>${escapeHtml(setupCommands.dev)}</code></li>
              <li><strong>build:</strong> <code>${escapeHtml(setupCommands.build)}</code></li>
              <li><strong>start:</strong> <code>${escapeHtml(setupCommands.start)}</code></li>
              <li><strong>test:</strong> ${setupCommands.test ? `<code>${escapeHtml(setupCommands.test)}</code>` : '<em>missing root test script (recommended improvement)</em>'}</li>
              <li><strong>lint:</strong> <code>${escapeHtml(setupCommands.lint)}</code></li>
              <li><strong>prisma generate:</strong> <code>${escapeHtml(prismaGenerateCmd)}</code></li>
              <li><strong>prisma migrate:</strong> ${rootPkgScripts.detectedPrismaMigrateScript ? `<code>${escapeHtml(prismaMigrateCmd)}</code>` : '<em>no migrate script detected</em>'}</li>
              <li><strong>prisma db push:</strong> ${prismaPushCmd ? `<code>${escapeHtml(prismaPushCmd)}</code>` : '<em>not detected</em>'}</li>
              <li><strong>prisma studio:</strong> ${prismaStudioCmd ? `<code>${escapeHtml(prismaStudioCmd)}</code>` : '<em>not detected</em>'}</li>
            </ul>`
          : '<p><em>package.json script analysis unavailable in this snapshot.</em></p>',
      ]),
      toPageSection('Minimal env template', [
        `<p>${escapeHtml(
          (setupPlan && typeof setupPlan.envFileConvention === 'string'
            ? setupPlan.envFileConvention
            : 'Create .env.local with names only in docs; never commit secrets.') as string,
        )}</p>`,
        `<pre class="bg-gray-50 p-3 rounded border"><code>${escapeHtml(localEnvTemplate)}</code></pre>`,
        `<p><strong>Required for local app:</strong> ${envGroups.requiredLocal.length ? envGroups.requiredLocal.map((v) => `<code>${escapeHtml(v)}</code>`).join(', ') : '<em>none detected</em>'}</p>`,
        `<p><strong>Required for webhook/user sync:</strong> ${envGroups.requiredWebhook.length ? envGroups.requiredWebhook.map((v) => `<code>${escapeHtml(v)}</code>`).join(', ') : '<em>none detected</em>'}</p>`,
        `<p><strong>Required for email/share features:</strong> ${envGroups.requiredEmail.length ? envGroups.requiredEmail.map((v) => `<code>${escapeHtml(v)}</code>`).join(', ') : '<em>none detected</em>'}</p>`,
        `<p><strong>Public Clerk routing:</strong> ${envGroups.clerkRouting.length ? envGroups.clerkRouting.map((v) => `<code>${escapeHtml(v)}</code>`).join(', ') : '<em>none detected</em>'}</p>`,
        `<p><strong>Optional debug/cache:</strong> ${envGroups.optionalDebugCache.length ? envGroups.optionalDebugCache.map((v) => `<code>${escapeHtml(v)}</code>`).join(', ') : '<em>none detected</em>'}</p>`,
        `<p><strong>Feature flags:</strong> ${envGroups.featureFlags.length ? envGroups.featureFlags.map((v) => `<code>${escapeHtml(v)}</code>`).join(', ') : '<em>none detected</em>'}</p>`,
        `<p><strong>Platform-provided:</strong> ${envGroups.platformProvided.length ? envGroups.platformProvided.map((v) => `<code>${escapeHtml(v)}</code>`).join(', ') : '<em>none detected</em>'}</p>`,
        setupEnvNames.length === 0 ? '<p><em>No required variable names captured in this scan.</em></p>' : '',
      ]),
      toPageSection('Database', [
        listItems(toStringArray(setupPlan?.databaseSteps), 'Configure Prisma datasource URLs.'),
        `<p>${escapeHtml(
          setupHasMigrationsFolder || Boolean(rootPkgScripts?.detectedPrismaMigrateScript)
            ? 'Migration workflow detected. Use migrate commands for schema changes and production deploy.'
            : 'No migrations folder or migrate script detected. Prefer db push-style schema sync for local dev unless your team documents a migration workflow.',
        )}</p>`,
        `<pre class="bg-gray-50 p-3 rounded border"><code>${escapeHtml(
          [prismaGenerateCmd, prismaMigrateCmd, prismaPushCmd, prismaStudioCmd].filter(Boolean).join('\n'),
        )}</code></pre>`,
      ]),
      toPageSection('Auth', [listItems(toStringArray(setupPlan?.authSteps), 'Configure auth provider.')]),
      toPageSection('Email', [listItems(toStringArray(setupPlan?.emailNotes), 'Optional email setup.')]),
      toPageSection(
        'Run locally',
        [listItems(unique([devRunCmd, ...toStringArray(setupPlan?.runLocally)]), 'npm run dev')],
      ),
      ...(Array.isArray(setupPlan?.runLocallyNotes) && (setupPlan?.runLocallyNotes as string[]).length > 0
        ? [toPageSection('Run locally notes', [listItems(setupPlan?.runLocallyNotes as string[], '')])]
        : []),
      ...(Array.isArray(setupPlan?.cliLocalTest) && (setupPlan?.cliLocalTest as string[]).length > 0
        ? [toPageSection('CLI package (local test)', [listItems(setupPlan?.cliLocalTest as string[], '')])]
        : []),
      toPageSection('Verification checklist', [
        listItems(
          [
            'Install dependencies.',
            'Configure .env.local values.',
            setupHasMigrationsFolder || Boolean(rootPkgScripts?.detectedPrismaMigrateScript)
              ? 'Run Prisma generate and migrate.'
              : 'Run Prisma generate and db push (or your documented schema-sync command).',
            'Run local dev server.',
            'Verify auth flow works.',
            'Create or select project.',
            'Run CLI scan successfully.',
            'Verify generated docs appear in dashboard.',
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
    { match: /(^|\/)scripts\//i, title: 'Operational scripts', desc: 'Automation entry points for setup, migrations, release, or maintenance tasks.' },
  ];
  const modBlocks =
    modules.slice(0, 35).map((m: JsonRecord) => {
      const name = escapeHtml(String(m.module ?? '?'));
      const rawName = String(m.module ?? '?');
      const mapped = moduleNarrative(rawName);
      const scannerResp = String(m.detectedResponsibility ?? '').trim();
      const cleanedScannerResp =
        scannerResp.startsWith('Code under ') && scannerResp.endsWith(rawName)
          ? `Module rooted at ${rawName}; review key files to confirm ownership boundaries.`
          : scannerResp;
      const resp = escapeHtml(mapped?.responsibility ?? (cleanedScannerResp || 'Needs confirmation from source.'));
      const moduleFiles = toStringArray(m.keyFiles);
      const sampled = sampleWithOverflow(moduleFiles, 5);
      const files = escapeHtml(sampled.sample.join(', ') || '—');
      const subareas = toStringArray(m.subareas ?? m.keySubareas);
      const dependsOn = toStringArray(m.dependsOn ?? m.importsFrom);
      const usedBy = toStringArray(m.usedBy ?? m.importedBy);
      const runtimeImpact = String(m.runtimeImpact ?? 'Affects runtime behavior when this module changes.');
      const examples = toStringArray(m.commonChanges ?? m.changeExamples);
      const confidence = confidenceLabel(m.confidence ?? m.analysisConfidence);
      return `<div class="mb-6 rounded border border-gray-200 p-4">
        <h3 class="text-lg font-semibold">${name}</h3>
        <p class="text-sm text-gray-700"><strong>Responsibility:</strong> ${resp}</p>
        <p class="text-sm text-gray-700"><strong>Why a new developer should care:</strong> ${escapeHtml(
          mapped?.whyCare ?? 'This module participates in runtime behavior; verify ownership and change impact from linked files.',
        )}</p>
        <p class="text-xs mt-1"><strong>Important files:</strong> ${files}${sampled.overflow > 0 ? ` <em>plus ${sampled.overflow} more.</em>` : ''}</p>
        <p class="text-xs mt-1"><strong>Key subareas:</strong> ${escapeHtml(subareas.join(', ') || 'none detected')}</p>
        <p class="text-xs mt-1"><strong>Depends on:</strong> ${escapeHtml(dependsOn.join(', ') || 'not inferred')}</p>
        <p class="text-xs mt-1"><strong>Used by:</strong> ${escapeHtml(usedBy.join(', ') || 'not inferred')}</p>
        <p class="text-xs mt-1"><strong>Runtime impact:</strong> ${escapeHtml(runtimeImpact)}</p>
        <p class="text-xs mt-1"><strong>Common change examples:</strong> ${escapeHtml(examples.join('; ') || 'add route/component/service, update data contract, adjust validations')}</p>
        <p class="text-xs mt-1"><strong>Evidence confidence:</strong> ${escapeHtml(confidence)}</p>
      </div>`;
    }) || [];

  const importantRootFilePattern =
    /(^package\.json$)|(^next\.config\.)|(^proxy\.ts$)|(^middleware\.ts$)|(^prisma\/schema\.prisma$)|(^eslint\.config\.)|(^postcss\.config\.)|(^vercel\.json$)|(^\.github\/workflows\/.+)|(^README\.md$)/i;

  const specialFileNotes = fileTree
    .filter((f) => importantRootFilePattern.test(f))
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
      toPageSection('Backend route families', [
        (() => {
          const familyMap = new Map<string, string[]>();
          apiRoutes.forEach((r) => {
            const family = classifyRouteFamily(String(r.routePath ?? ''));
            familyMap.set(family, [...(familyMap.get(family) ?? []), String(r.routePath ?? '')]);
          });
          const lines = Array.from(familyMap.entries())
            .filter(([, routes]) => routes.length > 0 && routes.some(Boolean))
            .map(([family, routes]) => `<p><strong>${escapeHtml(family)}:</strong> ${unique(routes).slice(0, 6).map((p) => `<code>${escapeHtml(p)}</code>`).join(', ')}</p>`)
            .join('');
          return lines || '<p><em>No route family evidence detected.</em></p>';
        })(),
      ]),
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
          '/api/cli/changes',
          '/api/cli/project-status',
          '/api/documents/[id]/publish',
          '/api/documents/[id]/share',
          '/api/projects/[id]/share',
          '/api/webhooks/clerk',
          '/api/published',
          '/api/published/[slug]',
          '/api/docs',
          '/api/projects',
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
    return `<div class="mb-6 border-b border-gray-100 pb-4"><h3 class="text-lg font-semibold">${title}</h3><p class="text-sm"><strong>Role:</strong> ${role}</p><p class="text-xs mt-2"><strong>Fields:</strong> ${fields}</p><p class="text-xs mt-1"><strong>Relations:</strong> ${rel}</p><p class="text-xs mt-1"><strong>Inferred route usage:</strong> ${routes}</p><p class="text-xs mt-1"><strong>Created by:</strong> ${routes || 'inferred from service flow'}</p><p class="text-xs mt-1"><strong>Read by:</strong> ${routes || 'inferred from service flow'}</p><p class="text-xs mt-1"><strong>Updated by:</strong> ${routes || 'inferred from service flow'}</p><p class="text-xs mt-1"><strong>Deleted by:</strong> not detected</p><p class="text-xs mt-1"><strong>Lifecycle notes:</strong> inferred from route/service analysis</p><p class="text-xs mt-1"><strong>Why it matters:</strong> ${role}</p></div>`;
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
             <p><strong>auth.protect:</strong> ${proxy.usesAuthProtect ? 'yes' : 'no'}</p>
             <p><strong>Important:</strong> Excluded from Clerk middleware is not the same as public access. Replacement protections should be explicit: <code>/api/webhooks/*</code> uses webhook signature verification, <code>/api/published/*</code> is intentional public read access, and <code>/api/cli/*</code> is protected by CLI token/device auth inside handlers.</p>`
          : '<p><em>No proxy/middleware file captured — confirm proxy.ts or middleware.ts path.</em></p>',
      ]),
      toPageSection('C. CLI sync authentication', [
        listItems(toStringArray(authAnalysis?.cliSyncAuth), 'No CLI sync routes.'),
      ]),
      toPageSection('D. CLI device/browser auth', [
        listItems(toStringArray(authAnalysis?.cliDeviceAuth), 'No CLI auth routes.'),
      ]),
      toPageSection('E. Webhook signature auth', [listItems(toStringArray(authAnalysis?.webhookAuth), 'No webhook routes.')]),
      toPageSection('F. Public published docs API', [
        listItems(toStringArray(authAnalysis?.publicPublishedRoutes), 'None detected.'),
        '<p>Verify published JSON does not leak private fields (e.g. author email).</p>',
      ]),
    ],
  };

  const feBullets = frontendAnalysis && Array.isArray(frontendAnalysis.bullets) ? frontendAnalysis.bullets : [];
  const frontendFiles = fileTree.filter((p) => /(^|\/)(app|pages|src\/app|src\/pages|components)\//.test(p));
  const layoutFiles = frontendFiles.filter((p) => /layout\.(t|j)sx?$/.test(p));
  const surfaceFiles = {
    viewerEditor: frontendFiles.filter((p) => /docs|editor|viewer/i.test(p)).slice(0, 8),
    search: frontendFiles.filter((p) => /search/i.test(p)).slice(0, 5),
    publishShare: frontendFiles.filter((p) => /publish|share/i.test(p)).slice(0, 5),
    auth: frontendFiles.filter((p) => /sign|auth|login/i.test(p)).slice(0, 5),
    ui: frontendFiles.filter((p) => /components\/ui|shared|common/i.test(p)).slice(0, 8),
  };

  const page8 = {
    title: 'Frontend Architecture',
    sections: [
      toPageSection('', [
        `<p>${escapeHtml(
          /next/i.test(framework)
            ? 'Next.js frontend runtime detected. This page maps App Router surfaces, component roles, and data touchpoints.'
            : 'Frontend runtime detected. This page maps pages/screens/components and data touchpoints with stack-agnostic language.',
        )}</p>`,
      ]),
      toPageSection('App/router/pages inventory', [
        listItems(frontendFiles.slice(0, 20), 'No frontend page/screen files detected.'),
      ]),
      toPageSection('Layout hierarchy', [listItems(layoutFiles, 'No explicit layout files detected.')]),
      toPageSection('Important frontend components grouped by role', [
        `<p><strong>Docs viewer/editor:</strong> ${surfaceFiles.viewerEditor.map((p) => `<code>${escapeHtml(p)}</code>`).join(', ') || '<em>none detected</em>'}</p>`,
        `<p><strong>Search:</strong> ${surfaceFiles.search.map((p) => `<code>${escapeHtml(p)}</code>`).join(', ') || '<em>none detected</em>'}</p>`,
        `<p><strong>Sharing/publishing UI:</strong> ${surfaceFiles.publishShare.map((p) => `<code>${escapeHtml(p)}</code>`).join(', ') || '<em>none detected</em>'}</p>`,
        `<p><strong>Auth screens:</strong> ${surfaceFiles.auth.map((p) => `<code>${escapeHtml(p)}</code>`).join(', ') || '<em>none detected</em>'}</p>`,
        `<p><strong>Reusable UI:</strong> ${surfaceFiles.ui.map((p) => `<code>${escapeHtml(p)}</code>`).join(', ') || '<em>none detected</em>'}</p>`,
      ]),
      toPageSection('Signals and runtime notes', [
        listItems(toStringArray(feBullets), 'Re-run scan for frontendAnalysis.'),
        `<p><strong>Data-fetching/API touchpoints:</strong> ${escapeHtml(
          apiRoutes.length ? 'Frontend likely talks to internal API routes; verify fetch/server-action boundaries in page components.' : 'No API touchpoint evidence detected.',
        )}</p>`,
        `<p><strong>Risks/notes:</strong> ${escapeHtml(
          frontendFiles.length > 120
            ? 'Large frontend surface area detected; ownership boundaries and route-level conventions should be documented.'
            : 'Route boundaries and sanitization behavior should still be reviewed for editor/viewer paths.',
        )}</p>`,
      ]),
      toPageSection('Evidence files', [listItems(frontendFiles.slice(0, 20), 'No frontend evidence files detected.')]),
    ],
  };

  const inferredFlows = inferRuntimeFlows({
    apiRoutes,
    fileTree,
    runtimeFlows: runtimeFlows as JsonRecord[],
  });

  const page9 = {
    title: 'Key Runtime Flows',
    sections: [
      toPageSection('', [
        '<p>These flows are grounded in route and module metadata. Each step references concrete endpoints/services/models where detected, and marks assumptions as inferred.</p>',
      ]),
      ...inferredFlows.map((flow) =>
        toPageSection(flow.name, [
          listItems(flow.lines, 'No flow steps captured'),
          `<p><strong>Evidence files:</strong> ${flow.evidence.length ? flow.evidence.map((f) => `<code>${escapeHtml(f)}</code>`).join(', ') : '<em>inferred from metadata only</em>'}</p>`,
          `<p><strong>Confidence:</strong> ${escapeHtml(flow.confidence)}</p>`,
        ]),
      ),
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
  const deployEnvGroups = groupEnvNames(extractEnvEntryNames(metadata));

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
          [
            scriptCmdFromDetected(rootPkgScripts?.detectedBuildScript, 'npm run build'),
            scriptCmdFromDetected(rootPkgScripts?.detectedStartScript, 'npm run start'),
          ]
            .filter(Boolean)
            .join('\n'),
        )}</code></pre>`,
      ]),
      toPageSection('Required production env vars', [
        `<p><strong>Core app + auth:</strong> ${[...deployEnvGroups.requiredLocal, ...deployEnvGroups.clerkRouting]
          .filter((n) => !deployEnvGroups.optionalDebugCache.includes(n) && !deployEnvGroups.featureFlags.includes(n))
          .map((n) => `<code>${escapeHtml(n)}</code>`)
          .join(', ') || '<em>none detected</em>'}</p>`,
        `<p><strong>Webhook/user sync:</strong> ${
          deployEnvGroups.requiredWebhook.map((n) => `<code>${escapeHtml(n)}</code>`).join(', ') || '<em>none detected</em>'
        }</p>`,
        `<p><strong>Email/share features:</strong> ${
          deployEnvGroups.requiredEmail.map((n) => `<code>${escapeHtml(n)}</code>`).join(', ') || '<em>none detected</em>'
        }</p>`,
      ]),
      toPageSection('Optional production flags', [
        `<p><strong>Debug/cache:</strong> ${
          deployEnvGroups.optionalDebugCache.map((n) => `<code>${escapeHtml(n)}</code>`).join(', ') || '<em>none detected</em>'
        }</p>`,
        `<p><strong>Feature flags:</strong> ${
          deployEnvGroups.featureFlags.map((n) => `<code>${escapeHtml(n)}</code>`).join(', ') || '<em>none detected</em>'
        }</p>`,
        `<p><strong>Platform-provided:</strong> ${
          deployEnvGroups.platformProvided.map((n) => `<code>${escapeHtml(n)}</code>`).join(', ') || '<em>none detected</em>'
        }</p>`,
      ]),
      toPageSection('Database migration/deploy notes', [
        listItems(
          [
            hasMigrationsFolder
              ? 'Prisma migrations folder detected; ensure migration step is part of deploy.'
              : 'No prisma/migrations folder detected. Confirm whether `db push` is intentional for this environment.',
            rootPkgScripts?.detectedPrismaMigrateScript
              ? `Use script-based local migration command: ${prismaMigrateCmd}.`
              : 'No prisma migrate script detected; use npx prisma migrate dev for local setup.',
            `For production deployments, use: ${prismaDeployCmd}.`,
          ],
          'No migration notes detected.',
        ),
      ]),
      toPageSection('CI/CD files', [
        listItems(deploymentFiles.filter((f) => f.includes('.github/workflows')).slice(0, 20), 'No CI/CD workflow files detected.'),
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
        '<p><strong>Note:</strong> <code>VERCEL_URL</code> and <code>NODE_ENV</code> are platform/runtime-provided and are usually not set manually in <code>.env.local</code>.</p>',
        buildEnvTableV3(metadata),
      ]),
    ],
  };

  const groupedRiskBlocks = (section: string) => {
    const items = riskItems.filter((it) => {
      const title = String(it.title ?? '').toLowerCase();
      const severity = String(it.severity ?? '');
      if (section === 'real') return severity === 'risk';
      if (section === 'needs_confirmation') return severity === 'needs_confirmation';
      if (section === 'recommended') return severity === 'recommended_improvement';
      if (section === 'intentional_public') return severity === 'info' && title.includes('public published api');
      if (section === 'doc_lifecycle') return title.includes('generated documentation regeneration');
      if (section === 'operational') return title.includes('build script') || title.includes('migrations');
      return false;
    });
    if (!items.length) return '<p><em>None detected from this scan.</em></p>';
    return `<ul>${items
      .map((it) => {
        const title = escapeHtml(String(it.title ?? ''));
        const detail = escapeHtml(String(it.detail ?? ''));
        const nextStep = title.toLowerCase().includes('build script')
          ? 'Remove `|| true` from build and keep non-blocking checks in a separate script.'
          : title.toLowerCase().includes('no prisma/migrations')
            ? 'Decide production migration strategy and document it in deployment notes.'
            : title.toLowerCase().includes('public published api')
              ? 'Review public response payloads and ensure private fields are excluded.'
              : title.toLowerCase().includes('no root test script')
                ? 'Add a root test script or document package-scoped test policy.'
                : title.toLowerCase().includes('generated documentation regeneration')
                  ? 'Document regeneration trigger timing and overwrite/merge behavior.'
                  : title.toLowerCase().includes('missing .env.example')
                    ? 'Add committed .env.example with names only.'
                    : 'Review owner module and define explicit guardrails.';
        return `<li><strong>${title}</strong><br/><span>Why it matters: ${detail}</span><br/><span>Next step: ${nextStep}</span></li>`;
      })
      .join('')}</ul>`;
  };

  const page12 = {
    title: 'Maintenance, Risks & Technical Debt',
    sections: [
      toPageSection('Codebase health', [
        '<p>Findings are grouped by scanner-assigned risk type so triage can focus on production impact first.</p>',
      ]),
      toPageSection('Real risks', [groupedRiskBlocks('real')]),
      toPageSection('Needs confirmation', [groupedRiskBlocks('needs_confirmation')]),
      toPageSection('Recommended improvements', [groupedRiskBlocks('recommended')]),
      toPageSection('Intentional public behavior', [groupedRiskBlocks('intentional_public')]),
      toPageSection('Documentation lifecycle behavior', [groupedRiskBlocks('doc_lifecycle')]),
      toPageSection('Operational behavior', [groupedRiskBlocks('operational')]),
      toPageSection('Scanner confidence', [
        scanQuality
          ? `<p>Confidence signals: files scanned <strong>${escapeHtml(String(scanQuality.filesScanned ?? '?'))}</strong>/<strong>${escapeHtml(
              String(scanQuality.filesScannedCap ?? '?'),
            )}</strong>, warnings <strong>${escapeHtml(String(scanQuality.warningsCount ?? '?'))}</strong>, cap hit: <strong>${escapeHtml(
              String(scanQuality.scanFileCapHit ?? false),
            )}</strong>.</p>`
          : '<p><em>No scan quality metadata available.</em></p>',
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

  const pages = [
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
  return pages.map((page) => ({
    ...page,
    sections: uniqueSectionSlugs(page.sections),
  }));
}
