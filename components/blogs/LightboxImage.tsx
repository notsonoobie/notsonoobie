"use client";

import { useCallback, useEffect, useState } from "react";
import { Maximize2, Minimize2, X, ZoomIn, ZoomOut } from "lucide-react";

type Props = React.ImgHTMLAttributes<HTMLImageElement>;

const ZOOM_MIN = 0.5;
const ZOOM_MAX = 5;
const ZOOM_STEP = 0.25;

export function LightboxImage({ src, alt = "", ...rest }: Props) {
  const [open, setOpen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [fit, setFit] = useState<"screen" | "natural">("screen");

  const close = useCallback(() => {
    setOpen(false);
    setZoom(1);
    setFit("screen");
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      else if (e.key === "+" || e.key === "=") setZoom((z) => Math.min(z + ZOOM_STEP, ZOOM_MAX));
      else if (e.key === "-" || e.key === "_") setZoom((z) => Math.max(z - ZOOM_STEP, ZOOM_MIN));
      else if (e.key === "0") setZoom(1);
      else if (e.key.toLowerCase() === "f") setFit((f) => (f === "screen" ? "natural" : "screen"));
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, close]);

  if (!src) return null;
  const srcStr = typeof src === "string" ? src : String(src);

  return (
    <>
      {/* inline image — click to enlarge */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={srcStr}
        alt={alt}
        {...rest}
        onClick={() => setOpen(true)}
        className={`${rest.className ?? ""} cursor-zoom-in`}
      />

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={alt || "Image preview"}
          onClick={close}
          className="fixed inset-0 z-[120] flex items-center justify-center bg-black/55 backdrop-blur-2xl animate-[fadein_.15s_ease-out]"
          style={{
            WebkitBackdropFilter: "blur(24px) saturate(120%)",
            backdropFilter: "blur(24px) saturate(120%)",
          }}
        >
          {/* Top control bar */}
          <div
            onClick={(e) => e.stopPropagation()}
            className="absolute top-5 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1 px-2 py-1.5 rounded-full hairline bg-canvas-2/70 backdrop-blur-md"
          >
            <button
              type="button"
              onClick={() => setZoom((z) => Math.max(z - ZOOM_STEP, ZOOM_MIN))}
              className="size-8 grid place-items-center rounded-full text-ink-dim hover:text-cyan hover:bg-canvas transition-colors"
              aria-label="Zoom out"
            >
              <ZoomOut className="size-4" strokeWidth={1.6} />
            </button>
            <span className="font-mono text-[10px] tracking-[0.18em] uppercase text-ink-dim tabular-nums min-w-[3ch] text-center">
              {Math.round(zoom * 100)}%
            </span>
            <button
              type="button"
              onClick={() => setZoom((z) => Math.min(z + ZOOM_STEP, ZOOM_MAX))}
              className="size-8 grid place-items-center rounded-full text-ink-dim hover:text-cyan hover:bg-canvas transition-colors"
              aria-label="Zoom in"
            >
              <ZoomIn className="size-4" strokeWidth={1.6} />
            </button>
            <span className="mx-1 h-5 w-px bg-line" />
            <button
              type="button"
              onClick={() => setFit((f) => (f === "screen" ? "natural" : "screen"))}
              className="size-8 grid place-items-center rounded-full text-ink-dim hover:text-cyan hover:bg-canvas transition-colors"
              aria-label={fit === "screen" ? "Show at natural size" : "Fit to screen"}
              title={fit === "screen" ? "Shrink to inline size" : "Fit to screen"}
            >
              {fit === "screen" ? (
                <Minimize2 className="size-4" strokeWidth={1.6} />
              ) : (
                <Maximize2 className="size-4" strokeWidth={1.6} />
              )}
            </button>
            <span className="mx-1 h-5 w-px bg-line" />
            <button
              type="button"
              onClick={close}
              className="size-8 grid place-items-center rounded-full text-ink-dim hover:text-rose hover:bg-canvas transition-colors"
              aria-label="Close"
              title="Close (Esc)"
            >
              <X className="size-4" strokeWidth={1.6} />
            </button>
          </div>

          {/* Scroll container — lets the image overflow + scroll when zoomed past viewport */}
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-h-[92vh] max-w-[94vw] overflow-auto no-scrollbar"
          >
            {/* Inner centers the image when it's smaller than the scroll box */}
            <div className="min-h-full min-w-full flex items-center justify-center p-6">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={srcStr}
                alt={alt}
                draggable={false}
                className="block rounded-md hairline shadow-[0_20px_60px_-20px_rgba(0,0,0,0.6)]"
                style={{
                  // Width grows with zoom — real layout scaling, not CSS transform,
                  // so the scroll container detects overflow and lets you pan.
                  width: `${(fit === "screen" ? 82 : 55) * zoom}vw`,
                  height: "auto",
                  maxWidth: "unset",
                  maxHeight: "unset",
                  transition: "width 0.18s ease-out",
                }}
              />
            </div>
          </div>

          {/* Caption / hint row */}
          <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex items-center gap-4 font-mono text-[10px] tracking-[0.2em] uppercase text-ink-dim">
            <span>
              <kbd className="px-1.5 py-0.5 rounded hairline bg-canvas-2/70 text-ink">Esc</kbd> close
            </span>
            <span>
              <kbd className="px-1.5 py-0.5 rounded hairline bg-canvas-2/70 text-ink">+ / −</kbd> zoom
            </span>
            <span>
              <kbd className="px-1.5 py-0.5 rounded hairline bg-canvas-2/70 text-ink">F</kbd> fit
            </span>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes fadein {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
      `}</style>
    </>
  );
}
