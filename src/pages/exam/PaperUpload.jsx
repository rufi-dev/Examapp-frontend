import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { toast } from "react-toastify";
import {
  FiAlertTriangle,
  FiCamera,
  FiCheck,
  FiCheckCircle,
  FiClock,
  FiEdit3,
  FiLock,
  FiSend,
  FiSun,
  FiUser,
  FiZap,
  FiMaximize,
  FiBarChart2,
  FiCloud,
} from "react-icons/fi";
import AccountLayout from "../../components/AccountLayout";
import Button from "../../components/ui/Button";
import Spinner from "../../components/Spinner";
import CameraCapture from "../../components/CameraCapture";
import useRedirectLoggedOutUser from "../../customHook/useRedirectLoggedOutUser";
import { formatDateTime } from "../../helper/datetime";
import {
  fetchMyPaper,
  saveMyPaperDraft,
  readMyPaper,
  readMyPaperAi,
  submitMyPaper,
  apiError,
} from "../../helper/paperApi";
import {
  AnswerEditor,
  ReadSummary,
  ReadingPanel,
  SourceTag,
  SheetCapture,
  SheetViewer,
  Stepper,
  TYPE_LABEL,
  answerLabel,
  blankAnswer,
  fromStored,
  isBlank,
  sameAnswer,
  useSheetPhotos,
} from "../../components/paper/PaperKit";

/*
 * Student self-upload of a paper exam answer sheet.
 *
 * 1. photograph the card (or pick photos), 2. the platform reads it (answers it
 * can't read are then checked by AI, announced first), 3. the student
 * checks every answer against their card and fixes misreads, 4. confirms and
 * submits. Submission is final: the page locks and the teacher sees the sheet,
 * with any answers changed from the AI read highlighted. The student never sees
 * the key or correctness here — the result follows the exam's reveal settings.
 * Work is autosaved, so a refresh never loses the photos or edits.
 */

const STEPS = [
  { id: "capture", label: "Vərəq" },
  { id: "reading", label: "Oxunuş" },
  { id: "review", label: "Yoxla" },
  { id: "done", label: "Təqdim" },
];

const TIPS = [
  { icon: FiMaximize, text: "Vərəqin hamısı kadrda olsun" },
  { icon: FiSun, text: "Yaxşı işıq, kölgəsiz, düz tut" },
  { icon: FiUser, text: "Ad və soyadın vərəqdə yazılsın" },
];

const StudentRow = ({ index, q, value, ai, touched, onChange }) => {
  const changed = !!ai && !sameAnswer(q, value, ai.answer);
  const flagged = !!ai && ai.confidence !== "high" && !touched && !changed;
  const blank = isBlank(q, value);
  return (
    <div
      className={`rounded-2xl border p-3 transition-colors sm:p-3.5 ${
        flagged ? "border-warning/50 bg-warning/[0.07]" : "border-line bg-surface"
      }`}
    >
      <div className="flex items-start gap-3">
        <span className="mt-1.5 w-7 shrink-0 text-center font-display text-base font-extrabold tabular-nums text-text">
          {index + 1}
        </span>
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex flex-wrap items-center gap-1.5">
            <span className="rounded-md bg-surface2 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-muted">
              {TYPE_LABEL[q.type] || q.type}
            </span>
            <SourceTag source={ai?.source} />
            {flagged && (
              <span className="inline-flex items-center gap-1 rounded-md bg-warning/15 px-1.5 py-0.5 text-[10px] font-bold text-warning">
                <FiAlertTriangle /> Dəqiq oxunmadı — vərəqinlə müqayisə et{ai.note ? ` · ${ai.note}` : ""}
              </span>
            )}
            {changed && (
              <span className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary">
                <FiEdit3 /> Dəyişdirdin · oxunmuşdu: {answerLabel(q, ai.answer)}
              </span>
            )}
            {blank && <span className="text-[10px] font-semibold text-muted">boş</span>}
          </div>
          <AnswerEditor q={q} value={value} onChange={onChange} />
        </div>
      </div>
    </div>
  );
};

