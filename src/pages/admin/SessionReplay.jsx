import PropTypes from "prop-types";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { FiArrowLeft, FiArrowRight, FiCheck, FiCircle, FiExternalLink, FiFastForward, FiMonitor, FiRefreshCw, FiSmartphone, FiTrash2, FiUserPlus } from "react-icons/fi";
import { TbDeviceGamepad2 } from "react-icons/tb";
import Player from "rrweb-player";
import "rrweb-player/dist/style.css";
import { Replayer } from "@rrweb/replay";
import "@rrweb/replay/dist/style.css";
import AccountLayout from "../../components/AccountLayout";
import { deleteRecording, getRecording, liveEvents } from "../../utils/recApi";
import { FILTERS, buildLog, canvasFramesAsBackground, clock, idleItems, inlineBlobImages, lasted, squeezeIdle, steadyFilter, steadyViewport } from "../../helper/sessionLog";
import { formatDayTime, readDevice, sourceLabel } from "../../helper/peopleFormat";
import CenterLoader from "../../components/ui/CenterLoader";

/*
 * Watch one visit: the replay on the left, the story on the right. Every line
 * of the story (a page, a click, an error, a failed request, a message, a step
 * forward) jumps the replay to its moment; errors and steps are also marked on
 * the replay's own progress bar.
 *
 * It plays at real speed (pauses are pauses) unless "skip inactive" is turned
 * on in the player. A visit still in progress is shown LIVE instead: the screen
 * follows the teacher a few seconds behind, the story grows as things happen,
 * and when they leave it becomes the full recording, all without a reload.
 */

const POLL_MS = 2500;

// Marks on the player's progress bar, by event kind.
const TAG_COLORS = { error: "#d73337", api: "#d73337", toast: "#e9b452", slow: "#e9b452", milestone: "#15803d", game: "#967de8" };
const TONE_DOT = { bad: "bg-danger", warn: "bg-warning", good: "bg-success", info: "bg-primary", plain: "bg-muted", muted: "bg-line" };
const TONE_TEXT = { bad: "text-danger", warn: "text-text", good: "text-success", info: "text-text", plain: "text-text", muted: "text-muted" };
const STEPS = ["Qeydiyyatdan keçdi", "Sinif yaratdı", "İmtahan yaratdı", "Sualları saxladı"];

function ReplayPlayer({ events, onTime, playerRef }) {
  const host = useRef(null);
  useEffect(() => {
    const el = host.current;
    if (!el || events.length < 2) return undefined;
    const steady = steadyViewport(events);
    const meta = steady.find((e) => e.type === 4)?.data;
    const width = el.clientWidth;
    const ratio = meta?.width && meta?.height ? meta.height / meta.width : 0.62;
    const height = Math.max(320, Math.min(Math.round(width * ratio), 720));
    let p = null;
    try {
      p = new Player({
        target: el,
        // skipInactive off: the replay keeps the real pace, waits included.
        // pauseAnimation off: paused or dragged to a moment, a dialog that
        // animates in would otherwise sit frozen at its invisible first frame.
        // UNSAFE_replayCanvas: draw what was recorded on canvases (a PDF page
        // being cropped, a pen explaining an answer). Without it rrweb skips
        // those frames and the canvas is an empty box.
        props: { events: steady, width, height, autoPlay: false, skipInactive: false, pauseAnimation: false, UNSAFE_replayCanvas: true, showController: true, tags: TAG_COLORS, speedOption: [1, 2, 4, 8], mouseTail: false },
      });
      p.addEventListener("ui-update-current-time", (e) => onTime(e?.payload || 0));
      playerRef.current = p;
    } catch {
      el.textContent = "Bu sessiyanı göstərmək alınmadı.";
    }
    return () => {
      try {
        p?.$destroy();
      } catch {
        /* already gone */
      }
      el.innerHTML = "";
      playerRef.current = null;
    };
  }, [events, onTime, playerRef]);
  return <div ref={host} className="w-full overflow-hidden rounded-xl bg-white [&_.rr-player]:!shadow-none" />;
}
ReplayPlayer.propTypes = { events: PropTypes.array, onTime: PropTypes.func, playerRef: PropTypes.object };

