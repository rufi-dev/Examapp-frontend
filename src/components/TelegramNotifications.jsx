import { useEffect, useRef, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { FaTelegramPlane } from "react-icons/fa";
import { FiCheckCircle, FiSend, FiRefreshCw, FiLink2 } from "react-icons/fi";
import Button from "./ui/Button";
import Spinner from "./Spinner";

const API = `${import.meta.env.VITE_BACKEND_URL}/api/telegram`;

// Teacher-facing card: link a Telegram account so the bot pings you whenever a
// student starts one of your exams. Lives on the profile page (staff only).
const TelegramNotifications = () => {
  const [status, setStatus] = useState(null); // { configured, linked, deepLink, ... }
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(""); // "test" | "unlink" | "check"
  const [waiting, setWaiting] = useState(false); // polling after Connect tap
  const pollRef = useRef(null);

  const load = async () => {
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

  useEffect(() => {
    load();
    return () => pollRef.current && clearInterval(pollRef.current);
  }, []);

  // After the teacher opens the bot, poll a little so the card flips to
  // "connected" on its own once they press Start in Telegram.
  const startPolling = () => {
    setWaiting(true);
    let tries = 0;
    pollRef.current && clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      tries += 1;
      const data = await load();
      if (data?.linked || tries >= 20) {
        clearInterval(pollRef.current);
        setWaiting(false);
        if (data?.linked) toast.success("Telegram qoşuldu! 🎉");
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
    const data = await load();
    setBusy("");
    if (data?.linked) toast.success("Telegram qoşuldu! 🎉");
    else toast.info("Hələ qoşulmayıb. Botda “Start” düyməsini basdığınızdan əmin olun.");
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
      await load();
      toast.info("Telegram ayrıldı.");
    } catch {
      toast.error("Əməliyyat alınmadı");
    } finally {
      setBusy("");
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
            <h2 className="font-display text-lg font-bold text-text">Telegram bildirişləri</h2>
            {status?.linked && (
              <span className="inline-flex items-center gap-1 rounded-full bg-success/12 px-2.5 py-0.5 text-xs font-semibold text-success">
                <FiCheckCircle /> Qoşulub
              </span>
            )}
          </div>
          <p className="mt-1 text-sm leading-relaxed text-muted">
            Şagird imtahanlarınızdan birinə başladıqda dərhal Telegram-a bildiriş gəlir.
          </p>

          {loading ? (
            <div className="mt-4">
              <Spinner size={20} className="text-primary" />
            </div>
          ) : status?.linked ? (
            <div className="mt-4 flex flex-wrap gap-2.5">
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
          ) : (
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
          )}
        </div>
      </div>
    </div>
  );
};

export default TelegramNotifications;
