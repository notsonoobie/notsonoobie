import type { VisualContent } from "@/lib/courses/types";

export function VisualBlock({ visual }: { visual: VisualContent }) {
  return (
    <figure className="my-8">
      <div className="rounded-xl hairline bg-canvas-2/40 overflow-hidden">
        {visual.kind === "svg" ? (
          // SVG content is author-authored in the DB; it lives at a URL.
          // We render via <object> so interactive/linked SVGs still work.
          <object
            data={visual.src}
            type="image/svg+xml"
            aria-label={visual.alt}
            className="block w-full h-auto"
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={visual.src}
            alt={visual.alt}
            className="block w-full h-auto"
          />
        )}
      </div>
      {visual.caption && (
        <figcaption className="mt-3 text-center text-ink-dim font-mono text-xs tracking-[0.18em] uppercase">
          {visual.caption}
        </figcaption>
      )}
    </figure>
  );
}
