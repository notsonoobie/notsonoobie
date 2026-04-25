import { NewsletterForm } from "@/components/newsletter/NewsletterForm";
import { StatusBadge } from "@/components/status/StatusBadge";
import { BackToTopLink } from "@/components/footer/BackToTopLink";

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="relative border-t border-line">
      <div className="mx-auto max-w-7xl px-6 md:px-10 py-14 md:py-20">
        <NewsletterForm
          variant="compact"
          heading="Don't miss the"
          headingAccent="next dispatch."
          subhead=""
        />
      </div>
      <div className="border-t border-line">
        <div className="mx-auto max-w-7xl px-6 md:px-10 py-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 font-mono text-[11px] text-ink-dim">
          <div>© {year} Rahul Gupta</div>
          <div className="flex items-center gap-6">
            <StatusBadge />
            <BackToTopLink />
          </div>
        </div>
      </div>
    </footer>
  );
}
