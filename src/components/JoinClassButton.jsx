import { useState } from "react";
import axios from "axios";
import { useDispatch } from "react-redux";
import { toast } from "react-toastify";
import { FiLogIn, FiX } from "react-icons/fi";
import { getTags } from "../../redux/features/quiz/quizSlice";
import Button from "./ui/Button";
import Spinner from "./Spinner";

// Student entry point: enter a class join code (shared by the teacher) to join.
// Auto-approve classes enroll instantly; otherwise it sends a pending request.
const JoinClassButton = ({ onJoined }) => {
  const dispatch = useDispatch();
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    const c = code.trim().toUpperCase();
    if (!c) return;
    setBusy(true);
    try {
      const res = await axios.post(`${import.meta.env.VITE_BACKEND_URL}/api/quiz/enroll`, {
        code: c,
      });
      toast.success(res.data?.message || "Göndərildi");
      setOpen(false);
      setCode("");
      if (res.data?.status === "approved") {
        dispatch(getTags());
        onJoined?.();
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || "Qoşulmaq alınmadı");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Button type="button" variant="secondary" size="sm" onClick={() => setOpen(true)}>
        <FiLogIn /> Sinifə qoşul
      </Button>

      {open && (
        <div className="fixed inset-0 z-[1500] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => !busy && setOpen(false)}
          />
          <form
            onSubmit={submit}
            className="relative w-full max-w-sm animate-scale-in rounded-3xl border border-line bg-surface p-6 shadow-lift sm:p-7"
          >
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-lg text-muted transition-colors hover:bg-surface2 hover:text-text"
              aria-label="Bağla"
            >
              <FiX />
            </button>
            <div className="mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-primary/12 text-primary">
              <FiLogIn className="text-[22px]" />
            </div>
            <h2 className="font-display text-xl font-bold text-text">Sinifə qoşul</h2>
            <p className="mt-1.5 text-sm text-muted">
              Müəlliminizin verdiyi sinif kodunu daxil edin.
            </p>
            <input
              autoFocus
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="Sinif kodu (məs. 7K3Q9F)"
              className="mt-5 h-12 w-full rounded-xl border border-line bg-surface px-3.5 text-center text-lg font-bold uppercase tracking-[0.3em] text-text outline-none transition focus:border-primary focus:ring-4 focus:ring-ring/25"
            />
            <Button type="submit" disabled={busy || !code.trim()} className="mt-5 w-full">
              {busy ? <Spinner /> : "Qoşul"}
            </Button>
          </form>
        </div>
      )}
    </>
  );
};

export default JoinClassButton;