/*
 * A visit as it happens. rrweb's live mode: the replay clock starts just behind
 * the newest event and runs in real time; whatever arrives is added and played
 * at its moment. The browser sends a slice every few seconds and this asks for
 * new ones every POLL_MS, so it trails the teacher by a few seconds.
 */
function LiveViewer({ rid, events, lastSeq, onMore, onEnded }) {
  const box = useRef(null);
  const stage = useRef(null);
  const [frame, setFrame] = useState(() => {
    const meta = events.find((e) => e.type === 4)?.data;
    return { w: meta?.width || 1280, h: meta?.height || 800 };
  });
  const [boxW, setBoxW] = useState(0);
  const cb = useRef({ onMore, onEnded });
  cb.current = { onMore, onEnded };

  useEffect(() => {
    const el = box.current;
    if (!el) return undefined;
    const ro = new ResizeObserver(() => setBoxW(el.clientWidth));
    ro.observe(el);
    setBoxW(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const root = stage.current;
    if (!root) return undefined;
    const steady = steadyFilter();
    let replayer = null;
    try {
      /*
       * Catch up first, then follow. Playing to the end applies every event so
       * far the normal way, page changes included. (Feeding the past through
       * addEvent in live mode does not: rrweb applies those to an in-memory
       * copy of the page and never paints it, so a visit whose page was built
       * after the first snapshot showed a blank frame.) Then pause, and go live
       * from the newest moment: only events newer than that arrive afterwards,
       * and the live timer plays each at its time.
       */
      // pauseAnimation off: rrweb freezes every CSS animation while paused, and
      // the catch-up pause below (or a new snapshot) would leave anything that
      // animates in, like a dialog fading up, stuck invisible at its first frame.
      replayer = new Replayer(steady(events), { root, liveMode: true, mouseTail: false, showWarning: false, skipInactive: false, pauseAnimation: false, UNSAFE_replayCanvas: true });
      replayer.on("resize", (d) => d?.width && setFrame({ w: d.width, h: d.height }));
      const newest = events[events.length - 1]?.timestamp || Date.now();
      replayer.play(replayer.getMetaData().totalTime);
      replayer.pause();
      replayer.startLive(newest);
    } catch {
      root.textContent = "Canlı görüntünü açmaq alınmadı.";
    }
    let seq = lastSeq;
    let alive = true;
    let timer = null;
    const tick = async () => {
      if (!alive) return;
      try {
        const d = await liveEvents(rid, seq);
        if (!alive) return;
        seq = d.lastSeq;
        if (d.events?.length) {
          for (const e of steady(canvasFramesAsBackground(d.events))) replayer?.addEvent(e);
          cb.current.onMore(d.events, seq);
        }
        if (!d.live) {
          cb.current.onEnded();
          return;
        }
      } catch {
        /* a missed poll: try again */
      }
      timer = setTimeout(tick, POLL_MS);
    };
    timer = setTimeout(tick, POLL_MS);
    return () => {
      alive = false;
      clearTimeout(timer);
      try {
        replayer?.pause();
        replayer?.destroy?.();
      } catch {
        /* gone */
      }
      root.innerHTML = "";
    };
    // Built once per visit; later events arrive through addEvent, not props.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rid]);

  const scale = boxW ? Math.min(1, boxW / frame.w) : 1;
  return (
    <div ref={box} className="w-full overflow-hidden rounded-xl bg-white" style={{ height: Math.round(frame.h * scale) || 400 }}>
      {/* The video player's stylesheet centres every .replayer-wrapper at 50%/50%
          (it positions its own); here the frame sits at the corner and is scaled. */}
      <div
        ref={stage}
        className="relative [&_.replayer-wrapper]:!left-0 [&_.replayer-wrapper]:!top-0 [&_.replayer-wrapper]:!float-none"
        style={{ width: frame.w, height: frame.h, transform: `scale(${scale})`, transformOrigin: "top left" }}
      />
    </div>
  );
}
LiveViewer.propTypes = { events: PropTypes.array, lastSeq: PropTypes.number, onEnded: PropTypes.func, onMore: PropTypes.func, rid: PropTypes.string };

export default function SessionReplay() {
  const { rid } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [failed, setFailed] = useState(false);
  const [filter, setFilter] = useState("all");
  const [now, setNow] = useState(0);
  const playerRef = useRef(null);
  const logRef = useRef(null);
  // "live" while the visit is still going, then "video".
  const [mode, setMode] = useState(null);

  const load = useCallback(
    (afterLive = false) => {
      let alive = true;
      getRecording(rid)
        .then((d) => {
          if (!alive) return;
          // The live visit just ended because the page reloaded, and the reload
          // is already being recorded: follow it there.
          if (afterLive && d?.next?.live) {
            toast.info("Səhifə yeniləndi: davamına keçdik");
            navigate(`/sessiyalar/${d.next._id}`, { replace: true });
            return;
          }
          setData(d);
          setMode(d?.recording?.live ? "live" : "video");
        })
        .catch(() => alive && setFailed(true));
      return () => {
        alive = false;
      };
    },
    [rid, navigate]
  );
  useEffect(() => {
    setData(null);
    setMode(null);
    return load();
  }, [load]);

  // Live: new events extend the story; when they leave, reload it as a video.
  const onMore = useCallback((more) => setData((d) => (d ? { ...d, events: [...d.events, ...more] } : d)), []);
  const onEnded = useCallback(() => {
    // Give a reload a moment to start its own recording before deciding.
    setTimeout(() => load(true), 2500);
  }, [load]);

  const events = useMemo(() => {
    const list = data?.events || [];
    // Pictures shown from temporary blob: links get their recorded copies back,
    // and what was drawn on canvases is shown in a way a jump cannot wipe.
    inlineBlobImages(list);
    return canvasFramesAsBackground(list);
  }, [data]);
  // Long still stretches (a tab left open) are cut to a few seconds in the
  // video; the story keeps real times and the two clocks convert between them.
  const [squeeze, setSqueeze] = useState(true);
  const clocks = useMemo(
    () => (mode === "video" && squeeze ? squeezeIdle(events) : { events, gaps: [], toShort: (t) => t, toReal: (t) => t }),
    [events, mode, squeeze]
  );
  const idle = useMemo(() => squeezeIdle(events).gaps, [events]);
  const cutMs = idle.reduce((a, g) => a + g.cut, 0);
  const log = useMemo(() => {
    const base = buildLog(events);
    if (!idle.length) return base;
    return { ...base, items: [...base.items, ...idleItems(idle)].sort((a, b) => a.t - b.t) };
  }, [events, idle]);
  const shown = useMemo(() => log.items.filter(FILTERS.find((f) => f.key === filter).test), [log, filter]);
  const clockRef = useRef(clocks);
  clockRef.current = clocks;
  const onTime = useMemo(() => (t) => setNow(clockRef.current.toReal(t)), []);
  const rec = data?.recording;
  const user = rec?.user;
  // A student's visit: back to the students' list, and their user page instead of a teacher's.
  const isStudent = user?.role === "student";
  const listHref = isStudent ? "/sessiyalar?who=students" : "/sessiyalar";
  const dev = readDevice(rec?.userAgent);
  // The line the replay is on: the last one at or before the current moment.
  const activeIndex = mode === "live" ? shown.length - 1 : shown.reduce((acc, it, i) => (it.t <= now ? i : acc), -1);

  // Live, the newest line is the one to see: keep the story scrolled to it.
  useEffect(() => {
    if (mode === "live" && logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [mode, shown.length]);

  const seek = (t) => {
    if (mode === "live") return;
    try {
      // A moment and a second and a half before it, on the video's own clock
      // (taken before converting, a line just after a long wait would land
      // inside the wait).
      playerRef.current?.goto(Math.max(0, clocks.toShort(t) - 1500), true);
    } catch {
      /* not ready */
    }
  };

  const remove = async () => {
    if (!window.confirm("Bu sessiya silinsin?")) return;
    try {
      await deleteRecording(rid);
      toast.success("Sessiya silindi");
      navigate(listHref);
    } catch {
      toast.error("Silinmədi");
    }
  };

  return (
    <AccountLayout title="Sessiya" hidePageHeader contentClassName="!max-w-none">
      <Link to={listHref} className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted transition-colors hover:text-text">
        <FiArrowLeft /> Sessiyalar
      </Link>

      {failed ? (
        <p className="mt-6 rounded-2xl border border-line bg-surface p-8 text-center text-sm text-muted">Sessiya tapılmadı və ya artıq silinib.</p>
      ) : !data ? (
        <CenterLoader />
      ) : (
        <>
          <section className="mt-4 flex flex-wrap items-start justify-between gap-4 rounded-2xl border border-line bg-surface p-5 shadow-soft">
            <div className="min-w-0">
              <h1 className="flex flex-wrap items-center gap-2 font-display text-2xl font-bold tracking-tight text-text">
                {user?.name || "Silinmiş hesab"}
                {rec.registeredInSession && (
                  <span className="inline-flex items-center gap-1 rounded-md bg-success/[0.12] px-2 py-0.5 text-xs font-bold text-success">
                    <FiUserPlus /> qeydiyyat bu sessiyada
                  </span>
                )}
                {log.counts.games > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-md bg-accent2/[0.15] px-2 py-0.5 text-xs font-bold text-text" title="AI imtahanı yazarkən gözləmə oyunu oynadı">
                    <TbDeviceGamepad2 className="text-accent2" /> oyun oynadı
                  </span>
                )}
                {mode === "live" && (
                  <span className="inline-flex items-center gap-1.5 rounded-md bg-danger px-2 py-0.5 text-xs font-bold text-white" title="İndi saytdadır; görüntü bir neçə saniyə arxadan gəlir">
                    <span className="h-2 w-2 animate-pulse rounded-full bg-white" /> CANLI
                  </span>
                )}
              </h1>
              <p className="mt-0.5 text-sm text-muted">
                {user?.email}
                {rec.source && <span title="Haradan gəlib"> · {sourceLabel(rec.source)}</span>}
              </p>
              <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
                <span className="text-text">{formatDayTime(rec.startedAt)}</span>
                <span>· {lasted(log.duration)}</span>
                {dev && (
                  <span className="inline-flex items-center gap-1">
                    · {dev.mobile ? <FiSmartphone /> : <FiMonitor />} {dev.browser}
                    {dev.system && `, ${dev.system}`}
                  </span>
                )}
                {rec.screen && <span>· {rec.screen.replace("x", "×")}</span>}
              </p>
            </div>
            <div className="flex flex-col items-end gap-3">
              <div className="flex gap-2">
                {user?._id && (
                  <Link
                    to={`/user/${user._id}/details`}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-surface px-3 py-1.5 text-[13px] font-semibold text-text transition-colors hover:bg-surface2"
                  >
                    {isStudent ? "Şagird" : "Müəllim"} <FiExternalLink />
                  </Link>
                )}
                <button type="button" onClick={remove} className="inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[13px] font-semibold text-danger transition-colors hover:bg-danger/10">
                  <FiTrash2 /> Sil
                </button>
              </div>
              {/* how far this visit got */}
              <ol className="flex flex-wrap items-center gap-1.5" aria-label="Bu sessiyada atılan addımlar">
                {STEPS.map((step) => {
                  const done = log.milestones.includes(step);
                  return (
                    <li
                      key={step}
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${done ? "bg-success/[0.12] text-success" : "bg-surface2 text-muted"}`}
                    >
                      {done ? <FiCheck /> : <FiCircle className="text-[10px]" />} {step}
                    </li>
                  );
                })}
              </ol>
            </div>
          </section>

          <div className="mt-5 grid grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,1fr)_24rem]">
            <div className="rounded-2xl border border-line bg-surface p-3 shadow-soft">
              {events.length < 2 ? (
                <p className="p-10 text-center text-sm text-muted">{mode === "live" ? "Görüntü gəlir…" : "Bu sessiyada göstəriləcək görüntü yoxdur."}</p>
              ) : mode === "live" ? (
                <>
                  <LiveViewer rid={rid} events={events} lastSeq={data.lastSeq ?? -1} onMore={onMore} onEnded={onEnded} />
                  <p className="mt-2 px-1 text-xs text-muted">Canlı: ekran bir neçə saniyə arxadan gəlir. Çıxanda tam video kimi açılacaq.</p>
                </>
              ) : (
                <>
                  <ReplayPlayer events={clocks.events} onTime={onTime} playerRef={playerRef} />
                  {idle.length > 0 && (
                    <label className="mt-2 flex cursor-pointer items-center gap-2 px-1 text-xs text-muted">
                      <input type="checkbox" checked={squeeze} onChange={(e) => setSqueeze(e.target.checked)} className="h-4 w-4 accent-[rgb(var(--primary))]" />
                      <FiFastForward className="shrink-0" />
                      <span>
                        Uzun boşluqları qısalt: {idle.length} fasilə, cəmi {lasted(cutMs)} heç nə olmayıb
                        {squeeze ? " (videoda bir neçə saniyəyə endirildi; siyahıdakı vaxtlar realdır)" : ""}
                      </span>
                    </label>
                  )}
                </>
              )}
              {(data.prev || data.next) && mode !== "live" && (
                <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-surface2/50 px-3.5 py-2.5 text-sm">
                  {data.prev ? (
                    <Link to={`/sessiyalar/${data.prev._id}`} className="inline-flex items-center gap-1.5 font-semibold text-primary hover:underline">
                      <FiArrowLeft /> Əvvəlki hissə
                    </Link>
                  ) : (
                    <span />
                  )}
                  {data.next && (
                    <span className="flex flex-wrap items-center gap-2 text-muted">
                      <FiRefreshCw className="shrink-0" /> Səhifə burada yeniləndi; davamı ayrıca yazılıb.
                      <Link to={`/sessiyalar/${data.next._id}`} className="inline-flex items-center gap-1.5 font-semibold text-primary hover:underline">
                        Davamı <FiArrowRight />
                      </Link>
                    </span>
                  )}
                </div>
              )}
            </div>

            <aside className="flex max-h-[82vh] flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-soft">
              <div className="border-b border-line p-4">
                <p className="text-sm text-muted">
                  <b className="text-text">{log.counts.pages}</b> səhifə · <b className="text-text">{log.counts.clicks}</b> klik ·{" "}
                  <b className={log.counts.problems ? "text-danger" : "text-text"}>{log.counts.problems}</b> problem
                  {log.counts.typed > 0 && (
                    <>
                      {" "}· <b className="text-text">{log.counts.typed}</b> yazı
                    </>
                  )}
                  {log.counts.rage > 0 && (
                    <>
                      {" "}· <b className="text-text">{log.counts.rage}</b> təkrar klik
                    </>
                  )}
                </p>
                <div role="tablist" className="mt-3 flex flex-wrap gap-1">
                  {FILTERS.map((f) => (
                    <button
                      key={f.key}
                      type="button"
                      role="tab"
                      aria-selected={filter === f.key}
                      onClick={() => setFilter(f.key)}
                      className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-colors ${filter === f.key ? "bg-primary text-primary-fg" : "text-muted hover:bg-surface2 hover:text-text"}`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>
              <ol ref={logRef} className="flex-1 overflow-y-auto overscroll-contain p-2">
                {shown.length === 0 && <li className="p-6 text-center text-sm text-muted">Bu filtrdə heç nə yoxdur.</li>}
                {shown.map((it, i) => (
                  <li key={`${it.t}-${i}`}>
                    <button
                      type="button"
                      onClick={() => seek(it.t)}
                      className={`flex w-full items-start gap-3 rounded-xl px-2.5 py-2 text-left transition-colors ${i === activeIndex ? "bg-primary/10" : "hover:bg-surface2"}`}
                      title={it.stack || undefined}
                    >
                      <span className="mt-0.5 w-11 shrink-0 font-mono text-[11px] tabular-nums text-muted">{clock(it.t)}</span>
                      <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${TONE_DOT[it.tone] || "bg-line"}`} />
                      <span className="min-w-0">
                        <span className={`line-clamp-2 break-words text-[13px] font-semibold ${TONE_TEXT[it.tone] || "text-text"}`}>{it.title}</span>
                        {it.detail && <span className="block truncate text-[11px] text-muted">{it.detail}</span>}
                      </span>
                    </button>
                  </li>
                ))}
              </ol>
            </aside>
          </div>
        </>
      )}
    </AccountLayout>
  );
}
