import { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { FiTrash2, FiRotateCcw, FiInbox } from "react-icons/fi";
import useRedirectLoggedOutUser from "../../customHook/useRedirectLoggedOutUser";
import AccountLayout from "../../components/AccountLayout";
import Button from "../../components/ui/Button";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import Spinner from "../../components/Spinner";

const API = `${import.meta.env.VITE_BACKEND_URL}/api/quiz`;

// Days left until an archived exam is permanently purged.
const daysLeft = (purgeAt) => {
  if (!purgeAt) return null;
  const d = Math.ceil((new Date(purgeAt).getTime() - Date.now()) / (24 * 60 * 60 * 1000));
  return Math.max(0, d);
};

const ArchivedExams = () => {
  useRedirectLoggedOutUser("/login");
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(""); // id being acted on
  const [confirmExam, setConfirmExam] = useState(null); // delete-forever target
  const [error, setError] = useState(false); // load failed (≠ "empty")
  const [reassignId, setReassignId] = useState(null); // exam whose class was deleted
  const [classes, setClasses] = useState([]);
  const [classesLoading, setClassesLoading] = useState(false);

  const load = async () => {
    setError(false);
    try {
      const { data } = await axios.get(`${API}/archivedExams`);
      setExams(Array.isArray(data) ? data : []);
    } catch {
      // A network/auth/server failure must NOT masquerade as "Trash is empty".
      setError(true);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
  }, []);

  // Restore the exam. If its class was deleted the server replies 409
  // { needsClass:true }; we then load the teacher's classes and ask which one to
  // restore into (a class-less exam would be invisible everywhere).
  const doRestore = async (id, classId) => {
    setBusy(id);
    try {
      await axios.patch(`${API}/exam/${id}/restore`, classId ? { classId } : {});
      setExams((prev) => prev.filter((e) => e._id !== id));
      setReassignId(null);
      toast.success("İmtahan geri qaytarıldı");
    } catch (err) {
      if (err?.response?.status === 409 && err?.response?.data?.needsClass) {
        setReassignId(id);
        setClassesLoading(true);
        try {
          const { data } = await axios.get(`${API}/teacher/classes`);
          setClasses(Array.isArray(data) ? data : []);
        } catch {
          setClasses([]);
        } finally {
          setClassesLoading(false);
        }
      } else {
        toast.error(err?.response?.data?.message || "Alınmadı");
      }
    } finally {
      setBusy("");
    }
  };
  const restore = (id) => doRestore(id, null);

  const deleteForever = async () => {
    const id = confirmExam?._id;
    if (!id) return;
    setBusy(id);
    try {
      await axios.delete(`${API}/exam/${id}/forever`);
      setExams((prev) => prev.filter((e) => e._id !== id));
      setConfirmExam(null);
      toast.success("Həmişəlik silindi");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Silinmədi");
    } finally {
      setBusy("");
    }
  };

  return (
    <AccountLayout
      title="Zibil qutusu"
      subtitle="Silinən imtahanlar 30 gün burada saxlanılır — geri qaytar və ya həmişəlik sil."
    >
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, k) => (
            <div key={k} className="h-20 animate-pulse rounded-2xl border border-line bg-surface" />
          ))}
        </div>
      ) : error ? (
        <div className="mx-auto mt-10 max-w-md rounded-3xl border border-dashed border-danger/40 bg-surface p-10 text-center">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-danger/12 text-danger">
            <FiInbox className="text-2xl" />
          </span>
          <h3 className="mt-4 font-display text-lg font-bold text-text">Yüklənmədi</h3>
          <p className="mt-1.5 text-sm text-muted">
            Zibil qutusu yüklənərkən xəta baş verdi. İnternet bağlantınızı yoxlayın.
          </p>
          <Button
            type="button"
            className="mt-5"
            onClick={() => {
              setLoading(true);
              load();
            }}
          >
            Yenidən cəhd et
          </Button>
        </div>
      ) : exams.length === 0 ? (
        <div className="mx-auto mt-10 max-w-md rounded-3xl border border-dashed border-line bg-surface p-10 text-center">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-primary/12 text-primary">
            <FiInbox className="text-2xl" />
          </span>
          <h3 className="mt-4 font-display text-lg font-bold text-text">Zibil qutusu boşdur</h3>
          <p className="mt-1.5 text-sm text-muted">Silinən imtahanlar burada görünəcək.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {exams.map((e) => {
            const left = daysLeft(e.purgeAt);
            return (
              <div
                key={e._id}
                className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-4 shadow-soft sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <h3 className="truncate font-semibold text-text">{e.name}</h3>
                  <p className="mt-1 text-xs text-muted">
                    {e.class?.name ? `${e.class.name} · ` : "Sinif silinib · "}
                    {left === 0
                      ? "Bu gün həmişəlik silinəcək"
                      : `${left} gün sonra həmişəlik silinəcək`}
                    {e.deletedByName ? ` · ${e.deletedByName} silib` : ""}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled={busy === e._id}
                    onClick={() => restore(e._id)}
                  >
                    {busy === e._id ? <Spinner /> : <><FiRotateCcw /> Geri qaytar</>}
                  </Button>
                  <button
                    type="button"
                    onClick={() => setConfirmExam(e)}
                    disabled={busy === e._id}
                    className="grid h-9 w-9 place-items-center rounded-lg text-muted transition-colors hover:bg-danger/10 hover:text-danger disabled:opacity-50"
                    aria-label="Həmişəlik sil"
                    title="Həmişəlik sil"
                  >
                    <FiTrash2 />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        open={!!confirmExam}
        onClose={() => setConfirmExam(null)}
        onConfirm={deleteForever}
        title="Həmişəlik silinsin?"
        confirmLabel="Bəli, həmişəlik sil"
        cancelLabel="Geri"
        tone="danger"
        loading={!!busy}
      >
        <p>
          <span className="font-semibold text-text">{confirmExam?.name}</span> imtahanı, sualları,
          PDF-i və bütün nəticələri <span className="font-semibold text-text">həmişəlik</span>{" "}
          silinəcək. Bu əməliyyat geri qaytarıla bilməz.
        </p>
      </ConfirmDialog>

      {/* Class picker — shown when the exam's original class was deleted, so the
          teacher chooses which class to restore it into. */}
      {reassignId && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => !busy && setReassignId(null)}
          />
          <div className="relative w-full max-w-md rounded-3xl border border-line bg-surface p-6 shadow-lift">
            <h2 className="font-display text-lg font-bold text-text">Hansı sinfə qaytarılsın?</h2>
            <p className="mt-1.5 text-sm text-muted">
              Bu imtahanın əvvəlki sinfi silinib. Qaytarmaq üçün bir sinif seçin.
            </p>
            <div className="mt-4 max-h-72 space-y-2 overflow-y-auto">
              {classesLoading ? (
                <div className="flex justify-center py-6">
                  <Spinner />
                </div>
              ) : classes.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted">
                  Sinif tapılmadı. Əvvəlcə bir sinif yaradın, sonra geri qaytarın.
                </p>
              ) : (
                classes.map((c) => (
                  <button
                    key={c._id}
                    type="button"
                    disabled={!!busy}
                    onClick={() => doRestore(reassignId, c._id)}
                    className="flex w-full items-center justify-between gap-3 rounded-xl border border-line bg-surface px-4 py-3 text-left text-sm font-medium text-text transition hover:border-primary/50 hover:bg-primary/5 disabled:opacity-50"
                  >
                    <span className="truncate">
                      {c.name}
                      {c.level ? ` · ${c.level}` : ""}
                    </span>
                    <FiRotateCcw className="shrink-0 text-muted" />
                  </button>
                ))
              )}
            </div>
            <button
              type="button"
              onClick={() => setReassignId(null)}
              className="mt-4 w-full rounded-xl border border-line py-2.5 text-sm font-semibold text-muted transition-colors hover:text-text"
            >
              Ləğv et
            </button>
          </div>
        </div>
      )}
    </AccountLayout>
  );
};

export default ArchivedExams;