const PaperUpload = () => {
  useRedirectLoggedOutUser("/login");
  const { examId } = useParams();

  const [data, setData] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [phase, setPhase] = useState("capture"); // capture | reading | review | done
  const [answers, setAnswers] = useState([]);
  const [ai, setAi] = useState(null);
  const [touched, setTouched] = useState(() => new Set());
  const [sheetInfo, setSheetInfo] = useState(null);
  const [nameCheck, setNameCheck] = useState(null); // match | mismatch | unknown
  const [readsLeft, setReadsLeft] = useState(0); // AI checks left
  const [platformReadsLeft, setPlatformReadsLeft] = useState(0);
  const [readStage, setReadStage] = useState({ stage: "platform", pending: [] });
  const [readInfo, setReadInfo] = useState(null); // how the sheet was read (ReadSummary)
  const [retryingAi, setRetryingAi] = useState(false);
  const [readStartedAt, setReadStartedAt] = useState(0);
  const [camOpen, setCamOpen] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [saveState, setSaveState] = useState("idle"); // idle | saving | saved | error
  const [dirty, setDirty] = useState(false);
  const [filter, setFilter] = useState("all"); // all | flagged
  const galleryRef = useRef(null);

  const markDirty = useCallback(() => setDirty(true), []);
  const sheet = useSheetPhotos({ onDirty: markDirty });
  const { photos, done: donePhotos, uploading, reset: resetPhotos } = sheet;
  const layout = useMemo(() => data?.layout || [], [data]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const d = await fetchMyPaper(examId);
        if (!alive) return;
        setData(d);
        setReadsLeft(d.readsLeft ?? 0);
        setPlatformReadsLeft(d.platformReadsLeft ?? 0);
        if (d.submitted) {
          setPhase("done");
        } else if (d.draft) {
          resetPhotos(d.draft.photos || []);
          if (Array.isArray(d.draft.answers)) {
            setAnswers(d.layout.map((q, i) => fromStored(q, d.draft.answers[i])));
            setAi(Array.isArray(d.draft.aiAnswers) ? d.draft.aiAnswers : null);
            setSheetInfo(d.draft.student || null);
            setNameCheck(d.nameCheck || null);
            if (d.draft.unresolved?.length) {
              setReadInfo({ platform: {}, aiUsed: [], pendingAi: d.draft.unresolved, aiError: "AI yoxlaması tamamlanmayıb." });
            }
            setPhase("review");
          }
        }
      } catch (e) {
        if (alive) setLoadError(apiError(e, "Məlumat yüklənmədi"));
      }
    })();
    return () => {
      alive = false;
    };
  }, [examId, resetPhotos]);

  // Autosave photos + answers (debounced) so a refresh never loses work.
  const photoKey = donePhotos.map((p) => p.url).join("|");
  const canEdit = !!data && !data.submitted && !!data.window?.open && phase !== "done";
  useEffect(() => {
    if (!dirty || !canEdit || phase === "reading") return undefined;
    setSaveState("saving");
    const t = setTimeout(async () => {
      try {
        await saveMyPaperDraft(examId, {
          photos: photoKey ? photoKey.split("|") : [],
          answers: phase === "review" ? answers.map((a) => ({ answer: a })) : undefined,
        });
        setSaveState("saved");
      } catch {
        setSaveState("error");
      }
    }, 900);
    return () => clearTimeout(t);
  }, [dirty, canEdit, phase, photoKey, answers, examId]);

  // Warn while pages are still uploading.
  useEffect(() => {
    if (!uploading) return undefined;
    const onLeave = (e) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onLeave);
    return () => window.removeEventListener("beforeunload", onLeave);
  }, [uploading]);

  // Machine-read rows → the "what was read" reference for each question.
  const machineOf = (list) =>
    layout.map((q, i) => ({
      answer: list?.[i]?.answer ?? blankAnswer(q),
      confidence: list?.[i]?.confidence || "low",
      note: list?.[i]?.note || "",
      source: list?.[i]?.source || null,
    }));

  // 1) the platform reads the sheet; 2) only if some answers couldn't be read,
  // the student is told and those answers are checked by AI.
  const runRead = async () => {
    if (!donePhotos.length) return toast.error("Əvvəlcə vərəqinin şəklini əlavə et");
    if (platformReadsLeft <= 0) return toast.info("Vərəqi oxutma limiti bitib — cavablarını əl ilə doldur.");
    setPhase("reading");
    setReadStage({ stage: "platform", pending: [] });
    setReadStartedAt(Date.now());
    let res;
    try {
      res = await readMyPaper(
        examId,
        donePhotos.map((p) => p.url)
      );
    } catch (e) {
      if (e?.response?.status === 429) setPlatformReadsLeft(0);
      toast.error(apiError(e, "Vərəq oxunmadı"));
      setPhase("capture");
      return;
    }
    let machine = machineOf(res.answers);
    let values = machine.map((m, i) => fromStored(layout[i], m.answer));
    let student = res.student || null;
    let check = res.nameCheck || null;
    let aiLeft = res.readsLeft ?? readsLeft;
    const pending = Array.isArray(res.unresolved) ? res.unresolved : [];
    const info = { platform: res.platform || {}, aiUsed: [], pendingAi: [], aiError: "" };
    setPlatformReadsLeft(res.platformReadsLeft ?? Math.max(0, platformReadsLeft - 1));
    if (pending.length) {
      if (aiLeft > 0) {
        setReadStage({ stage: "ai", pending });
        setReadStartedAt(Date.now());
        try {
          const extra = await readMyPaperAi(examId);
          machine = machineOf(extra.machine);
          values = layout.map((q, i) => fromStored(q, extra.answers?.[i]));
          student = extra.student || student;
          check = extra.nameCheck || check;
          aiLeft = extra.readsLeft ?? Math.max(0, aiLeft - 1);
          info.aiUsed = pending;
        } catch (e) {
          if (e?.response?.status === 429) aiLeft = 0;
          info.pendingAi = pending;
          info.aiError = apiError(e, "AI yoxlaması alınmadı.");
        }
      } else {
        info.pendingAi = pending;
        info.aiError = "AI yoxlama limiti bitib.";
      }
    }
    setAnswers(values);
    setAi(machine);
    setTouched(new Set());
    setSheetInfo(student);
    setNameCheck(check);
    setReadsLeft(aiLeft);
    setReadInfo(info);
    setFilter("all");
    setConfirmed(false);
    setDirty(true);
    setPhase("review");
  };

  // Retry the AI check from the review screen (keeps the student's own edits).
  const retryAi = async () => {
    setRetryingAi(true);
    try {
      await saveMyPaperDraft(examId, {
        photos: donePhotos.map((p) => p.url),
        answers: answers.map((a) => ({ answer: a })),
      });
      const extra = await readMyPaperAi(examId);
      setAnswers(layout.map((q, i) => fromStored(q, extra.answers?.[i])));
      setAi(machineOf(extra.machine));
      if (extra.student) setSheetInfo(extra.student);
      if (extra.nameCheck) setNameCheck(extra.nameCheck);
      setReadsLeft(extra.readsLeft ?? 0);
      setReadInfo((prev) => ({
        ...(prev || {}),
        aiUsed: [...(prev?.aiUsed || []), ...(extra.aiQuestions || [])],
        pendingAi: [],
        aiError: "",
      }));
      setConfirmed(false);
      setDirty(true);
    } catch (e) {
      if (e?.response?.status === 429) setReadsLeft(0);
      toast.error(apiError(e, "AI yoxlaması alınmadı"));
    } finally {
      setRetryingAi(false);
    }
  };

  const manualEntry = () => {
    setAnswers(layout.map(blankAnswer));
    setReadInfo(null);
    setAi(null);
    setTouched(new Set());
    setSheetInfo(null);
    setNameCheck(null);
    setConfirmed(false);
    setDirty(true);
    setPhase("review");
  };

  const setAnswer = (i, value) => {
    setAnswers((prev) => prev.map((a, idx) => (idx === i ? value : a)));
    setTouched((prev) => {
      if (prev.has(i)) return prev;
      const next = new Set(prev);
      next.add(i);
      return next;
    });
    setConfirmed(false); // any change → confirm again
    setDirty(true);
  };

  const submit = async () => {
    if (!confirmed) return toast.info("Əvvəlcə cavablarını yoxladığını təsdiqlə");
    if (uploading) return toast.info("Şəkillər hələ yüklənir…");
    if (!donePhotos.length) return toast.error("Cavab vərəqinin şəklini yüklə");
    setSubmitting(true);
    try {
      await submitMyPaper(examId, {
        answers: answers.map((a) => ({ answer: a })),
        photos: donePhotos.map((p) => p.url),
        confirmed: true,
      });
      setDirty(false);
      setData((d) => ({ ...d, submitted: { at: new Date().toISOString(), byTeacher: false } }));
      setPhase("done");
      toast.success("Cavab vərəqin təqdim edildi");
    } catch (e) {
      toast.error(apiError(e, "Təqdim edilmədi"));
      if (e?.response?.status === 409) {
        setData((d) => ({ ...d, submitted: d.submitted || { at: new Date().toISOString(), byTeacher: false } }));
        setPhase("done");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const stats = useMemo(() => {
    let answered = 0;
    let flagged = 0;
    let changed = 0;
    layout.forEach((q, i) => {
      if (!isBlank(q, answers[i])) answered += 1;
      const a = ai?.[i];
      if (!a) return;
      const diff = !sameAnswer(q, answers[i], a.answer);
      if (diff) changed += 1;
      else if (a.confidence !== "high" && !touched.has(i)) flagged += 1;
    });
    return { answered, flagged, changed };
  }, [layout, answers, ai, touched]);

  const title = "Cavab vərəqini yüklə";
  const subtitle = data ? `${data.exam.name}${data.exam.className ? ` · ${data.exam.className}` : ""}` : "";

  if (!data) {
    return (
      <AccountLayout title={title}>
        {loadError ? (
          <div className="mx-auto max-w-lg rounded-3xl border border-line bg-surface p-8 text-center shadow-soft">
            <FiAlertTriangle className="mx-auto mb-3 text-3xl text-danger" />
            <p className="font-display text-lg font-bold text-text">{loadError}</p>
            <Button className="mt-5" to="/myExams">
              İmtahanlarım
            </Button>
          </div>
        ) : (
          <div className="flex justify-center py-24">
            <Spinner size={36} className="text-primary" />
          </div>
        )}
      </AccountLayout>
    );
  }

  // Submitted — locked.
  if (phase === "done" || data.submitted) {
    return (
      <AccountLayout title={title} subtitle={subtitle}>
        <div className="mx-auto max-w-xl rounded-3xl border border-line bg-surface p-8 text-center shadow-soft sm:p-10">
          <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-success/15 text-success">
            <FiCheckCircle className="text-3xl" />
          </span>
          <h2 className="mt-5 font-display text-2xl font-extrabold text-text">
            {data.submitted?.byTeacher ? "Vərəqin müəllim tərəfindən yoxlanılıb" : "Cavab vərəqin təqdim edildi"}
          </h2>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted">
            {data.submitted?.at ? `${formatDateTime(data.submitted.at)} · ` : ""}
            Cavabların artıq dəyişdirilə bilməz. Balın və düzgün cavablar müəllimin seçdiyi vaxtda nəticə səhifəsində
            görünəcək.
          </p>
          <div className="mx-auto mt-5 inline-flex items-center gap-2 rounded-full bg-surface2 px-3 py-1.5 text-xs font-semibold text-muted">
            <FiLock /> Kilidlənib
          </div>
          <div className="mt-6 flex flex-col justify-center gap-2.5 sm:flex-row">
            <Button to={`/exam/${examId}/result`} size="lg">
              <FiBarChart2 /> Nəticəmə bax
            </Button>
            <Button to="/myExams" variant="secondary" size="lg">
              İmtahanlarım
            </Button>
          </div>
        </div>
      </AccountLayout>
    );
  }

  // Closed (disabled / not started / ended) or no key yet.
  if (!data.window?.open || !layout.length) {
    const notStarted = data.window?.reason === "not_started";
    return (
      <AccountLayout title={title} subtitle={subtitle}>
        <div className="mx-auto max-w-lg rounded-3xl border border-line bg-surface p-8 text-center shadow-soft">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-surface2 text-muted">
            {notStarted ? <FiClock className="text-2xl" /> : <FiLock className="text-2xl" />}
          </span>
          <p className="mt-4 font-display text-lg font-bold text-text">
            {!data.window?.open ? data.window?.message : "Müəllim hələ cavab açarını hazırlamayıb"}
          </p>
          <p className="mx-auto mt-1.5 max-w-sm text-sm text-muted">
            {notStarted && data.exam.startDate
              ? `Yükləmə ${formatDateTime(data.exam.startDate)} tarixində açılacaq.`
              : !layout.length
                ? "Bir az sonra yenidən yoxla."
                : "Sualın varsa müəlliminlə əlaqə saxla."}
          </p>
          <Button className="mt-6" to={`/exam/details/${examId}`} variant="secondary">
            İmtahana qayıt
          </Button>
        </div>
      </AccountLayout>
    );
  }

  const visibleRows = layout
    .map((question, i) => ({ question, i }))
    .filter(({ question, i }) => {
      if (filter !== "flagged") return true;
      const a = ai?.[i];
      return !!a && a.confidence !== "high" && !touched.has(i) && sameAnswer(question, answers[i], a.answer);
    });

  return (
    <AccountLayout title={title} subtitle={subtitle}>
      <div className="mx-auto max-w-6xl">
        <div className="rounded-3xl border border-line bg-surface shadow-soft">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3 sm:px-5">
            <Stepper steps={STEPS} current={phase} />
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted">
              {saveState === "saving" ? (
                <>
                  <Spinner size={12} /> Saxlanılır…
                </>
              ) : saveState === "saved" ? (
                <>
                  <FiCloud className="text-success" /> Yadda saxlanıldı
                </>
              ) : saveState === "error" ? (
                <>
                  <FiAlertTriangle className="text-danger" /> Saxlanılmadı
                </>
              ) : data.exam.endDate ? (
                <>
                  <FiClock /> Son tarix: {formatDateTime(data.exam.endDate)}
                </>
              ) : null}
            </span>
          </div>

          <div className="p-4 sm:p-6">
            {phase === "capture" && (
              <>
                {photos.length === 0 && (
                  <ul className="mb-5 grid gap-2 sm:grid-cols-3">
                    {TIPS.map(({ icon: Icon, text }) => (
                      <li key={text} className="flex items-center gap-2.5 rounded-2xl bg-surface2/60 px-3.5 py-3 text-sm text-text">
                        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-primary/12 text-primary">
                          <Icon />
                        </span>
                        {text}
                      </li>
                    ))}
                  </ul>
                )}
                <SheetCapture
                  photos={photos}
                  onCamera={() => setCamOpen(true)}
                  onGallery={() => galleryRef.current?.click()}
                  onRemove={sheet.remove}
                  onRetry={sheet.retry}
                  onDropFiles={(files) => files.forEach(sheet.add)}
                  title="Cavab vərəqinin şəklini çək"
                  hint="İmtahanı yazdığın vərəqi çək. Platforma cavablarını oxuyacaq, sonra hər birini vərəqinlə müqayisə edib təqdim edəcəksən."
                  note={`Oxutma: ${platformReadsLeft} dəfə qalıb`}
                >
                  <div className="mt-6 flex flex-col-reverse items-stretch justify-between gap-3 border-t border-line pt-5 sm:flex-row sm:items-center">
                    <p className="text-xs text-muted">
                      Platforma oxuyur; oxuya bilmədiyini AI yoxlayır · AI: {readsLeft} dəfə qalıb
                    </p>
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <Button variant="secondary" onClick={manualEntry} disabled={uploading}>
                        <FiEdit3 /> Əl ilə doldur
                      </Button>
                      <Button size="lg" onClick={runRead} disabled={uploading || !donePhotos.length || platformReadsLeft <= 0}>
                        {uploading ? (
                          <>
                            <Spinner size={16} /> Yüklənir…
                          </>
                        ) : (
                          <>
                            <FiZap /> Vərəqi oxu
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </SheetCapture>
              </>
            )}

            {phase === "reading" && (
              <ReadingPanel
                startedAt={readStartedAt}
                photos={donePhotos}
                stage={readStage.stage}
                pending={readStage.pending}
              />
            )}

            {phase === "review" && (
              <div className="space-y-5">
                <div className="rounded-2xl bg-primary/[0.07] p-4 sm:p-5">
                  <p className="font-display text-lg font-bold text-text">Cavablarını yoxla</p>
                  <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted">
                    Hər sualda seçilən cavabın <b className="text-text">vərəqindəki ilə eyni</b> olduğunu yoxla. Səhv
                    oxunubsa, düzəlt. Təqdim etdikdən sonra dəyişmək mümkün olmayacaq; müəllimin şəkli və dəyişdirdiyin
                    cavabları görəcək.
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
                    <span className="rounded-full bg-surface px-2.5 py-1 text-text">
                      Cavablandırılıb: {stats.answered} / {layout.length}
                    </span>
                    {ai && (
                      <button
                        type="button"
                        onClick={() => setFilter(filter === "flagged" ? "all" : "flagged")}
                        className={`rounded-full px-2.5 py-1 transition-colors ${
                          filter === "flagged" ? "bg-warning text-white" : "bg-warning/15 text-warning hover:bg-warning/25"
                        }`}
                      >
                        Yoxlanmalı: {stats.flagged}
                      </button>
                    )}
                    {stats.changed > 0 && (
                      <span className="rounded-full bg-primary/12 px-2.5 py-1 text-primary">Dəyişdirdin: {stats.changed}</span>
                    )}
                  </div>
                </div>

                <ReadSummary
                  info={readInfo}
                  total={layout.length}
                  onRetryAi={readInfo?.pendingAi?.length && readsLeft > 0 ? retryAi : undefined}
                  retrying={retryingAi}
                />

                {nameCheck === "mismatch" && (
                  <div className="flex items-start gap-3 rounded-2xl border border-warning/40 bg-warning/[0.08] p-4 text-sm">
                    <FiAlertTriangle className="mt-0.5 shrink-0 text-warning" />
                    <p className="text-text">
                      Vərəqdə başqa ad oxundu:{" "}
                      <b>{[sheetInfo?.firstName, sheetInfo?.lastName].filter(Boolean).join(" ")}</b>. Öz vərəqini
                      yüklədiyinə əmin ol.
                    </p>
                  </div>
                )}
                {nameCheck === "match" && (
                  <p className="flex items-center gap-2 text-sm text-success">
                    <FiCheck /> Vərəqdəki ad hesabınla uyğundur
                    {sheetInfo?.firstName ? `: ${[sheetInfo.firstName, sheetInfo.lastName].filter(Boolean).join(" ")}` : ""}
                  </p>
                )}
                {nameCheck === "unknown" && (
                  <p className="flex items-center gap-2 text-sm text-muted">
                    <FiUser /> Vərəqdə ad oxunmadı — növbəti dəfə ad və soyadını yazmağı unutma.
                  </p>
                )}

                <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)]">
                  <div className="order-2 space-y-2.5 lg:order-1">
                    {visibleRows.map(({ question, i }) => (
                      <StudentRow
                        key={i}
                        index={i}
                        q={question}
                        value={answers[i]}
                        ai={ai?.[i]}
                        touched={touched.has(i)}
                        onChange={(v) => setAnswer(i, v)}
                      />
                    ))}
                    {!visibleRows.length && (
                      <div className="rounded-2xl border border-dashed border-line p-8 text-center text-sm text-muted">
                        Yoxlanmalı sual qalmayıb ✓
                      </div>
                    )}
                  </div>
                  {photos.length > 0 && (
                    <div className="order-1 lg:sticky lg:top-20 lg:order-2 lg:self-start">
                      <SheetViewer photos={photos} />
                    </div>
                  )}
                </div>

                <div className="sticky bottom-0 z-10 -mx-4 -mb-4 rounded-b-3xl border-t border-line bg-surface/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:-mb-6 sm:px-6">
                  <label className="flex cursor-pointer items-start gap-3 rounded-xl p-1">
                    <input
                      type="checkbox"
                      checked={confirmed}
                      onChange={(e) => setConfirmed(e.target.checked)}
                      className="mt-0.5 h-5 w-5 shrink-0 accent-[rgb(var(--primary))]"
                    />
                    <span className="text-sm text-text">
                      Bütün cavablarımı vərəqimlə müqayisə etdim və onlar <b>vərəqdəki kimidir</b>. Təqdim etdikdən sonra
                      dəyişə bilməyəcəyimi başa düşürəm.
                    </span>
                  </label>
                  <div className="mt-3 flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setPhase("capture")}
                        className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold text-muted transition-colors hover:bg-surface2 hover:text-text"
                      >
                        <FiCamera /> Şəkilləri dəyiş
                      </button>
                    </div>
                    <Button size="lg" onClick={submit} disabled={!confirmed || submitting || uploading}>
                      {submitting ? <Spinner size={16} /> : <FiSend />} Təqdim et
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <input
        ref={galleryRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          const files = Array.from(e.target.files || []).filter((f) => !f.type || f.type.startsWith("image/"));
          e.target.value = "";
          files.forEach(sheet.add);
        }}
      />

      {camOpen && (
        <CameraCapture
          title="Cavab vərəqini çək"
          multi
          count={photos.length}
          onUse={sheet.add}
          onClose={() => setCamOpen(false)}
        />
      )}
    </AccountLayout>
  );
};

export default PaperUpload;
