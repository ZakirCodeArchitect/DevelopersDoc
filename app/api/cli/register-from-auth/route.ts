import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createSyncProject } from "@/lib/sync/sync.service";
import { consumeCliAuthToken } from "@/lib/sync/cli-auth.service";

function toProjectLabel(projectName: string, repoName: string): string {
  const trimmed = projectName.trim();
  if (trimmed.length > 0) return trimmed;
  return repoName.trim() || "Untitled Project";
}

function currentDateLabel(): string {
  return new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const cliAuthToken = typeof body?.cliAuthToken === "string" ? body.cliAuthToken.trim() : "";
    const repoName = typeof body?.repoName === "string" ? body.repoName.trim() : "";
    const projectName = typeof body?.projectName === "string" ? body.projectName : "";
    const privacyMode = typeof body?.privacyMode === "string" ? body.privacyMode : "safe";

    if (!cliAuthToken || !repoName) {
      return NextResponse.json({ error: "cliAuthToken and repoName are required" }, { status: 400 });
    }

    const session = await consumeCliAuthToken(cliAuthToken);
    if (!session?.userId) {
      return NextResponse.json({ error: "Invalid or expired auth token" }, { status: 401 });
    }

    const projectLabel = toProjectLabel(projectName, repoName);
    let project = await prisma.project.findFirst({
      where: {
        userId: session.userId,
        title: projectLabel,
      },
      select: { id: true },
    });

    if (!project) {
      project = await prisma.project.create({
        data: {
          userId: session.userId,
          label: projectLabel,
          title: projectLabel,
          description: "Auto-created by Developerdoc CLI",
          lastUpdated: currentDateLabel(),
        },
        select: { id: true },
      });
    }

    const { syncProject, token } = await createSyncProject({
      projectId: project.id,
      userId: session.userId,
      repoName,
      privacyMode,
    });

    return NextResponse.json({
      success: true,
      projectId: project.id,
      syncProjectId: syncProject.id,
      syncToken: token,
    });
  } catch (error) {
    console.error("Error registering CLI project from auth token:", error);
    return NextResponse.json({ error: "Failed to register CLI project" }, { status: 500 });
  }
}
