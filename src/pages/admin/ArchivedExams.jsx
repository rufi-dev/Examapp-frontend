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

  const restore = async (id) => {
    setBusy(id);
    try {
      await axios.patch(`${API}/exam/${id}/restore`);
      setExams((prev) => prev.filter((e) => e._id !== id));
      toast.success("İmtahan geri qaytarıldı");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Alınmadı");
    } finally {
      setBusy("");
    }
  };

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
                    {e.class?.name ? `${e.class.name} · ` : ""}
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
    </AccountLayout>
  );
};

export default ArchivedExams;
