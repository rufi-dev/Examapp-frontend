import { useEffect, useRef, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { FaWhatsapp } from "react-icons/fa";
import { FiCheckCircle, FiSettings, FiSend, FiX } from "react-icons/fi";
import Button from "./ui/Button";
import Spinner from "./Spinner";

const API = `${import.meta.env.VITE_BACKEND_URL}/api/whatsapp`;
const WA_GREEN = "#25D366";

// Teacher/admin-facing: link the WhatsApp number that the server uses to send
// "new exam" alerts to students. Scan the QR once (WhatsApp → Linked devices →
// Link a device). Uses the unofficial whatsapp-web.js session on the server.
const WhatsAppNotifications = () => {
  const [status, setStatus] = useState(null); // { enabled, ready, hasQr, qr }
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState("");
  const pollRef = useRef(null);

  const loadStatus = async (withQr) => {
    try {
      const { data } = await axios.get(`${API}/${withQr ? "qr" : "status"}`);
      setStatus(data);
      return data;
    } catch {
      setStatus({ enabled: false, ready: false });
      return null;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStatus(false);
    return () => pollRef.current && clearInterval(pollRef.current);
  }, []);

  // Poll the QR/status while the modal is open so it flips to "connected"
  // automatically once the phone scans the code.
  useEffect(() => {
    if (!open) {
      pollRef.current && clearInterval(pollRef.current);
      return;
    }
    loadStatus(true);
    pollRef.current = setInterval(() => loadStatus(true), 3000);
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => {
      pollRef.current && clearInterval(pollRef.current);
      window.removeEventListener("keydown", onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const onTest = async () => {
    setBusy("test");
    try {
      const { data } = await axios.post(`${API}/test`);
      if (data?.ok) toast.success(`Test mesajı göndərildi → ${data.phone}. WhatsApp-ı yoxlayın.`);
      else toast.error("Göndərilmədi. Nömrə / bağlantını yoxlayın.");
    } catch (e) {
      toast.error(e?.response?.data?.message || "Test mesajı göndərilmədi");
    } finally {
      setBusy("");
    }
  };

  const onUnlink = async () => {
    setBusy("unlink");
    try {
      await axios.post(`${API}/logout`);
      toast.info("WhatsApp ayrıldı.");
      await loadStatus(true);
    } catch {
      toast.error("Əməliyyat alınmadı");
    } finally {
      setBusy("");
    }
  };

  const ready = !!status?.ready;
  const enabled = status?.enabled !== false;

  const body = loading ? (
    <div className="grid place-items-center py-10">
      <Spinner size={24} className="text-primary" />
    </div>
  ) : !enabled ? (
    <p className="rounded-xl border border-dashed border-line p-4 text-sm text-muted">
      WhatsApp serverdə aktiv deyil. (WHATSAPP_WEB_ENABLED)
    </p>
  ) : ready ? (
    <div className="space-y-4">
      <div className="flex items-center gap-2 rounded-xl border border-success/30 bg-success/10 px-4 py-3 text-sm font-semibold text-success">
        <FiCheckCircle /> WhatsApp qoşuludur — yeni imtahanlar avtomatik göndəriləcək.
      </div>
      <div className="flex flex-wrap gap-2.5">
        <Button type="button" variant="soft" onClick={onTest} disabled={busy === "test"}>
          {busy === "test" ? <Spinner size={16} /> : <FiSend />} Test mesajı (özümə)
        </Button>
        <Button type="button" variant="secondary" onClick={onUnlink} disabled={busy === "unlink"}>
          {busy === "unlink" ? <Spinner size={16} /> : null} Nömrəni ayır
        </Button>
      </div>
    </div>
  ) : status?.qr ? (
    <div>
      <ol className="mb-4 space-y-1.5 text-sm text-muted">
        <li>1. Telefonunuzda WhatsApp-ı açın.</li>
        <li>
          2. <span className="font-semibold text-text">Parametrlər → Əlaqəli cihazlar → Cihaz əlavə et</span>.
        </li>
        <li>3. Aşağıdakı QR kodu skan edin.</li>
      </ol>
      <div className="mx-auto w-fit rounded-2xl border border-line bg-white p-3">
        <img src={status.qr} alt="WhatsApp QR" className="h-56 w-56" />
      </div>
      <p className="mt-3 text-center text-xs text-muted">Skan etdikdən sonra bu pəncərə avtomatik yenilənir…</p>
    </div>
  ) : (
    <div className="grid place-items-center gap-3 py-8 text-center">
      <Spinner size={24} className="text-primary" />
      <p className="text-sm text-muted">QR kod hazırlanır… bir neçə saniyə.</p>
    </div>
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-6 flex w-full items-center gap-4 rounded-3xl border border-line bg-surface p-5 text-left shadow-soft transition-colors hover:border-primary/40 sm:p-6"
      >
        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl" style={{ backgroundColor: `${WA_GREEN}1f`, color: WA_GREEN }}>
          <FaWhatsapp className="text-2xl" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-display text-base font-bold text-text">WhatsApp bildirişləri</span>
            {ready ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-success/12 px-2.5 py-0.5 text-xs font-semibold text-success">
                <FiCheckCircle /> Qoşulub
              </span>
            ) : (
              <span className="inline-flex items-center rounded-full bg-warning/12 px-2.5 py-0.5 text-xs font-semibold text-warning">
                Qoşulmayıb
              </span>
            )}
          </div>
          <p className="mt-0.5 text-sm text-muted">Yeni imtahan əlavə olunanda şagirdlərə WhatsApp göndər</p>
        </div>
        <FiSettings className="shrink-0 text-xl text-muted" />
      </button>

      {open && (
        <div className="fixed inset-0 z-[1500] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="animate-scale-in relative flex max-h-[88vh] w-full max-w-md flex-col overflow-hidden rounded-3xl border border-line bg-surface shadow-lift">
            <div className="flex items-center gap-3 border-b border-line p-5">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl" style={{ backgroundColor: `${WA_GREEN}1f`, color: WA_GREEN }}>
                <FaWhatsapp className="text-xl" />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="font-display text-lg font-bold text-text">WhatsApp bildirişləri</h2>
                <p className="text-xs text-muted">Göndərən nömrəni qoşmaq üçün QR kodu skan edin.</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Bağla"
                className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-line text-muted transition-colors hover:text-text"
              >
                <FiX />
              </button>
            </div>
            <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto p-5">{body}</div>
          </div>
        </div>
      )}
    </>
  );
};

export default WhatsAppNotifications;
