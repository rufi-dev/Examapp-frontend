import { useEffect, useRef, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { FaTelegramPlane } from "react-icons/fa";
import {
  FiCheckCircle,
  FiSend,
  FiRefreshCw,
  FiLink2,
  FiChevronDown,
  FiChevronRight,
} from "react-icons/fi";
import Button from "./ui/Button";
import Spinner from "./Spinner";

const API = `${import.meta.env.VITE_BACKEND_URL}/api/telegram`;

// Notification event types (multi-select). Scope (classes/exams) is opt-out.
const EVENTS = [
  { key: "onStart", label: "İmtahana başlayanda", desc: "Şagird imtahana başlayan kimi" },
  { key: "onFinish", label: "İmtahan bitəndə", desc: "Şagird bitirəndə — bal ilə birlikdə" },
  { key: "onViolation", label: "Pozuntu (anti-cheat)", desc: "İmtahan pozuntuya görə dayandırılanda" },
  { key: "onJoin", label: "Sinfə qoşulma", desc: "Şagird sinfə qoşulanda / sorğu göndərəndə" },
  { key: "onReport", label: "İmtahan hesabatı", desc: "İmtahan bitdikdə PDF + Excel nəticə hesabatı" },
];

// A small native checkbox styled with the brand accent.
const Check = ({ checked, indeterminate, disabled, onChange }) => {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = !!indeterminate && !checked;
  }, [indeterminate, checked]);
  return (
    <input
      ref={ref}
      type="checkbox"
      checked={checked}
      disabled={disabled}
      onChange={onChange}
      className="h-5 w-5 shrink-0 cursor-pointer rounded border-line accent-[#229ED9] disabled:cursor-not-allowed disabled:opacity-40"
    />
  );
};

