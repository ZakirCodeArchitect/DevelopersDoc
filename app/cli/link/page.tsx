import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import LinkCliClient from "./ui";

interface LinkPageProps {
  searchParams: Promise<{ userCode?: string }>;
}

export default async function CliLinkPage({ searchParams }: LinkPageProps) {
  const { userId } = await auth();
  const params = await searchParams;
  const userCode = (params.userCode ?? "").trim().toUpperCase();

  if (!userId) {
    const callbackUrl = `/cli/link?userCode=${encodeURIComponent(userCode)}`;
    redirect(`/sign-in?redirect_url=${encodeURIComponent(callbackUrl)}`);
  }

  return <LinkCliClient userCode={userCode} />;
}
