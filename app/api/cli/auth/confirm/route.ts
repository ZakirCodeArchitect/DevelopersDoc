import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/users";
import { approveCliAuthSession } from "@/lib/sync/cli-auth.service";

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const userCode = typeof body?.userCode === "string" ? body.userCode.trim().toUpperCase() : "";
    if (!userCode) {
      return NextResponse.json({ error: "userCode is required" }, { status: 400 });
    }

    const result = await approveCliAuthSession(userCode, user.id);
    if (!result.ok) {
      if (result.reason === "not_found") {
        return NextResponse.json({ error: "Invalid user code" }, { status: 404 });
      }
      if (result.reason === "expired") {
        return NextResponse.json({ error: "This link request has expired" }, { status: 410 });
      }
      return NextResponse.json({ error: "This link request is no longer valid" }, { status: 409 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error confirming CLI auth session:", error);
    return NextResponse.json({ error: "Failed to confirm CLI authentication" }, { status: 500 });
  }
}
