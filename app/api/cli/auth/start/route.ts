import { NextResponse } from "next/server";
import { startCliAuthSession } from "@/lib/sync/cli-auth.service";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const requestedBaseUrl = typeof body?.apiUrl === "string" ? body.apiUrl : null;
    const origin = request.headers.get("origin");
    const baseUrl = requestedBaseUrl || origin || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    const session = await startCliAuthSession(baseUrl);
    return NextResponse.json({
      deviceCode: session.deviceCode,
      userCode: session.userCode,
      verificationUrl: session.verificationUrl,
      expiresAt: session.expiresAt.toISOString(),
    });
  } catch (error) {
    console.error("Error starting CLI auth session:", error);
    return NextResponse.json({ error: "Failed to start CLI authentication flow" }, { status: 500 });
  }
}
