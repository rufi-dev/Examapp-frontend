import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import axios from "axios";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { FiArrowRight, FiLock, FiPlay, FiX } from "react-icons/fi";
import { selectIsLoggedIn } from "../../../redux/features/auth/authSlice";
import Button from "../ui/Button";
import SectionHeader from "./SectionHeader";

// Home page «Video dərslər»: the newest teacher videos (at most 6, chosen by the
// backend). Anyone can see the cards; WATCHING needs an account. A signed-in
// visitor goes straight to the player on /videos; a guest is asked to sign in
// first and is brought back to that same video afterwards (postLoginRedirect,
// honoured by both Login and Register).

const API = `${import.meta.env.VITE_BACKEND_URL}/api/videos/public`;
const LIMIT = 6; // mirrors PUBLIC_VIDEO_LIMIT on the backend
const COUNT_KEY = "homeVideoCount"; // last seen count → right-sized skeletons

const watchPath = (v) => (v ? `/videos?v=${encodeURIComponent(v.videoId)}` : "/videos");

const readCount = () => {
  try {
    const n = Number(localStorage.getItem(COUNT_KEY));
    return Number.isFinite(n) && n >= 0 ? Math.min(n, LIMIT) : null;
  } catch {
    return null;
  }
};

// The grid adapts to how many videos exist, so one or two never look stranded
// in a three-column row: 1 → one wide feature card, 2 → a centred pair, 3+ → three across.
const gridFor = (n) =>
  n <= 1
    ? "mx-auto max-w-2xl"
    : n === 2
    ? "mx-auto max-w-4xl sm:grid-cols-2"
    : "sm:grid-cols-2 lg:grid-cols-3";

// YouTube thumbnail. A wide card asks for the HD frame (not every video has one;
// a missing one 404s) and falls back to the always-present hqdefault.
const Thumb = ({ videoId, large }) => {
  const [src, setSrc] = useState(
    `https://img.youtube.com/vi/${videoId}/${large ? "maxresdefault" : "hqdefault"}.jpg`
  );
  return (
    <img
      src={src}
      alt=""
      loading="lazy"
      decoding="async"
      onError={() => {
        const hq = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
        if (src !== hq) setSrc(hq);
      }}
      className="h-full w-full object-cover transition-transform duration-500 ease-out-quint group-hover:scale-[1.04]"
    />
  );
};

const VideoCard = ({ video, large, locked, onOpen }) => (
  <button
    type="button"
    onClick={() => onOpen(video)}
    aria-label={`${video.title} — ${locked ? "izləmək üçün daxil ol" : "izlə"}`}
    className="group flex h-full w-full flex-col overflow-hidden rounded-2xl border border-line bg-surface text-left shadow-soft ring-1 ring-transparent transition-all duration-200 ease-out-quint hover:-translate-y-1 hover:border-primary/30 hover:shadow-lift hover:ring-primary/10 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/40"
  >
    <span className="relative block aspect-video w-full overflow-hidden bg-surface2">
      <Thumb videoId={video.videoId} large={large} />
      <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/40 via-black/5 to-black/10" />
      <span aria-hidden className="absolute inset-0 grid place-items-center">
        <span
          className={`grid place-items-center rounded-full bg-white/95 text-primary shadow-lift transition-transform duration-200 ease-out-quint group-hover:scale-110 ${
            large ? "h-20 w-20" : "h-14 w-14"
          }`}
        >
          <FiPlay className={`ml-1 ${large ? "text-[2rem]" : "text-2xl"}`} />
        </span>
      </span>
      {locked && (
        <span className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-full bg-black/60 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur-sm">
          <FiLock className="text-[12px]" /> Daxil olaraq izlə
        </span>
      )}
    </span>
    <span className={`flex flex-1 flex-col ${large ? "p-5 sm:p-6" : "p-4"}`}>
      <span
        className={`line-clamp-2 font-display font-bold text-text ${
          large ? "text-lg sm:text-xl" : "text-[15px]"
        }`}
      >
        {video.title}
      </span>
      {video.ownerName && <span className="mt-1.5 text-sm text-muted">{video.ownerName}</span>}
    </span>
  </button>
);

