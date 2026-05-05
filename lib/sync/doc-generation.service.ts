import { prisma } from '@/lib/db';
import { revalidateDocsNavData } from '@/lib/revalidate-docs-cache';

type JsonRecord = Record<string, unknown>;

const GENERATED_DOC_TITLE = 'Generated Project Documentation';
const GENERATED_DOC_DESCRIPTION =
  'Auto-generated from your codebase scan. Review and edit before publishing.';
const GENERATED_SUGGESTION_TYPE = 'initial_docs_generation';

function toObject(value: unknown): JsonRecord {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return value as JsonRecord;
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values));
}

function listItems(items: string[], emptyFallback: string): string {
  if (items.length === 0) return `<p>${emptyFallback}</p>`;
  return `<ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function packageHighlights(packages: string[]): string[] {
  const lower = packages.map((pkg) => pkg.toLowerCase());
  const highlights: string[] = [];

  if (lower.some((pkg) => pkg.includes('next'))) highlights.push('Framework: Next.js (detected)');
  if (lower.some((pkg) => pkg.includes('react'))) highlights.push('UI: React (detected)');
  if (lower.some((pkg) => pkg.includes('prisma'))) highlights.push('Database ORM: Prisma (detected)');
  if (lower.some((pkg) => pkg.includes('clerk'))) highlights.push('Authentication: Clerk (likely)');
  if (lower.some((pkg) => pkg.includes('drizzle'))) highlights.push('Database ORM: Drizzle (detected)');
  if (lower.some((pkg) => pkg.includes('vercel'))) highlights.push('Deployment target: Vercel (likely)');
  if (lower.some((pkg) => pkg.includes('aws'))) highlights.push('Deployment target: AWS-related packages detected');

  return highlights;
}

function normalizeEnvVarNames(envVars: unknown): string[] {
  if (!Array.isArray(envVars)) return [];
  const names: string[] = [];

  for (const item of envVars) {
    if (typeof item === 'string' && item.trim()) {
      names.push(item.trim());
      continue;
    }
    if (item && typeof item === 'object') {
      const record = item as Record<string, unknown>;
      const candidate = record.name ?? record.key ?? record.variable;
      if (typeof candidate === 'string' && candidate.trim()) {
        names.push(candidate.trim());
      }
    }
  }

  return unique(names);
}

function normalizeRoutes(routes: unknown): string[] {
  if (!Array.isArray(routes)) return [];
  const parsed: string[] = [];

  for (const route of routes) {
    if (typeof route === 'string' && route.trim()) {
      parsed.push(route.trim());
      continue;
    }
    if (route && typeof route === 'object') {
      const record = route as Record<string, unknown>;
      const method = typeof record.method === 'string' ? record.method.toUpperCase() : null;
      const path = typeof record.path === 'string' ? record.path : typeof record.route === 'string' ? record.route : null;
      if (method && path) {
        parsed.push(`${method} ${path}`);
      } else if (path) {
        parsed.push(path);
      }
    }
  }

  return unique(parsed);
}

function toPageSection(title: string, blocks: string[]) {
  return {
    title,
    type: 'html',
    content: blocks,
  };
}

function buildGeneratedPages(metadataInput: unknown, detectedFramework?: string | null) {
  const metadata = toObject(metadataInput);
  const framework = (typeof metadata.framework === 'string' && metadata.framework) || detectedFramework || 'Unknown';
  const dependencies = unique(toStringArray(metadata.dependencies));
  const devDependencies = unique(toStringArray(metadata.devDependencies));
  const fileTree = unique(toStringArray(metadata.fileTree)).slice(0, 40);
  const routes = normalizeRoutes(metadata.routes);
  const envVars = normalizeEnvVarNames(metadata.envVars);
  const dbFiles = unique(toStringArray(metadata.dbFiles));
  const authFiles = unique(toStringArray(metadata.authFiles));
  const deploymentFiles = unique(toStringArray(metadata.deploymentFiles));
  const docsFiles = unique(toStringArray(metadata.docsFiles));
  const allPackages = unique([...dependencies, ...devDependencies]);

  const highlights = packageHighlights(allPackages);
  const authLooksLikeClerk =
    allPackages.some((pkg) => pkg.toLowerCase().includes('clerk')) ||
    authFiles.some((file) => file.toLowerCase().includes('clerk'));
  const prismaDetected =
    allPackages.some((pkg) => pkg.toLowerCase().includes('prisma')) ||
    dbFiles.some((file) => file.toLowerCase().includes('prisma'));

  return [
    {
      title: 'Project Overview',
      sections: [
        toPageSection('', [
          `<p>This document was generated from codebase scan metadata and should be reviewed before use in production.</p>`,
          `<p><strong>Detected framework:</strong> ${escapeHtml(framework)}</p>`,
          `<p><strong>Key dependencies:</strong> ${escapeHtml(
            dependencies.slice(0, 8).join(', ') || 'No major dependencies detected'
          )}</p>`,
        ]),
      ],
    },
    {
      title: 'Tech Stack',
      sections: [
        toPageSection('Runtime and Framework', [
          `<p><strong>Framework:</strong> ${escapeHtml(framework)}</p>`,
          listItems(highlights, 'No specific stack highlights were inferred from dependencies.'),
        ]),
        toPageSection('Dependencies', [listItems(dependencies, 'No dependencies detected in metadata.')]),
        toPageSection('Dev Dependencies', [listItems(devDependencies, 'No devDependencies detected in metadata.')]),
      ],
    },
    {
      title: 'Folder Structure',
      sections: [
        toPageSection('', [
          `<p>Review this structure and annotate folder responsibilities for your team.</p>`,
          listItems(
            [
              'app/',
              'pages/',
              'src/',
              'lib/',
              'components/',
              'prisma/',
              'public/',
              'api/',
              ...fileTree.slice(0, 20),
            ],
            'No file tree metadata was provided.'
          ),
        ]),
      ],
    },
    {
      title: 'Setup Guide',
      sections: [
        toPageSection('', [
          `<p>Use these baseline setup steps and verify them against your package scripts.</p>`,
          `<ol><li><code>npm install</code></li><li><code>npm run dev</code></li><li><code>npm run build</code></li></ol>`,
          `<p>Confirm script names and required local services (database, cache, background workers).</p>`,
        ]),
      ],
    },
    {
      title: 'Environment Variables',
      sections: [
        toPageSection('', [
          `<p>Only variable names are listed. Secret values are never stored or displayed.</p>`,
          listItems(envVars, 'No environment variable names were detected.'),
        ]),
      ],
    },
    {
      title: 'API Routes',
      sections: [
        toPageSection('', [
          routes.length
            ? `<p>Detected API routes/endpoints from scan metadata:</p>`
            : `<p>No API routes were detected from the latest scan metadata.</p>`,
          listItems(routes, 'No API routes were detected from the latest scan metadata.'),
        ]),
      ],
    },
    {
      title: 'Database & Models',
      sections: [
        toPageSection('', [
          prismaDetected
            ? `<p>Prisma-related files or dependencies were detected. Verify schema and migration coverage.</p>`
            : `<p>Database details need review. No clear Prisma indicators were detected.</p>`,
          listItems(dbFiles, 'No database files were detected from scan metadata.'),
        ]),
      ],
    },
    {
      title: 'Authentication Flow',
      sections: [
        toPageSection('', [
          authLooksLikeClerk
            ? `<p>Clerk appears to be used for authentication based on dependencies/files. Verify session, middleware, and role checks.</p>`
            : `<p>Authentication implementation needs review. No definitive provider was inferred.</p>`,
          listItems(authFiles, 'No auth-specific files were detected from scan metadata.'),
        ]),
      ],
    },
    {
      title: 'Deployment Notes',
      sections: [
        toPageSection('', [
          `<p>Detected deployment-related files:</p>`,
          listItems(deploymentFiles, 'No deployment-specific files were detected.'),
          `<ul><li>Verify production environment variables and secrets management.</li><li>Validate build output and runtime target.</li><li>Confirm rollback strategy and health checks.</li><li>Document release checklist and owners.</li></ul>`,
        ]),
      ],
    },
    {
      title: 'Maintenance Notes',
      sections: [
        toPageSection('', [
          `<ul><li>Review and refine all generated sections.</li><li>Keep docs updated after major code changes.</li><li>Re-validate setup, API, env, and deployment details regularly.</li><li>Use Developerdoc Sync outputs to track future change impact.</li></ul>`,
          listItems(docsFiles, 'No existing docs files were detected in scan metadata.'),
        ]),
      ],
    },
  ];
}

function extractEvidenceFiles(metadataInput: unknown): string[] {
  const metadata = toObject(metadataInput);
  const candidateLists = [
    toStringArray(metadata.fileTree).slice(0, 15),
    toStringArray(metadata.dbFiles),
    toStringArray(metadata.authFiles),
    toStringArray(metadata.deploymentFiles),
    toStringArray(metadata.docsFiles),
  ];

  return unique(candidateLists.flat()).slice(0, 50);
}

export async function generateInitialDocumentationForSyncProject(syncProjectId: string) {
  const syncProject = await prisma.docSyncProject.findUnique({
    where: { id: syncProjectId },
    include: {
      project: { select: { id: true, userId: true } },
      snapshots: {
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
  });

  if (!syncProject || !syncProject.project || syncProject.snapshots.length === 0) {
    return { generated: false as const, reason: 'missing-context' as const };
  }

  const latestSnapshot = syncProject.snapshots[0];

  const existingGeneratedSuggestion = await prisma.docAISuggestion.findFirst({
    where: {
      projectId: syncProject.projectId,
      suggestionType: GENERATED_SUGGESTION_TYPE,
      sourceSnapshotId: latestSnapshot.id,
    },
    select: { id: true },
  });
  if (existingGeneratedSuggestion) {
    return { generated: false as const, reason: 'already-generated' as const };
  }

  const existingGeneratedDoc = await prisma.document.findFirst({
    where: {
      projectId: syncProject.projectId,
      userId: syncProject.userId,
      title: GENERATED_DOC_TITLE,
      aiSuggestions: { some: { suggestionType: GENERATED_SUGGESTION_TYPE } },
    },
    select: { id: true, title: true },
  });
  if (existingGeneratedDoc) {
    return {
      generated: false as const,
      reason: 'already-generated' as const,
      documentId: existingGeneratedDoc.id,
      documentTitle: existingGeneratedDoc.title,
    };
  }

  const generatedPages = buildGeneratedPages(latestSnapshot.metadata, latestSnapshot.framework);
  const evidenceFiles = extractEvidenceFiles(latestSnapshot.metadata);

  const result = await prisma.$transaction(async (tx) => {
    const document = await tx.document.create({
      data: {
        label: GENERATED_DOC_TITLE,
        title: GENERATED_DOC_TITLE,
        description: GENERATED_DOC_DESCRIPTION,
        userId: syncProject.userId,
        projectId: syncProject.projectId,
        lastUpdated: new Date().toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        }),
      },
    });

    for (let i = 0; i < generatedPages.length; i += 1) {
      const page = generatedPages[i];
      await tx.page.create({
        data: {
          title: page.title,
          pageNumber: i + 1,
          documentId: document.id,
          sections: {
            create: page.sections.map((section) => ({
              title: section.title,
              type: 'html',
              content: section.content,
            })),
          },
        },
      });
    }

    await tx.docAISuggestion.create({
      data: {
        projectId: syncProject.projectId,
        documentId: document.id,
        sourceSnapshotId: latestSnapshot.id,
        suggestionType: GENERATED_SUGGESTION_TYPE,
        status: 'pending',
        payload: {
          message: 'Initial documentation generated — review recommended',
          generatedFromSyncProjectId: syncProject.id,
        },
        evidenceFiles,
      },
    });

    const syncMetadata = toObject(syncProject.metadata);
    await tx.docSyncProject.update({
      where: { id: syncProject.id },
      data: {
        metadata: {
          ...syncMetadata,
          initialDocsGenerated: true,
          initialDocsGeneratedAt: new Date().toISOString(),
          generatedDocumentId: document.id,
          generatedDocumentTitle: document.title,
        },
      },
    });

    return document;
  });

  revalidateDocsNavData();

  return {
    generated: true as const,
    documentId: result.id,
    documentTitle: result.title,
  };
}
