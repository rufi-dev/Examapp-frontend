import { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { FiX, FiUserX, FiUserPlus, FiSearch, FiPlus } from "react-icons/fi";
import CenterLoader from "./ui/CenterLoader";

const API = `${import.meta.env.VITE_BACKEND_URL}/api/quiz`;

// The approved students of a class, with add (searchable picker) + remove.
// Two render modes:
//   - modal (default): floating dialog, used by the class cards.
//   - embedded: an inline card, used inside the class edit page.
// `onChange` lets the parent refresh its member counts after an add/remove.
const ClassRoster = ({ classObj, label, onClose, onChange, embedded = false }) => {
  const clsId = classObj?._id;
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [picker, setPicker] = useState(false);
  const [assignable, setAssignable] = useState([]);
  const [pickSearch, setPickSearch] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/class/${clsId}/students`);
      setStudents(res.data || []);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Yüklənmədi");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    if (clsId) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clsId]);

  const remove = async (enrollmentId) => {
    try {
      await axios.patch(`${API}/enrollment/${enrollmentId}`, { action: "remove" });
      toast.success("Sinifdən çıxarıldı");
      load();
      onChange?.();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Alınmadı");
    }
  };

  const openPicker = async () => {
    try {
      const res = await axios.get(`${API}/class/${clsId}/assignable`);
      setAssignable(res.data || []);
      setPickSearch("");
      setPicker(true);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Yüklənmədi");
    }
  };
  const add = async (studentId) => {
    try {
      await axios.post(`${API}/class/${clsId}/addStudent`, { studentId });
      toast.success("Tələbə əlavə edildi");
      setAssignable((p) => p.filter((s) => s._id !== studentId));
      load();
      onChange?.();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Alınmadı");
    }
  };

  const q = pickSearch.trim().toLowerCase();
  const filtered = q
    ? assignable.filter(
        (s) =>
          (s.name || "").toLowerCase().includes(q) || (s.email || "").toLowerCase().includes(q)
      )
    : assignable;

  // Shared header + student list (same in both modes).
  const header = (
    <div className="mb-3 flex items-center justify-between gap-2">
      <div className="min-w-0">
        <h2 className="truncate font-display text-lg font-bold text-text">
          {label || "Tələbələr"}
        </h2>
        <p className="text-xs text-muted">{students.length} tələbə</p>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={openPicker}
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-primary-fg transition-colors hover:bg-primary-hover"
        >
          <FiUserPlus /> Tələbə əlavə et
        </button>
        {!embedded && (
          <button
            type="button"
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-lg text-muted transition-colors hover:bg-surface2 hover:text-text"
            aria-label="Bağla"
          >
            <FiX />
          </button>
        )}
      </div>
    </div>
  );

  const list = (
    <div
      className={`scrollbar-thin -mr-2 overflow-y-auto pr-2 ${
        embedded ? "max-h-80" : "min-h-0 flex-1"
      }`}
    >
      {loading ? (
        <CenterLoader className="py-10" />
      ) : students.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted">
          Bu sinifə hələ tələbə qoşulmayıb.
        </p>
      ) : (
        students.map((r) => {
          const s = r.student || {};
          return (
            <div
              key={r._id}
              className="flex items-center justify-between gap-2 border-b border-line/60 py-2.5 last:border-0"
            >
              <div className="min-w-0">
                <p className="truncate font-medium text-text">{s.name}</p>
                <p className="truncate text-xs text-muted">{s.email}</p>
              </div>
              <button
                type="button"
                onClick={() => remove(r._id)}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-sm font-semibold text-muted transition-colors hover:border-danger hover:text-danger"
              >
                <FiUserX /> Çıxar
              </button>
            </div>
          );
        })
      )}
    </div>
  );

  // The add-student picker is a modal in BOTH modes (secondary action).
  const pickerModal = picker && (
    <div className="fixed inset-0 z-[1600] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => setPicker(false)}
      />
      <div className="relative flex max-h-[80vh] w-full max-w-md flex-col rounded-3xl border border-line bg-surface p-6 shadow-lift">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="font-display text-lg font-bold text-text">Tələbə əlavə et</h2>
          <button
            type="button"
            onClick={() => setPicker(false)}
            className="grid h-8 w-8 place-items-center rounded-lg text-muted transition-colors hover:bg-surface2 hover:text-text"
            aria-label="Bağla"
          >
            <FiX />
          </button>
        </div>
        <div className="relative mb-3">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            autoFocus
            value={pickSearch}
            onChange={(e) => setPickSearch(e.target.value)}
            placeholder="Ad və ya email axtar..."
            className="w-full rounded-xl border border-line bg-surface py-2 pl-9 pr-3 text-sm text-text outline-none transition focus:border-primary"
          />
        </div>
        <div className="scrollbar-thin -mr-2 min-h-0 flex-1 overflow-y-auto pr-2">
          {filtered.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted">Əlavə ediləcək tələbə yoxdur.</p>
          ) : (
            filtered.map((s) => (
              <div
                key={s._id}
                className="flex items-center justify-between gap-2 border-b border-line/60 py-2.5 last:border-0"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-text">{s.name}</p>
                  <p className="truncate text-xs text-muted">{s.email}</p>
                </div>
                <button
                  type="button"
                  onClick={() => add(s._id)}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-primary/40 bg-primary/5 px-3 py-1.5 text-sm font-semibold text-primary transition-colors hover:bg-primary/10"
                >
                  <FiPlus /> Əlavə et
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );

  // Embedded: render inline as a plain card (no overlay).
  if (embedded) {
    return (
      <>
        <div className="rounded-3xl border border-line bg-surface p-6 shadow-soft sm:p-8">
          {header}
          {list}
        </div>
        {pickerModal}
      </>
    );
  }

  // Default: floating modal.
  return (
    <>
      <div className="fixed inset-0 z-[1500] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
        <div className="relative flex max-h-[80vh] w-full max-w-md flex-col rounded-3xl border border-line bg-surface p-6 shadow-lift">
          {header}
          {list}
        </div>
      </div>
      {pickerModal}
    </>
  );
};

export default ClassRoster;
