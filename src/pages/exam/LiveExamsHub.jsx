import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { FiRadio, FiUsers, FiEdit3, FiLoader, FiArrowRight } from "react-icons/fi";
import AccountLayout from "../../components/AccountLayout";

const API = `${import.meta.env.VITE_BACKEND_URL}/api/quiz/live-exams`;

// "Canlı imtahan" overview — one card per exam that CURRENTLY has students taking it.
// Polled so an exam appears the moment a student starts and drops off when everyone
// finishes/leaves. A card opens that exam's full live monitor (/exam/:id/live).
export default function LiveExamsHub() {
  const [exams, setExams] = useState(null);
  const pollRef = useRef(null);

  useEffect(() => {
    let alive = true;
    const load = () =>
      axios
        .get(API)
        .then(({ data }) => alive && setExams(Array.isArray(data?.exams) ? data.exams : []))
        .catch(() => alive && setExams([]));
    load();
    pollRef.current = setInterval(load, 5000);
    return () => {
      alive = false;
      clearInterval(pollRef.current);
    };
  }, []);

  return (
    <AccountLayout
      title="Canlı imtahanlar"
      subtitle="Hazırda şagirdlərin verdiyi imtahanlar — birini aç və canlı izlə."
    >
      {exams === null ? (
        <div className="grid min-h-[40vh] place-items-center text-muted">
          <FiLoader className="animate-spin text-2xl" aria-hidden="true" />
        </div>
      ) : exams.length === 0 ? (
        <div className="grid min-h-[45vh] place-items-center text-center">
          <div className="max-w-sm">
            <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-primary/10 text-primary">
              <FiRadio className="text-3xl" aria-hidden="true" />
            </span>
            <h3 className="mt-4 font-bold text-text">Hazırda canlı imtahan yoxdur</h3>
            <p className="mt-1 text-sm text-muted">
              Bir şagird imtahana başlayanda o imtahan avtomatik burada görünəcək.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {exams.map((e) => (
            <Link
              key={e.examId}
              to={`/exam/${e.examId}/live`}
              className="group flex flex-col gap-3 rounded-2xl border border-success/40 bg-surface p-5 shadow-soft transition-all duration-200 ease-out-quint hover:-translate-y-1 hover:border-primary/50 hover:shadow-lift"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-success/12 px-2.5 py-1 text-xs font-bold text-success">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success/60" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
                  </span>
                  Canlı
                </span>
                {e.className && <span className="truncate text-xs font-medium text-muted">{e.className}</span>}
              </div>

              <h3 className="line-clamp-2 font-display text-base font-bold text-text">{e.name}</h3>

              <div className="mt-auto flex items-center gap-4 text-sm">
                <span className="inline-flex items-center gap-1.5 font-semibold text-text">
                  <FiEdit3 className="text-primary" /> {e.writingCount} yazır
                </span>
                <span className="inline-flex items-center gap-1.5 text-muted">
                  <FiUsers /> {e.activeCount} aktiv
                </span>
              </div>

              <span className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-fg transition-colors group-hover:bg-primary-hover">
                <FiRadio aria-hidden="true" /> Canlı izlə
                <FiArrowRight aria-hidden="true" className="transition-transform group-hover:translate-x-0.5" />
              </span>
            </Link>
          ))}
        </div>
      )}
    </AccountLayout>
  );
}
