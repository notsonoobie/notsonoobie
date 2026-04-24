import type { Metadata } from "next";
import { getSupabaseServer } from "@/lib/supabase/server";
import { decryptEmailToken } from "@/lib/newsletter/token";
import { UnsubscribeView } from "@/components/newsletter/UnsubscribeView";
import { SITE_HOST } from "@/lib/seo";

// Never index this route and never prerender it — the token is part of the
// URL and we want every load to hit the handler.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Unsubscribe",
  description: `Unsubscribe from the ${SITE_HOST} newsletter.`,
  robots: { index: false, follow: false },
};

type Props = {
  searchParams: Promise<{ t?: string }>;
};

export default async function UnsubscribePage({ searchParams }: Props) {
  const { t } = await searchParams;

  if (!t) {
    return <UnsubscribeView state="error" reason="missing_token" />;
  }

  const payload = decryptEmailToken(t);
  if (!payload) {
    return <UnsubscribeView state="error" reason="invalid_token" />;
  }

  const email = payload.email.trim().toLowerCase();
  const supabase = getSupabaseServer();

  // Idempotent: update only rows still active. If the email was already
  // unsubscribed, or never existed in the list at all, the update is a
  // no-op — but we still render the success state so we don't leak
  // membership (an attacker with a valid token already knows the email
  // anyway, but the symmetry is nicer).
  const { error } = await supabase
    .from("subscribers")
    .update({ unsubscribed_at: new Date().toISOString() })
    .eq("email", email)
    .is("unsubscribed_at", null);

  if (error) {
    console.error("[unsubscribe] supabase update failed", error);
    return <UnsubscribeView state="error" reason="server_error" />;
  }

  return <UnsubscribeView state="success" email={email} />;
}