// Guest tapped a video (or «Bütün videolar»): ask them to sign in. Remembers
// where to return so the video opens right after login / sign-up.
const SignInPrompt = ({ video, onClose }) => {
  const navigate = useNavigate();
  const boxRef = useRef(null);

  useEffect(() => {
    const opener = document.activeElement;
    boxRef.current?.querySelector("[data-autofocus]")?.focus();
    const onKey = (e) => {
      if (e.key === "Escape") return onClose();
      if (e.key !== "Tab" || !boxRef.current) return;
      // keep Tab inside the dialog
      const items = boxRef.current.querySelectorAll("button, a[href]");
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      if (opener && typeof opener.focus === "function") opener.focus();
    };
  }, [onClose]);

  const go = (to) => {
    try {
      localStorage.setItem("postLoginRedirect", watchPath(video));
    } catch {
      /* private mode — they just land on the dashboard */
    }
    navigate(to);
  };

  // Portalled: a hovered card is translated, and a `fixed` overlay inside a
  // transformed ancestor would anchor to the card instead of the viewport.
  return createPortal(
    <div className="fixed inset-0 z-[1500] flex items-end justify-center p-4 sm:items-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div
        ref={boxRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="video-signin-title"
        className="relative w-full max-w-md animate-scale-in overflow-hidden rounded-3xl border border-line bg-surface shadow-lift"
      >
        {video && (
          <div className="relative aspect-video w-full overflow-hidden bg-surface2">
            <img
              src={`https://img.youtube.com/vi/${video.videoId}/hqdefault.jpg`}
              alt=""
              className="h-full w-full object-cover"
            />
            <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
            <span aria-hidden className="absolute inset-0 grid place-items-center">
              <span className="grid h-14 w-14 place-items-center rounded-full bg-white/95 text-primary shadow-lift">
                <FiLock className="text-xl" />
              </span>
            </span>
            <p className="absolute inset-x-0 bottom-0 line-clamp-2 p-4 font-display text-base font-bold text-white">
              {video.title}
            </p>
          </div>
        )}
        <button
          type="button"
          onClick={onClose}
          className={`absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full transition-colors ${
            video ? "bg-black/50 text-white hover:bg-black/70" : "text-muted hover:bg-surface2 hover:text-text"
          }`}
          aria-label="Bağla"
        >
          <FiX />
        </button>
        <div className="p-6 sm:p-7">
          {!video && (
            <div className="mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary">
              <FiPlay className="ml-0.5 text-[22px]" />
            </div>
          )}
          <h2 id="video-signin-title" className="font-display text-xl font-bold text-text">
            İzləmək üçün daxil ol
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            Video dərslər BunkerMath hesabı olanlar üçündür. Daxil ol və ya pulsuz qeydiyyatdan keç —
            {video ? " video dərhal açılacaq." : " bütün videolar açılacaq."}
          </p>
          <div className="mt-6 flex flex-col gap-2.5 sm:flex-row-reverse">
            <Button data-autofocus type="button" onClick={() => go("/login")} className="sm:flex-1">
              Daxil ol
            </Button>
            <Button type="button" variant="secondary" onClick={() => go("/register")} className="sm:flex-1">
              Qeydiyyatdan keç
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

const HomeVideos = () => {
  const navigate = useNavigate();
  const isLoggedIn = useSelector(selectIsLoggedIn);
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [skeletons] = useState(() => readCount() ?? 3);
  const [prompt, setPrompt] = useState(null); // { video } while the sign-in prompt is open

  useEffect(() => {
    let on = true;
    axios
      .get(API)
      .then((r) => {
        if (!on) return;
        const list = (Array.isArray(r.data) ? r.data : []).filter((v) => v && v.videoId).slice(0, LIMIT);
        setVideos(list);
        try {
          localStorage.setItem(COUNT_KEY, String(list.length));
        } catch {
          /* ignore */
        }
      })
      .catch(() => {})
      .finally(() => {
        if (on) setLoading(false);
      });
    return () => {
      on = false;
    };
  }, []);

  const open = (video) => {
    if (isLoggedIn) navigate(watchPath(video));
    else setPrompt({ video });
  };
  const closePrompt = useCallback(() => setPrompt(null), []);

  // Nothing to show → no section at all (also while loading if we know it's empty).
  if (loading ? skeletons === 0 : videos.length === 0) return null;

  const n = loading ? skeletons : videos.length;
  const large = n === 1;

  return (
    <section
      id="videolar"
      aria-labelledby="videolar-title"
      className="relative scroll-mt-24 overflow-hidden border-b border-line bg-surface2/40 py-14 sm:py-20"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-graph opacity-50 [mask-image:radial-gradient(70%_60%_at_50%_0%,black,transparent_80%)]"
      />
      <div className="container-app relative">
        <SectionHeader
          id="videolar-title"
          title="Video dərslər"
          subtitle="Müəllimlərin mövzu izahları — seç və izlə."
        />

        <div className={`mt-10 grid gap-6 ${gridFor(n)}`}>
          {loading
            ? Array.from({ length: n }).map((_, k) => (
                <div key={k} className="animate-pulse overflow-hidden rounded-2xl border border-line bg-surface">
                  <div className="aspect-video bg-surface2" />
                  <div className="space-y-2.5 p-4">
                    <div className="h-4 w-3/4 rounded bg-surface2" />
                    <div className="h-3 w-1/3 rounded bg-surface2" />
                  </div>
                </div>
              ))
            : videos.map((v) => (
                <VideoCard key={v._id || v.videoId} video={v} large={large} locked={!isLoggedIn} onOpen={open} />
              ))}
        </div>

        {/* Only a slice is shown — point to the full list once the slice is full. */}
        {!loading && videos.length >= LIMIT && (
          <div className="mt-10 flex justify-center">
            <button
              type="button"
              onClick={() => (isLoggedIn ? navigate("/videos") : setPrompt({ video: null }))}
              className="group/more inline-flex h-12 items-center gap-2 rounded-xl border-2 border-primary/30 bg-primary/5 px-8 text-base font-bold text-primary transition-all duration-200 ease-out-quint hover:-translate-y-0.5 hover:border-primary hover:bg-primary hover:text-primary-fg"
            >
              Bütün videolar
              <FiArrowRight className="transition-transform duration-200 ease-out-quint group-hover/more:translate-x-1" />
            </button>
          </div>
        )}
      </div>

      {prompt && <SignInPrompt video={prompt.video} onClose={closePrompt} />}
    </section>
  );
};

export default HomeVideos;
