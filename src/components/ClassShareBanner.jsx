import { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { FiLink2, FiCopy, FiUsers } from "react-icons/fi";

// Prominent "share this class" banner shown at the top of a class's exam page.
// Renders only for the owner/admin (getClass returns the join code to them only),
// so students/participants never see it. Also hidden for PUBLIC classes — an
// open class needs no code, so the invite only appears when access is code-only.
const ClassShareBanner = ({ classId }) => {
  const [code, setCode] = useState(null);
  const [requireCode, setRequireCode] = useState(null);

  useEffect(() => {
    let on = true;
    axios
      .get(`${import.meta.env.VITE_BACKEND_URL}/api/quiz/getClass/${classId}`)
      .then((r) => {
        if (on) {
          setCode(r.data?.joinCode || null);
          setRequireCode(r.data?.requireCode);
        }
      })
      .catch(() => {});
    return () => {
      on = false;
    };
  }, [classId]);

  // Public class (requireCode === false) → no code needed, hide the invite.
  if (!code || requireCode === false) return null;

  const link = `${window.location.origin}/join/${code}`;
  const copy = (text, msg) => {
    try {
      navigator.clipboard.writeText(text);
      toast.success(msg);
    } catch {
      toast.info(text);
    }
  };

  return (
    <div className="mb-6 flex flex-col gap-4 rounded-2xl border border-primary/30 bg-primary/5 p-4 shadow-soft sm:flex-row sm:items-center sm:justify-between sm:p-5">
      <div className="flex items-center gap-3">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-primary/15 text-primary">
          <FiUsers className="text-[22px]" />
        </span>
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">
            Şagirdləri sinfə dəvət et
          </p>
          <p className="font-display text-2xl font-bold tracking-[0.3em] text-text sm:text-3xl">
            {code}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => copy(link, "Qoşulma linki kopyalandı")}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-fg shadow-soft transition-colors hover:bg-primary-hover"
        >
          <FiLink2 /> Linki kopyala
        </button>
        <button
          type="button"
          onClick={() => copy(code, "Kod kopyalandı")}
          className="inline-flex items-center gap-2 rounded-xl border border-line bg-surface px-4 py-2.5 text-sm font-semibold text-text transition-colors hover:border-primary hover:text-primary"
        >
          <FiCopy /> Kodu kopyala
        </button>
      </div>
    </div>
  );
};

export default ClassShareBanner;
