import { NextResponse } from "next/server";
import { pollCliAuthSession } from "@/lib/sync/cli-auth.service";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const deviceCode = typeof body?.deviceCode === "string" ? body.deviceCode.trim() : "";
    if (!deviceCode) {
      return NextResponse.json({ error: "deviceCode is required" }, { status: 400 });
    }

    const result = await pollCliAuthSession(deviceCode);
    if (result.status === "invalid") {
      return NextResponse.json({ error: "Invalid device code" }, { status: 404 });
    }
    if (result.status === "expired") {
      return NextResponse.json({ status: "expired" }, { status: 410 });
    }
    if (result.status === "used") {
      return NextResponse.json({ status: "used" }, { status: 409 });
    }
    if (result.status === "pending") {
      return NextResponse.json({ status: "pending" });
    }

    return NextResponse.json({
      status: "approved",
      cliAuthToken: result.cliAuthToken,
    });
  } catch (error) {
    console.error("Error polling CLI auth session:", error);
    return NextResponse.json({ error: "Failed to poll CLI authentication status" }, { status: 500 });
  }
}
