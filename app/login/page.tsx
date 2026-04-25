import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginCard } from "@/components/auth/LoginCard";
import { getUser } from "@/lib/supabase/server";
import { SITE_URL } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Sign in",
  description:
    "Sign in to agenticwithrahul.in with Google or GitHub to access courses and track your progress.",
  alternates: { canonical: `${SITE_URL}/login` },
  robots: { index: false, follow: false },
};

type SearchParams = Promise<{ error?: string; next?: string }>;

export default async function LoginPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const user = await getUser();
  if (user) {
    // Already signed in — bounce to the intended destination (or courses by default).
    const next =
      sp.next && sp.next.startsWith("/") && !sp.next.startsWith("//")
        ? sp.next
        : "/courses";
    redirect(next);
  }

  return <LoginCard error={sp.error} next={sp.next} />;
}
