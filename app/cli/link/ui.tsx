"use client";

import { useState } from "react";

interface LinkCliClientProps {
  userCode: string;
}

type Status = "idle" | "loading" | "success" | "error";

export default function LinkCliClient({ userCode }: LinkCliClientProps) {
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState<string>("");

  const handleAuthorize = async () => {
    if (!userCode) {
      setStatus("error");
      setMessage("Missing user code. Please return to terminal and retry `developerdoc init`.");
      return;
    }

    setStatus("loading");
    setMessage("");

    try {
      const response = await fetch("/api/cli/auth/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userCode }),
      });

      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error || "Failed to authorize CLI");
      }

      setStatus("success");
      setMessage("CLI linked. You can return to your terminal.");
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Failed to authorize CLI");
    }
  };

  return (
    <main className="mx-auto max-w-xl px-6 py-16">
      <h1 className="text-2xl font-semibold">Authorize Developerdoc CLI</h1>
      <p className="mt-3 text-sm text-gray-600">
        Link this terminal to your Developerdoc account to create or connect a project for syncing.
      </p>

      <div className="mt-6 rounded-md border p-4">
        <p className="text-xs uppercase tracking-wider text-gray-500">User code</p>
        <p className="mt-1 font-mono text-lg">{userCode || "Missing"}</p>
      </div>

      <button
        type="button"
        onClick={handleAuthorize}
        disabled={status === "loading"}
        className="mt-6 rounded-md bg-black px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
      >
        {status === "loading" ? "Authorizing..." : "Authorize CLI"}
      </button>

      {message ? (
        <p className={`mt-4 text-sm ${status === "error" ? "text-red-600" : "text-green-700"}`}>{message}</p>
      ) : null}
    </main>
  );
}
