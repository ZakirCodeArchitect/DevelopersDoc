"use client";

import { SpeedInsights } from "@vercel/speed-insights/next";

/** Client-only so the root layout stays a Server Component without next/dynamic ssr:false. */
export function SpeedInsightsGate() {
  return <SpeedInsights />;
}
