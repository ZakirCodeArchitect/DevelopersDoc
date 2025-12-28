/**
 * Migration script to move data from docs.json to PostgreSQL database
 * 
 * Usage:
 * 1. Make sure DATABASE_URL is set in your .env file
 * 2. Run: npx tsx scripts/migrate-json-to-db.ts
 */

import { PrismaClient } from '@prisma/client';
import { promises as fs } from 'fs';
import path from 'path';
import type { DocsData } from '../lib/docs';

const prisma = new PrismaClient();

async function migrateData() {
  try {
    console.log('🔄 Starting migration from JSON to database...');

    // Read JSON file
    const filePath = path.join(process.cwd(), 'data', 'docs.json');
    const fileContents = await fs.readFile(filePath, 'utf-8');
    const docsData: DocsData = JSON.parse(fileContents);

    console.log(`📊 Found ${docsData.projects.length} projects and ${docsData.yourDocs.length} "Your Docs" documents`);

    // Migrate projects
    for (const project of docsData.projects) {
      console.log(`  📁 Migrating project: ${project.label}`);

      // Create project
      await prisma.project.upsert({
        where: { id: project.id },
        update: {
          label: project.label,
          title: project.title,
          description: project.description || null,
          lastUpdated: project.lastUpdated,
        },
        create: {
          id: project.id,
          label: project.label,
          title: project.title,
          description: project.description || null,
          lastUpdated: project.lastUpdated,
        },
      });

      // Migrate documents in project
      for (const doc of project.documents || []) {
        console.log(`    📄 Migrating document: ${doc.label}`);

        // Create document
        await prisma.document.upsert({
          where: { id: doc.id },
          update: {
            label: doc.label,
            title: doc.title,
            description: doc.description || null,
            lastUpdated: doc.lastUpdated,
            projectId: project.id,
          },
          create: {
            id: doc.id,
            label: doc.label,
            title: doc.title,
            description: doc.description || null,
            lastUpdated: doc.lastUpdated,
            projectId: project.id,
          },
        });

        // Migrate pages
        for (let pageIndex = 0; pageIndex < (doc.content.pages || []).length; pageIndex++) {
          const page = doc.content.pages[pageIndex];
          const pageNumber = pageIndex + 1;
          
          console.log(`      📑 Migrating page ${pageNumber}: ${page.title}`);

          // Create page
          await prisma.page.upsert({
            where: { id: page.id },
            update: {
              title: page.title,
              pageNumber: pageNumber,
              documentId: doc.id,
            },
            create: {
              id: page.id,
              title: page.title,
              pageNumber: pageNumber,
              documentId: doc.id,
            },
          });

          // Migrate sections
          for (const section of page.sections || []) {
            await prisma.section.upsert({
              where: { id: section.id },
              update: {
                title: section.title,
                type: section.type,
                content: section.content,
                componentType: section.componentType || null,
                pageId: page.id,
              },
              create: {
                id: section.id,
                title: section.title,
                type: section.type,
                content: section.content,
                componentType: section.componentType || null,
                pageId: page.id,
              },
            });
          }
        }
      }
    }

    // Migrate "Your Docs" (documents without projects)
    for (const doc of docsData.yourDocs) {
      console.log(`  📄 Migrating "Your Doc": ${doc.label}`);

      // Create document
      await prisma.document.upsert({
        where: { id: doc.id },
        update: {
          label: doc.label,
          title: doc.title,
          description: doc.description || null,
          lastUpdated: doc.lastUpdated,
          projectId: null,
        },
        create: {
          id: doc.id,
          label: doc.label,
          title: doc.title,
          description: doc.description || null,
          lastUpdated: doc.lastUpdated,
          projectId: null,
        },
      });

      // Migrate pages
      for (let pageIndex = 0; pageIndex < (doc.content.pages || []).length; pageIndex++) {
        const page = doc.content.pages[pageIndex];
        const pageNumber = pageIndex + 1;
        
        console.log(`    📑 Migrating page ${pageNumber}: ${page.title}`);

        // Create page
        await prisma.page.upsert({
          where: { id: page.id },
          update: {
            title: page.title,
            pageNumber: pageNumber,
            documentId: doc.id,
          },
          create: {
            id: page.id,
            title: page.title,
            pageNumber: pageNumber,
            documentId: doc.id,
          },
        });

        // Migrate sections
        for (const section of page.sections || []) {
          await prisma.section.upsert({
            where: { id: section.id },
            update: {
              title: section.title,
              type: section.type,
              content: section.content,
              componentType: section.componentType || null,
              pageId: page.id,
            },
            create: {
              id: section.id,
              title: section.title,
              type: section.type,
              content: section.content,
              componentType: section.componentType || null,
              pageId: page.id,
            },
          });
        }
      }
    }

    console.log('✅ Migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run migration
migrateData()
  .then(() => {
    console.log('✨ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Migration error:', error);
    process.exit(1);
  });

