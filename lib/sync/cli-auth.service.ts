import { createHash, randomBytes } from "node:crypto";
import { prisma } from "@/lib/db";

const AUTH_SESSION_TTL_MS = 10 * 60 * 1000;
const EXCHANGE_TOKEN_TTL_MS = 5 * 60 * 1000;

type CliAuthStatus = "pending" | "approved" | "expired" | "used";
const db = prisma as any;

function hashValue(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function generateDeviceCode(): string {
  return randomBytes(32).toString("hex");
}

function generateExchangeToken(): string {
  return randomBytes(32).toString("hex");
}

function generateUserCode(length = 8): string {
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(length);
  let result = "";
  for (let i = 0; i < length; i += 1) {
    result += alphabet[bytes[i] % alphabet.length];
  }
  return result;
}

async function createUniqueUserCode(): Promise<string> {
  for (let i = 0; i < 8; i += 1) {
    const code = generateUserCode();
    const exists = await db.cliAuthSession.findUnique({
      where: { userCode: code },
      select: { id: true },
    });
    if (!exists) return code;
  }
  throw new Error("Unable to generate unique user code.");
}

function toStatus(raw: string): CliAuthStatus {
  if (raw === "pending" || raw === "approved" || raw === "expired" || raw === "used") {
    return raw;
  }
  return "expired";
}

export async function startCliAuthSession(baseUrl: string) {
  const deviceCode = generateDeviceCode();
  const userCode = await createUniqueUserCode();
  const expiresAt = new Date(Date.now() + AUTH_SESSION_TTL_MS);

  await db.cliAuthSession.create({
    data: {
      deviceCodeHash: hashValue(deviceCode),
      userCode,
      status: "pending",
      expiresAt,
    },
  });

  const verificationUrl = new URL(`/cli/link?userCode=${encodeURIComponent(userCode)}`, baseUrl).toString();
  return { deviceCode, userCode, verificationUrl, expiresAt };
}

export async function approveCliAuthSession(userCode: string, userId: string) {
  const session = await db.cliAuthSession.findUnique({
    where: { userCode },
  });
  if (!session) {
    return { ok: false as const, reason: "not_found" as const };
  }

  if (session.expiresAt <= new Date()) {
    await db.cliAuthSession.update({
      where: { id: session.id },
      data: { status: "expired" },
    });
    return { ok: false as const, reason: "expired" as const };
  }

  if (session.status === "used") {
    return { ok: false as const, reason: "used" as const };
  }

  await db.cliAuthSession.update({
    where: { id: session.id },
    data: {
      status: "approved",
      userId,
      approvedAt: new Date(),
    },
  });

  return { ok: true as const };
}

export async function pollCliAuthSession(deviceCode: string) {
  const session = await db.cliAuthSession.findUnique({
    where: { deviceCodeHash: hashValue(deviceCode) },
  });

  if (!session) {
    return { status: "invalid" as const };
  }

  const now = new Date();
  if (session.expiresAt <= now || session.status === "expired") {
    if (session.status !== "expired") {
      await db.cliAuthSession.update({
        where: { id: session.id },
        data: { status: "expired" },
      });
    }
    return { status: "expired" as const };
  }

  const status = toStatus(session.status);
  if (status === "pending") {
    return { status: "pending" as const };
  }

  if (status === "used") {
    return { status: "used" as const };
  }

  if (status !== "approved") {
    return { status: "expired" as const };
  }

  const cliAuthToken = generateExchangeToken();
  await db.cliAuthSession.update({
    where: { id: session.id },
    data: {
      exchangeTokenHash: hashValue(cliAuthToken),
      exchangeTokenExpiresAt: new Date(Date.now() + EXCHANGE_TOKEN_TTL_MS),
    },
  });

  return { status: "approved" as const, cliAuthToken };
}

export async function consumeCliAuthToken(cliAuthToken: string) {
  const tokenHash = hashValue(cliAuthToken);
  const now = new Date();

  const session = await db.cliAuthSession.findFirst({
    where: {
      exchangeTokenHash: tokenHash,
      status: "approved",
      usedAt: null,
      exchangeTokenExpiresAt: { gt: now },
      expiresAt: { gt: now },
    },
  });

  if (!session) return null;

  const updateResult = await db.cliAuthSession.updateMany({
    where: {
      id: session.id,
      status: "approved",
      usedAt: null,
      exchangeTokenHash: tokenHash,
    },
    data: {
      status: "used",
      usedAt: new Date(),
      exchangeTokenHash: null,
      exchangeTokenExpiresAt: null,
    },
  });

  if (updateResult.count !== 1) return null;

  return session;
}
