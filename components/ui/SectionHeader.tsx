import { cn } from "@/lib/utils";

type Props = {
  index: string;
  kicker: string;
  title: string;
  children?: React.ReactNode;
  className?: string;
};

export function SectionHeader({ index, kicker, title, children, className }: Props) {
  return (
    <div className={cn("flex flex-col gap-3 max-w-3xl", className)}>
      <div className="flex items-center gap-3 font-mono text-[11px] tracking-[0.3em] uppercase text-ink-dim">
        <span className="text-cyan">{index}</span>
        <span className="h-px w-10 bg-line" />
        <span>{kicker}</span>
      </div>
      <h2 className="font-display text-[clamp(2rem,5vw,3.5rem)] leading-[1.05] tracking-[-0.02em] font-semibold">
        {title}
      </h2>
      {children && <p className="text-ink-dim leading-relaxed max-w-2xl">{children}</p>}
    </div>
  );
}
