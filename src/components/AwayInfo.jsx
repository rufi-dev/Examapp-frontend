import { useState } from "react";
import { toast } from "react-toastify";
import { FiEyeOff, FiRotateCcw } from "react-icons/fi";
import ConfirmDialog from "./ui/ConfirmDialog";
import { pardonResult } from "../../redux/features/quiz/quizService";

// Teacher-facing view of when / why / how long a student left the exam screen
// (attempt.awayLog, digested by the server). Short absences are forgiven — not
// violations — but listed here so the teacher can tell an accidental screen-off
// from a student who kept leaving.

const REASON = {
  hidden: "Ekran söndü və ya başqa tətbiq",
  blur: "Başqa pəncərə / fokus getdi",
  reload: "Səhifə yenidən açıldı",
  photo_timeout: "Həll şəkli çəkərkən uzun qaldı",
  back: "Qayıtdı",
};

export const fmtDur = (ms) => {
  const s = Math.max(0, Math.round((ms || 0) / 1000));
  if (s < 60) return `${s} san`;
  const m = Math.floor(s / 60);
  const r = s % 60;
  return r ? `${m} dəq ${r} san` : `${m} dəq`;
};

const fmtTime = (d) => {
  try {
    return new Date(d).toLocaleTimeString("az-AZ", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  } catch {
    return "";
  }
};

// A chip ("4 çıxış · 2 bağışlandı") that opens the list of absences. `floating`
// pops the list over the page; off, it opens in place (inside a clipping card).
export const AwayChip = ({ away, className = "", floating = true }) => {
  if (!away || (!away.count && !away.fsUnavailable)) return null;
  const log = Array.isArray(away.log) ? away.log : [];
  return (
    <details className={`group relative ${floating ? "" : "open:basis-full"} ${className}`}>
      <summary
        className="inline-flex cursor-pointer list-none items-center gap-1 rounded-lg bg-surface2 px-2 py-0.5 text-xs font-semibold text-muted transition-colors hover:text-text [&::-webkit-details-marker]:hidden"
        title="İmtahandan çıxışlar: nə vaxt, niyə, nə qədər"
      >
        <FiEyeOff />
        {away.count || 0} çıxış
        {away.forgiven ? <span className="font-normal">· {away.forgiven} bağışlandı</span> : null}
        {away.fsUnavailable ? <span className="font-normal">· tam ekransız</span> : null}
      </summary>
      <div
        className={`${
          floating ? "absolute right-0 z-30 w-72 max-w-[85vw] shadow-lift" : "w-full"
        } mt-1.5 rounded-xl border border-line bg-surface p-3 text-left text-xs font-normal`}
      >
        <p className="font-semibold text-text">
          {away.count || 0} dəfə çıxıb · cəmi {fmtDur(away.totalMs)}
        </p>
        <p className="mt-0.5 text-muted">
          30 saniyədən qısa çıxışlar (ekranın təsadüfən sönməsi, bildiriş) pozuntu sayılmır.
        </p>
        {away.fsUnavailable && (
          <p className="mt-1 text-warning">Cihaz tam ekranı saxlaya bilmədi — tam ekransız yazıb.</p>
        )}
        {log.length > 0 && (
          <ul className="mt-2 flex max-h-56 flex-col gap-1.5 overflow-auto">
            {log
              .slice()
              .reverse()
              .map((e, i) => (
                <li key={i} className="flex items-start justify-between gap-2 border-t border-line/60 pt-1.5">
                  <span className="min-w-0">
                    <span className="tabular-nums text-muted">{fmtTime(e.at)}</span>{" "}
                    <span className="text-text">{REASON[e.reason] || e.reason}</span>
                    {e.autoOff ? <span className="text-muted"> (ekran öz-özünə söndü)</span> : null}
                  </span>
                  <span
                    className={`shrink-0 text-right font-semibold tabular-nums ${
                      e.counted ? "text-danger" : "text-muted"
                    }`}
                  >
                    {e.reason === "back" ? `cəmi ${fmtDur(e.awayMs)}` : fmtDur(e.awayMs)}
                    {e.reason !== "back" && (
                      <span className="block text-[10px] font-medium">
                        {e.counted ? (e.stillAway ? "pozuntu (hələ çıxmışdı)" : "pozuntu") : "sayılmadı"}
                      </span>
                    )}
                  </span>
                </li>
              ))}
          </ul>
        )}
      </div>
    </details>
  );
};

// "Nəticəni bərpa et": cancel an anti-cheat termination — the student's saved
// answers are scored again and the result counts normally.
export const PardonButton = ({ resultId, name, onDone, className = "" }) => {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  if (!resultId) return null;
  const confirm = async () => {
    setBusy(true);
    try {
      const r = await pardonResult(resultId);
      toast.success(
        typeof r?.earnPoints === "number"
          ? `Nəticə bərpa edildi — ${Math.round(r.earnPoints * 100) / 100} bal`
          : "Nəticə bərpa edildi"
      );
      setOpen(false);
      onDone && onDone(r);
    } catch (e) {
      toast.error(e?.response?.data?.message || "Bərpa alınmadı");
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`inline-flex items-center justify-center gap-1.5 rounded-xl border border-line bg-surface px-3 py-2 text-sm font-semibold text-text transition-colors hover:bg-surface2 ${className}`}
        title="Pozuntuya görə dayandırmanı ləğv et və cavabları yenidən qiymətləndir"
      >
        <FiRotateCcw /> Nəticəni bərpa et
      </button>
      <ConfirmDialog
        open={open}
        onClose={() => !busy && setOpen(false)}
        onConfirm={confirm}
        loading={busy}
        title="Nəticə bərpa edilsin?"
        icon={<FiRotateCcw className="text-2xl" />}
        confirmLabel="Bərpa et"
      >
        {name ? <b className="text-text">{name}</b> : "Şagird"} pozuntuya görə dayandırılıb və 0 bal alıb.
        Bərpa etsəniz, imtahan dayandırılana qədər verdiyi cavablar yenidən yoxlanılır və nəticə
        adi nəticə kimi sayılır. Çıxışların siyahısına baxıb qərar verin.
      </ConfirmDialog>
    </>
  );
};
