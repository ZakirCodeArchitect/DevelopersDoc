import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  classifyPath,
  inferRoutePathForApiFile,
  parsePrismaSchema,
  extractExportedHttpMethods,
  inferEnvPurpose,
  looksSecretLike,
} from "./scanner-semantic.js";

describe("scanner-semantic", () => {
  it("classifies Next.js app router files", () => {
    assert.equal(classifyPath("app/layout.tsx"), "layout");
    assert.equal(classifyPath("app/page.tsx"), "ui_page");
    assert.equal(classifyPath("app/api/users/route.ts"), "api_route");
    assert.equal(classifyPath("src/app/dashboard/loading.tsx"), "loading_state");
    assert.equal(classifyPath("middleware.ts"), "middleware");
    assert.equal(classifyPath("pages/api/hello.ts"), "api_route");
  });

  it("infers App Router and Pages API paths", () => {
    assert.equal(inferRoutePathForApiFile("app/api/cli/scan/route.ts"), "/api/cli/scan");
    assert.equal(inferRoutePathForApiFile("src/app/docs/[[...slug]]/route.ts"), "/docs/[[...slug]]");
    assert.equal(inferRoutePathForApiFile("pages/api/foo/bar.ts"), "/api/foo/bar");
  });

  it("extracts exported HTTP methods", () => {
    const src = `
      export async function GET() {}
      export const POST = () => {}
      export function PUT() {}
    `;
    const m = extractExportedHttpMethods(src);
    assert.ok(m.includes("GET"));
    assert.ok(m.includes("POST"));
    assert.ok(m.includes("PUT"));
  });

  it("parses prisma schema blocks", () => {
    const schema = `
      datasource db {
        provider = postgresql
        url      = env("DATABASE_URL")
      }
      generator client {
        provider = "prisma-client-js"
      }
      model User {
        id    Int    @id
        posts Post[]
      }
      model Post {
        id     Int  @id
        user   User @relation(fields: [userId], references: [id])
        userId Int
      }
      enum Role {
        ADMIN
        MEMBER
      }
    `;
    const p = parsePrismaSchema(schema);
    assert.equal(p.datasourceProvider, "postgresql");
    assert.equal(p.generatorProvider, "prisma-client-js");
    assert.ok(p.models.some((m) => m.name === "User"));
    assert.ok(p.enums.some((e) => e.name === "Role"));
  });

  it("infers env purposes and secret warnings", () => {
    assert.match(inferEnvPurpose("DATABASE_URL"), /database/i);
    assert.ok(looksSecretLike("NEXT_PUBLIC_API_SECRET"));
    assert.equal(looksSecretLike("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY"), false);
  });

  it("classifies root proxy.ts like middleware", () => {
    assert.equal(classifyPath("proxy.ts"), "middleware");
    assert.equal(classifyPath("src/proxy.ts"), "middleware");
  });

  it("parses prisma datasource env var names", () => {
    const schema = `
      datasource db {
        provider  = postgresql
        url       = env("DATABASE_URL")
        directUrl = env("DIRECT_URL")
      }
      model X { id Int @id }
    `;
    const p = parsePrismaSchema(schema);
    assert.equal(p.datasourceUrlEnv, "DATABASE_URL");
    assert.equal(p.datasourceDirectUrlEnv, "DIRECT_URL");
  });
});
