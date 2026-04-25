"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import videojs from "video.js";
import {
  Loader2,
  Maximize,
  Minimize,
  Pause,
  Play,
  Volume1,
  Volume2,
  VolumeX,
} from "lucide-react";
import "./video-player.css";

type Player = ReturnType<typeof videojs>;

type Props = {
  src: string;
  poster?: string;
  /** When set with `initialPositionSeconds`, the player resumes from
   * that point on load and POSTs progress every 5 s to
   * /api/courses/state. */
  episodeId?: number;
  initialPositionSeconds?: number | null;
  title?: string;
  eyebrow?: string;
};

function inferType(url: string): string | undefined {
  const ext = url.split("?")[0]?.split(".").pop()?.toLowerCase();
  if (ext === "mp4" || ext === "m4v") return "video/mp4";
  if (ext === "webm") return "video/webm";
  if (ext === "mov") return "video/quicktime";
  if (ext === "ogv" || ext === "ogg") return "video/ogg";
  return undefined;
}

function fmt(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${m}:${String(s).padStart(2, "0")}`;
}

/* ─── Skip-10 icons ─── */

function SkipBack10Icon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M21 12a9 9 0 1 1 -3.18 -6.86" />
      <path d="M21 4v5h-5" />
      <text
        x="12"
        y="15.5"
        textAnchor="middle"
        fontSize="7"
        fontWeight="700"
        stroke="none"
        fill="currentColor"
      >
        10
      </text>
    </svg>
  );
}

function SkipForward10Icon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M3 12a9 9 0 1 0 3.18 -6.86" />
      <path d="M3 4v5h5" />
      <text
        x="12"
        y="15.5"
        textAnchor="middle"
        fontSize="7"
        fontWeight="700"
        stroke="none"
        fill="currentColor"
      >
        10
      </text>
    </svg>
  );
}

/* ─── Volume icon dispatch ─── */

function VolumeIcon({
  value,
  muted,
  className,
}: {
  value: number;
  muted: boolean;
  className?: string;
}) {
  if (muted || value === 0) {
    return <VolumeX className={className} strokeWidth={2} />;
  }
  if (value < 0.5) {
    return <Volume1 className={className} strokeWidth={2} />;
  }
  return <Volume2 className={className} strokeWidth={2} />;
}

/* ─── Custom vertical volume slider ─── */

function VerticalVolumeSlider({
  value,
  muted,
  onChange,
}: {
  value: number;
  muted: boolean;
  onChange: (v: number) => void;
}) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [dragging, setDragging] = useState(false);

  const updateFromY = useCallback(
    (clientY: number) => {
      const track = trackRef.current;
      if (!track) return;
      const rect = track.getBoundingClientRect();
      const ratio = 1 - (clientY - rect.top) / rect.height;
      onChange(Math.max(0, Math.min(1, ratio)));
    },
    [onChange]
  );

  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: MouseEvent) => updateFromY(e.clientY);
    const onUp = () => setDragging(false);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [dragging, updateFromY]);

  const pct = muted ? 0 : value * 100;

  return (
    <div
      className="aw-vol"
      role="slider"
      aria-label="Volume"
      aria-orientation="vertical"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(pct)}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragging(true);
        updateFromY(e.clientY);
      }}
    >
      <div ref={trackRef} className="aw-vol-track">
        <div className="aw-vol-fill" style={{ height: `${pct}%` }} />
        <div
          className="aw-vol-thumb"
          style={{ bottom: `calc(${pct}% - 0.375rem)` }}
        />
      </div>
    </div>
  );
}

/* ─── Main VideoPlayer ─── */

export function VideoPlayer({
  src,
  poster,
  episodeId,
  initialPositionSeconds,
  title,
  eyebrow,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const playerRef = useRef<Player | null>(null);

  const [ready, setReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [bufferedEnd, setBufferedEnd] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [userActive, setUserActive] = useState(true);
  const [isWaiting, setIsWaiting] = useState(false);
  const [hover, setHover] = useState<{ x: number; time: number } | null>(null);
  const [showVolume, setShowVolume] = useState(false);
  const volumeHideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* ── Player lifecycle ── */
  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    const el = document.createElement("video-js");
    wrapper.appendChild(el);

    const player = videojs(el, {
      controls: false,
      preload: "metadata",
      responsive: true,
      fluid: true,
      poster,
      sources: [{ src, type: inferType(src) }],
      bigPlayButton: false,
      userActions: { hotkeys: false },
    });

    playerRef.current = player;

    setVolume(player.volume() ?? 1);
    setMuted(player.muted() ?? false);
    setReady(true);

    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onTime = () => setCurrentTime(player.currentTime() ?? 0);
    const onDuration = () => setDuration(player.duration() ?? 0);
    const onProgress = () => {
      const b = player.buffered();
      if (!b || b.length === 0) return;
      setBufferedEnd(b.end(b.length - 1));
    };
    const onVolume = () => {
      setVolume(player.volume() ?? 0);
      setMuted(player.muted() ?? false);
    };
    const onWaiting = () => setIsWaiting(true);
    const onPlaying = () => setIsWaiting(false);
    const onEnded = () => setIsPlaying(false);

    player.on("play", onPlay);
    player.on("pause", onPause);
    player.on("timeupdate", onTime);
    player.on("durationchange", onDuration);
    player.on("loadedmetadata", onDuration);
    player.on("progress", onProgress);
    player.on("volumechange", onVolume);
    player.on("waiting", onWaiting);
    player.on("playing", onPlaying);
    player.on("ended", onEnded);

    /* Resume position — server-backed via /api/courses/state */
    if (episodeId) {
      let lastSavedAt = 0;
      const restore = () => {
        if (initialPositionSeconds == null || initialPositionSeconds < 1) return;
        const d = player.duration();
        if (typeof d === "number" && d - initialPositionSeconds < 3) return;
        player.currentTime(initialPositionSeconds);
      };
      const save = () => {
        const now = Date.now();
        if (now - lastSavedAt < 5000) return;
        lastSavedAt = now;
        const t = player.currentTime();
        if (typeof t !== "number" || t <= 0) return;
        void fetch("/api/courses/state", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          keepalive: true,
          body: JSON.stringify({
            episodeId,
            patch: { videoPositionSeconds: Number(t.toFixed(1)) },
          }),
        }).catch(() => {
          /* best-effort; the next tick will retry */
        });
      };
      const clear = () => {
        void fetch("/api/courses/state", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          keepalive: true,
          body: JSON.stringify({
            episodeId,
            patch: { videoPositionSeconds: 0 },
          }),
        }).catch(() => {});
      };
      player.on("loadedmetadata", restore);
      player.on("timeupdate", save);
      player.on("ended", clear);
    }

    return () => {
      if (playerRef.current && !playerRef.current.isDisposed()) {
        playerRef.current.dispose();
      }
      playerRef.current = null;
    };
  }, [src, poster, episodeId, initialPositionSeconds]);

  /* ── Fullscreen — track via document API since we requestFullscreen
        on the wrapper, not the video element. ── */
  useEffect(() => {
    const onFs = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  /* ── User-activity auto-hide ── */
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const wake = () => {
      setUserActive(true);
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        if (playerRef.current && !playerRef.current.paused()) {
          setUserActive(false);
        }
      }, 2200);
    };
    const hide = () => {
      if (timer) clearTimeout(timer);
      if (playerRef.current && !playerRef.current.paused()) {
        setUserActive(false);
      }
    };

    container.addEventListener("mousemove", wake);
    container.addEventListener("mouseleave", hide);
    container.addEventListener("touchstart", wake, { passive: true });
    return () => {
      if (timer) clearTimeout(timer);
      container.removeEventListener("mousemove", wake);
      container.removeEventListener("mouseleave", hide);
      container.removeEventListener("touchstart", wake);
    };
  }, []);

  /* ── Action helpers ── */
  const togglePlay = useCallback(() => {
    const p = playerRef.current;
    if (!p) return;
    if (p.paused()) {
      void p.play();
    } else {
      p.pause();
    }
  }, []);

  const seekBy = useCallback((delta: number) => {
    const p = playerRef.current;
    if (!p) return;
    const t = p.currentTime();
    const d = p.duration();
    if (typeof t !== "number" || typeof d !== "number") return;
    p.currentTime(Math.max(0, Math.min(d, t + delta)));
  }, []);

  const seekTo = useCallback((seconds: number) => {
    const p = playerRef.current;
    if (!p) return;
    const d = p.duration();
    if (typeof d !== "number") return;
    p.currentTime(Math.max(0, Math.min(d, seconds)));
  }, []);

  const setPlayerVolume = useCallback((v: number) => {
    const p = playerRef.current;
    if (!p) return;
    const clamped = Math.max(0, Math.min(1, v));
    p.volume(clamped);
    if (clamped > 0 && p.muted()) p.muted(false);
  }, []);

  const toggleMute = useCallback(() => {
    const p = playerRef.current;
    if (!p) return;
    p.muted(!p.muted());
  }, []);

  // Request fullscreen on the wrapper element so the entire React overlay
  // (controls, title, dim, center play button) goes fullscreen with the
  // video. Calling player.requestFullscreen() would only fullscreen the
  // <video> tag, hiding our chrome entirely.
  const toggleFullscreen = useCallback(() => {
    const wrapper = containerRef.current;
    if (!wrapper) return;
    if (document.fullscreenElement) {
      void document.exitFullscreen().catch(() => {});
    } else {
      void wrapper.requestFullscreen().catch(() => {});
    }
  }, []);

  /* ── Hotkeys ── */
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }
      switch (e.key) {
        case " ":
        case "k":
        case "K":
          e.preventDefault();
          togglePlay();
          break;
        case "ArrowLeft":
          e.preventDefault();
          seekBy(-5);
          break;
        case "ArrowRight":
          e.preventDefault();
          seekBy(5);
          break;
        case "j":
        case "J":
          e.preventDefault();
          seekBy(-10);
          break;
        case "l":
        case "L":
          e.preventDefault();
          seekBy(10);
          break;
        case "ArrowUp":
          e.preventDefault();
          setPlayerVolume((playerRef.current?.volume() ?? 0) + 0.05);
          break;
        case "ArrowDown":
          e.preventDefault();
          setPlayerVolume((playerRef.current?.volume() ?? 0) - 0.05);
          break;
        case "m":
        case "M":
          e.preventDefault();
          toggleMute();
          break;
        case "f":
        case "F":
          e.preventDefault();
          toggleFullscreen();
          break;
      }
    };

    container.addEventListener("keydown", onKey);
    return () => container.removeEventListener("keydown", onKey);
  }, [togglePlay, seekBy, setPlayerVolume, toggleMute, toggleFullscreen]);

  /* ── Slider interactions ── */
  const sliderPct = duration > 0 ? (currentTime / duration) * 100 : 0;
  const bufferedPct = duration > 0 ? (bufferedEnd / duration) * 100 : 0;

  const slider = useMemo(
    () => ({
      onMouseMove(e: React.MouseEvent<HTMLDivElement>) {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const ratio = Math.max(0, Math.min(1, x / rect.width));
        setHover({ x, time: ratio * (duration || 0) });
      },
      onMouseLeave() {
        setHover(null);
      },
      onClick(e: React.MouseEvent<HTMLDivElement>) {
        const rect = e.currentTarget.getBoundingClientRect();
        const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        seekTo(ratio * (duration || 0));
      },
    }),
    [duration, seekTo]
  );

  /* ── Volume hover state with hide-delay so the cursor can travel
        from the button to the popout without losing hover. ── */
  const cancelHide = useCallback(() => {
    if (volumeHideTimer.current) {
      clearTimeout(volumeHideTimer.current);
      volumeHideTimer.current = null;
    }
  }, []);
  const showVolumePopout = useCallback(() => {
    cancelHide();
    setShowVolume(true);
  }, [cancelHide]);
  const queueHideVolumePopout = useCallback(() => {
    cancelHide();
    volumeHideTimer.current = setTimeout(() => setShowVolume(false), 200);
  }, [cancelHide]);

  const showCenterPlay = !isPlaying && !isWaiting;
  const showOverlay = !isPlaying || userActive;

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      data-vjs-player
      className="aw-player relative outline-none"
      data-active={showOverlay ? "true" : "false"}
      data-paused={!isPlaying ? "true" : "false"}
      data-fullscreen={isFullscreen ? "true" : "false"}
    >
      {/* Video element wrapper — clicks on the video toggle play. */}
      <div
        ref={wrapperRef}
        onClick={togglePlay}
        className="aw-video-wrap"
      />

      {/* Dim overlay — paused or user-active */}
      <div className="aw-dim" aria-hidden />

      {/* Title overlay (top) */}
      {title && (
        <div className="aw-title">
          {eyebrow && <div className="aw-title-eyebrow">{eyebrow}</div>}
          <h3>{title}</h3>
        </div>
      )}

      {/* Buffering spinner */}
      {isWaiting && (
        <div className="aw-spinner" aria-hidden>
          <Loader2 className="size-12 animate-spin text-cyan" />
        </div>
      )}

      {/* Center play button — only when paused and not buffering */}
      {ready && showCenterPlay && (
        <button
          type="button"
          aria-label="Play"
          onClick={(e) => {
            e.stopPropagation();
            togglePlay();
          }}
          className="aw-center-play"
        >
          <Play className="size-8" fill="currentColor" strokeWidth={0} />
        </button>
      )}

      {/* Bottom controls */}
      <div
        className="aw-controls"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Slider row: time | bar | time */}
        <div className="aw-slider-row">
          <span className="aw-time">{fmt(currentTime)}</span>
          <div
            className="aw-slider"
            onMouseMove={slider.onMouseMove}
            onMouseLeave={slider.onMouseLeave}
            onClick={slider.onClick}
            role="slider"
            aria-label="Seek"
            aria-valuemin={0}
            aria-valuemax={duration || 0}
            aria-valuenow={currentTime}
          >
            <div className="aw-slider-track">
              <div
                className="aw-slider-buffered"
                style={{ width: `${bufferedPct}%` }}
              />
              <div
                className="aw-slider-fill"
                style={{ width: `${sliderPct}%` }}
              />
              <div
                className="aw-slider-thumb"
                style={{ left: `${sliderPct}%` }}
              />
            </div>
            {hover && (
              <div className="aw-tooltip" style={{ left: `${hover.x}px` }}>
                {fmt(hover.time)}
              </div>
            )}
          </div>
          <span className="aw-time aw-time-right">{fmt(duration)}</span>
        </div>

        {/* Buttons row */}
        <div className="aw-buttons-row">
          <div className="aw-buttons-left">
            <button
              type="button"
              aria-label={isPlaying ? "Pause" : "Play"}
              onClick={togglePlay}
              className="aw-btn"
            >
              {isPlaying ? (
                <Pause className="size-5" fill="currentColor" strokeWidth={0} />
              ) : (
                <Play className="size-5" fill="currentColor" strokeWidth={0} />
              )}
            </button>
            <button
              type="button"
              aria-label="Back 10 seconds"
              onClick={() => seekBy(-10)}
              className="aw-btn"
            >
              {/* Icons were drawn with reversed arrow directions — the
                  visual that reads as "back" is the one previously
                  exported as `SkipForward10Icon`. Rather than rebuild
                  the SVG paths, swap which component renders here so
                  the visual matches the action. */}
              <SkipForward10Icon className="size-5" />
            </button>
            <button
              type="button"
              aria-label="Forward 10 seconds"
              onClick={() => seekBy(10)}
              className="aw-btn"
            >
              <SkipBack10Icon className="size-5" />
            </button>

            {/* Volume — button + vertical popout slider */}
            <div
              className="aw-volume-wrap"
              onMouseEnter={showVolumePopout}
              onMouseLeave={queueHideVolumePopout}
            >
              <button
                type="button"
                aria-label={muted || volume === 0 ? "Unmute" : "Mute"}
                onClick={toggleMute}
                className="aw-btn"
              >
                <VolumeIcon
                  value={volume}
                  muted={muted}
                  className="size-5"
                />
              </button>
              {showVolume && (
                <div
                  className="aw-volume-popout"
                  onMouseEnter={showVolumePopout}
                  onMouseLeave={queueHideVolumePopout}
                >
                  <VerticalVolumeSlider
                    value={volume}
                    muted={muted}
                    onChange={setPlayerVolume}
                  />
                </div>
              )}
            </div>
          </div>

          <div className="aw-buttons-right">
            <button
              type="button"
              aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
              onClick={toggleFullscreen}
              className="aw-btn"
            >
              {isFullscreen ? (
                <Minimize className="size-5" strokeWidth={2} />
              ) : (
                <Maximize className="size-5" strokeWidth={2} />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
