import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";
import { ArrowLeft, ArrowRight, Award } from "lucide-react";
import { Footer } from "@/components/footer/Footer";
import { getUser } from "@/lib/supabase/server";
import { getUserCertificates } from "@/lib/courses/queries";
import { formatIssuedDate } from "@/lib/courses/certificate";
import { SITE_URL } from "@/lib/seo";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Your certificates",
  description:
    "Your earned course-completion certificates — public, shareable URLs you can paste into LinkedIn or your résumé.",
  alternates: { canonical: `${SITE_URL}/me/certificates` },
  robots: { index: false, follow: false },
};

function CertificatesSkeleton() {
  return (
    <ul className="grid gap-3 md:grid-cols-2" aria-hidden>
      {Array.from({ length: 4 }).map((_, i) => (
        <li
          key={i}
          className="rounded-xl hairline bg-canvas-2/40 p-5 animate-pulse"
        >
          <div className="flex items-start gap-3">
            <span className="mt-0.5 size-8 shrink-0 rounded-full bg-canvas-2" />
            <div className="flex-1 min-w-0 space-y-2">
              <div className="h-2.5 w-32 rounded bg-canvas-2" />
              <div className="h-4 w-full rounded bg-canvas-2" />
              <div className="h-4 w-3/4 rounded bg-canvas-2" />
              <div className="h-2.5 w-16 rounded bg-canvas-2 mt-3" />
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

async function CertificatesGrid({ userId }: { userId: string }) {
  const certs = await getUserCertificates(userId);
  if (certs.length === 0) {
    return (
      <div className="rounded-xl hairline bg-canvas-2/40 px-6 py-10 text-center">
        <Award className="size-8 text-ink-faint mx-auto" strokeWidth={1.5} />
        <p className="mt-4 text-ink-dim text-[14px] leading-relaxed">
          You haven&rsquo;t completed any courses yet. Pick one from the{" "}
          <Link
            href="/courses"
            className="text-cyan underline underline-offset-2"
          >
            catalogue
          </Link>{" "}
          to get started.
        </p>
      </div>
    );
  }
  return (
    <ul className="grid gap-3 md:grid-cols-2">
      {certs.map((c) => (
        <li key={c.id}>
          <Link
            href={`/certificates/${c.id}`}
            className="group block h-full rounded-xl hairline bg-canvas-2/40 hover:bg-canvas-2/70 transition-colors p-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
          >
            <div className="flex items-start gap-3">
              <span className="mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-cyan/15 text-cyan">
                <Award className="size-4" strokeWidth={1.75} />
              </span>
              <div className="flex-1 min-w-0">
                <div className="font-mono text-[10.5px] tracking-[0.22em] uppercase text-cyan mb-1">
                  issued {formatIssuedDate(c.issuedAt)}
                </div>
                <h2 className="font-display text-base font-semibold leading-snug tracking-[-0.01em] group-hover:text-cyan transition-colors line-clamp-2">
                  {c.course.title}
                </h2>
                <div className="mt-3 inline-flex items-center gap-1.5 font-mono text-[11px] text-ink-dim">
                  view
                  <ArrowRight
                    className="size-3.5 group-hover:translate-x-0.5 transition-transform"
                    strokeWidth={2}
                  />
                </div>
              </div>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export default async function MyCertificatesPage() {
  const user = await getUser();
  if (!user) {
    redirect("/login?next=/me/certificates");
  }

  return (
    <div className="bg-canvas text-ink min-h-screen flex flex-col">
      <main className="flex-1">
        <section className="relative overflow-hidden border-b border-line">
          <div
            aria-hidden
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                "radial-gradient(ellipse 70% 100% at 50% 0%, color-mix(in oklab, var(--color-cyan) 10%, transparent) 0%, transparent 70%)",
            }}
          />
          <div
            aria-hidden
            className="absolute inset-0 bg-grid bg-grid-fade opacity-25 pointer-events-none"
          />
          <div className="relative mx-auto max-w-4xl px-6 md:px-10 pt-24 md:pt-28 pb-10">
            <Link
              href="/courses"
              className="inline-flex items-center gap-1.5 text-ink-dim hover:text-ink text-xs font-mono transition-colors mb-5"
            >
              <ArrowLeft className="size-3.5" strokeWidth={2} />
              all courses
            </Link>
            <div className="font-mono text-[11px] tracking-[0.3em] uppercase text-cyan mb-4">
              {"// your wallet"}
            </div>
            <h1 className="font-display text-[clamp(2rem,5vw,3rem)] leading-[1.05] tracking-[-0.02em] font-semibold">
              Certificates
            </h1>
            <p className="mt-4 text-ink-dim text-base leading-relaxed max-w-prose">
              Every course you complete earns a shareable credential. Each
              certificate page is a public, signed URL — paste it into your
              LinkedIn or résumé.
            </p>
          </div>
        </section>

        <section className="relative">
          <div className="mx-auto max-w-4xl px-6 md:px-10 py-12 md:py-16">
            <Suspense fallback={<CertificatesSkeleton />}>
              <CertificatesGrid userId={user.id} />
            </Suspense>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