// Teacher-facing card: link Telegram + choose which notifications to receive and
// for which classes/exams. Lives on the profile page (staff only).
const TelegramNotifications = () => {
  const [status, setStatus] = useState(null); // { configured, linked, deepLink, ... }
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(""); // "test" | "unlink" | "check"
  const [waiting, setWaiting] = useState(false); // polling after Connect tap
  const pollRef = useRef(null);

  // Automation state.
  const [auto, setAuto] = useState(null); // { onStart, ... , classes }
  const [exClasses, setExClasses] = useState([]); // excluded class ids
  const [exExams, setExExams] = useState([]); // excluded exam ids
  const [open, setOpen] = useState({}); // expanded class ids in the tree
  const [saving, setSaving] = useState(false);

  const loadStatus = async () => {
    try {
      const { data } = await axios.get(`${API}/status`);
      setStatus(data);
      return data;
    } catch {
      setStatus({ configured: false, linked: false });
      return null;
    } finally {
      setLoading(false);
    }
  };

  const loadAutomation = async () => {
    try {
      const { data } = await axios.get(`${API}/automation`);
      setAuto(data);
      setExClasses(data.prefs?.excludedClasses || []);
      setExExams(data.prefs?.excludedExams || []);
    } catch {
      /* ignore — automation just won't show */
    }
  };

  useEffect(() => {
    (async () => {
      const s = await loadStatus();
      if (s?.linked) loadAutomation();
    })();
    return () => pollRef.current && clearInterval(pollRef.current);
  }, []);

  // After the teacher opens the bot, poll so the card flips to "connected" once
  // they press Start in Telegram.
  const startPolling = () => {
    setWaiting(true);
    let tries = 0;
    pollRef.current && clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      tries += 1;
      const data = await loadStatus();
      if (data?.linked || tries >= 20) {
        clearInterval(pollRef.current);
        setWaiting(false);
        if (data?.linked) {
          toast.success("Telegram qoşuldu! 🎉");
          loadAutomation();
        }
      }
    }, 3000);
  };

  const onConnect = () => {
    if (!status?.deepLink) return;
    window.open(status.deepLink, "_blank", "noopener");
    startPolling();
  };

  const onCheck = async () => {
    setBusy("check");
    const data = await loadStatus();
    setBusy("");
    if (data?.linked) {
      toast.success("Telegram qoşuldu! 🎉");
      loadAutomation();
    } else toast.info("Hələ qoşulmayıb. Botda “Start” düyməsini basdığınızdan əmin olun.");
  };

  const onTest = async () => {
    setBusy("test");
    try {
      await axios.post(`${API}/test`);
      toast.success("Test bildirişi göndərildi — Telegram-ı yoxlayın.");
    } catch (e) {
      toast.error(e?.response?.data?.message || "Test mesajı göndərilmədi");
    } finally {
      setBusy("");
    }
  };

  const onUnlink = async () => {
    setBusy("unlink");
    try {
      await axios.post(`${API}/unlink`);
      setAuto(null);
      await loadStatus();
      toast.info("Telegram ayrıldı.");
    } catch {
      toast.error("Əməliyyat alınmadı");
    } finally {
      setBusy("");
    }
  };

  // ---- automation toggles -------------------------------------------------
  const setEvent = (key, val) => setAuto((a) => ({ ...a, prefs: { ...a.prefs, [key]: val } }));

  const classOn = (cid) => !exClasses.includes(cid);
  const examOn = (cid, eid) => classOn(cid) && !exExams.includes(eid);

  const toggleClass = (cls) => {
    if (classOn(cls._id)) {
      // turn off -> exclude the class
      setExClasses((s) => [...s, cls._id]);
    } else {
      // turn on -> include the class AND re-enable all its exams (clean slate)
      setExClasses((s) => s.filter((id) => id !== cls._id));
      const ids = new Set(cls.exams.map((e) => e._id));
      setExExams((s) => s.filter((id) => !ids.has(id)));
    }
  };

  const toggleExam = (cid, eid) => {
    if (!classOn(cid)) return;
    setExExams((s) => (s.includes(eid) ? s.filter((id) => id !== eid) : [...s, eid]));
  };

  // A class is "partial" when it's on but some of its exams are excluded.
  const classPartial = (cls) =>
    classOn(cls._id) && cls.exams.some((e) => exExams.includes(e._id));

  const onSave = async () => {
    setSaving(true);
    try {
      await axios.put(`${API}/automation`, {
        onStart: auto.prefs.onStart,
        onFinish: auto.prefs.onFinish,
        onViolation: auto.prefs.onViolation,
        onJoin: auto.prefs.onJoin,
        onReport: auto.prefs.onReport,
        excludedClasses: exClasses,
        excludedExams: exExams,
      });
      toast.success("Avtomatlaşdırma yadda saxlanıldı.");
    } catch {
      toast.error("Yadda saxlanmadı");
    } finally {
      setSaving(false);
    }
  };

  // Hide entirely when the server has no bot configured.
  if (!loading && status && status.configured === false) return null;

  return (
    <div className="mt-6 rounded-3xl border border-line bg-surface p-6 shadow-soft sm:p-8">
      <div className="flex items-start gap-4">
        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#229ED9]/12 text-[#229ED9]">
          <FaTelegramPlane className="text-2xl" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-display text-lg font-bold text-text">Avtomatlaşdırma — Telegram</h2>
            {status?.linked && (
              <span className="inline-flex items-center gap-1 rounded-full bg-success/12 px-2.5 py-0.5 text-xs font-semibold text-success">
                <FiCheckCircle /> Qoşulub
              </span>
            )}
          </div>
          <p className="mt-1 text-sm leading-relaxed text-muted">
            Şagird fəaliyyətindən (başlama, bitirmə, pozuntu, qoşulma) dərhal Telegram-a bildiriş.
          </p>

          {loading ? (
            <div className="mt-4">
              <Spinner size={20} className="text-primary" />
            </div>
          ) : !status?.linked ? (
            /* ---- not linked: connect flow ---- */
            <div className="mt-4">
              <ol className="mb-4 space-y-1.5 text-sm text-muted">
                <li>1. “Telegram-ı qoş” düyməsini basın — bot açılacaq.</li>
                <li>
                  2. Telegram-da <span className="font-semibold text-text">Start</span> düyməsini
                  basın.
                </li>
                <li>3. Bu səhifə avtomatik “Qoşulub” olacaq.</li>
              </ol>
              <div className="flex flex-wrap gap-2.5">
                <Button
                  type="button"
                  onClick={onConnect}
                  className="bg-[#229ED9] text-white hover:brightness-105"
                >
                  <FiLink2 /> Telegram-ı qoş
                </Button>
                <Button type="button" variant="soft" onClick={onCheck} disabled={busy === "check"}>
                  {busy === "check" || waiting ? <Spinner size={16} /> : <FiRefreshCw />} Yoxla
                </Button>
              </div>
              {waiting && (
                <p className="mt-3 text-xs text-muted">
                  Botda “Start” gözlənilir… Bu pəncərəni açıq saxlayın.
                </p>
              )}
            </div>
          ) : (
            /* ---- linked: test/unlink + automation settings ---- */
            <div className="mt-4 space-y-6">
              <div className="flex flex-wrap gap-2.5">
                <Button type="button" variant="soft" onClick={onTest} disabled={busy === "test"}>
                  {busy === "test" ? <Spinner size={16} /> : <FiSend />} Test bildirişi
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={onUnlink}
                  disabled={busy === "unlink"}
                >
                  {busy === "unlink" ? <Spinner size={16} /> : null} Ayır
                </Button>
              </div>

              {!auto ? (
                <Spinner size={18} className="text-primary" />
              ) : (
                <>
                  {/* Event types */}
                  <div>
                    <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-muted">
                      Bildiriş növləri
                    </h3>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {EVENTS.map((ev) => (
                        <label
                          key={ev.key}
                          className="flex cursor-pointer items-start gap-3 rounded-xl border border-line bg-surface2/40 p-3 transition-colors hover:border-primary/40"
                        >
                          <Check
                            checked={!!auto.prefs[ev.key]}
                            onChange={(e) => setEvent(ev.key, e.target.checked)}
                          />
                          <span className="min-w-0">
                            <span className="block text-sm font-semibold text-text">{ev.label}</span>
                            <span className="block text-xs text-muted">{ev.desc}</span>
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Class / exam scope */}
                  <div>
                    <h3 className="mb-1 text-sm font-bold uppercase tracking-wide text-muted">
                      Siniflər və imtahanlar
                    </h3>
                    <p className="mb-2 text-xs text-muted">
                      Seçilmiş siniflər/imtahanlar üçün bildiriş gəlir. Yeni yaradılanlar avtomatik
                      seçilir — istəmədiyinizi söndürün.
                    </p>
                    {auto.classes.length === 0 ? (
                      <p className="rounded-xl border border-dashed border-line p-4 text-sm text-muted">
                        Hələ sinif/imtahan yoxdur.
                      </p>
                    ) : (
                      <div className="divide-y divide-line overflow-hidden rounded-xl border border-line">
                        {auto.classes.map((cls) => (
                          <div key={cls._id}>
                            <div className="flex items-center gap-2 bg-surface2/40 px-3 py-2.5">
                              <Check
                                checked={classOn(cls._id)}
                                indeterminate={classPartial(cls)}
                                onChange={() => toggleClass(cls)}
                              />
                              <button
                                type="button"
                                onClick={() => setOpen((o) => ({ ...o, [cls._id]: !o[cls._id] }))}
                                className="flex min-w-0 flex-1 items-center gap-1.5 text-left"
                              >
                                <span className="truncate text-sm font-semibold text-text">
                                  {cls.name}
                                </span>
                                <span className="shrink-0 rounded-full bg-surface px-1.5 text-[11px] font-semibold text-muted">
                                  {cls.exams.length}
                                </span>
                                {cls.exams.length > 0 &&
                                  (open[cls._id] ? (
                                    <FiChevronDown className="text-muted" />
                                  ) : (
                                    <FiChevronRight className="text-muted" />
                                  ))}
                              </button>
                            </div>
                            {open[cls._id] && cls.exams.length > 0 && (
                              <div className="space-y-1 px-3 py-2 pl-9">
                                {cls.exams.map((ex) => (
                                  <label
                                    key={ex._id}
                                    className={`flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 ${
                                      classOn(cls._id) ? "hover:bg-surface2/60" : "opacity-50"
                                    }`}
                                  >
                                    <Check
                                      checked={examOn(cls._id, ex._id)}
                                      disabled={!classOn(cls._id)}
                                      onChange={() => toggleExam(cls._id, ex._id)}
                                    />
                                    <span className="truncate text-sm text-text">{ex.name}</span>
                                  </label>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end">
                    <Button type="button" onClick={onSave} disabled={saving}>
                      {saving ? <Spinner size={16} /> : null} Yadda saxla
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TelegramNotifications;
