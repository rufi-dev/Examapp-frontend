import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
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
  const [opening, setOpening] = useState(false); // fetching when the modal opens
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState("");
  const [groups, setGroups] = useState([]);
  const [groupId, setGroupId] = useState("");
  const [inviteLink, setInviteLink] = useState("");
  const [groupsLoaded, setGroupsLoaded] = useState(false);
  const pollRef = useRef(null);

  const loadGroups = async () => {
    try {
      const { data } = await axios.get(`${API}/groups`);
      setGroups(Array.isArray(data.groups) ? data.groups : []);
      setGroupId(data.selected || "");
      setInviteLink(data.inviteLink || "");
    } catch {
      /* ignore */
    } finally {
      setGroupsLoaded(true);
    }
  };

  const saveInvite = async () => {
    setBusy("invite");
    try {
      await axios.post(`${API}/group`, { inviteLink });
      toast.success("Dəvət linki yadda saxlanıldı.");
    } catch {
      toast.error("Yadda saxlanmadı");
    } finally {
      setBusy("");
    }
  };

  const saveGroup = async (id) => {
    setGroupId(id);
    setBusy("group");
    try {
      await axios.post(`${API}/group`, { groupId: id });
      toast.success(id ? "Bildiriş qrupu yadda saxlanıldı." : "Qrup söndürüldü (fərdi göndəriş).");
    } catch {
      toast.error("Yadda saxlanmadı");
    } finally {
      setBusy("");
    }
  };

  const testGroup = async () => {
    setBusy("grouptest");
    try {
      const { data } = await axios.post(`${API}/group/test`);
      if (data?.ok) toast.success("Qrupa test mesajı göndərildi.");
      else toast.error(data?.message || "Göndərilmədi");
    } catch (e) {
      toast.error(e?.response?.data?.message || "Göndərilmədi");
    } finally {
      setBusy("");
    }
  };

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
    setOpening(true);
    loadStatus(true).finally(() => setOpening(false));
    pollRef.current = setInterval(() => loadStatus(true), 3000);
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden"; // lock background scroll
    return () => {
      pollRef.current && clearInterval(pollRef.current);
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Once linked, load the account's groups so a notification group can be picked.
  useEffect(() => {
    if (open && status?.ready) loadGroups();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, status?.ready]);

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

  const body = loading || opening ? (
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

      {/* Notification group: send one message to a group instead of many. */}
      <div className="rounded-2xl border border-line bg-surface2/40 p-4">
        <p className="font-semibold text-text">Bildiriş qrupu (tövsiyə olunur)</p>
        <p className="mt-1 text-xs text-muted">
          Bütün imtahan bildirişləri tək mesajla seçilmiş qrupa göndərilir — şagirdlər sadəcə
          qrupa qoşulur, nömrə lazım deyil. (Qrup seçilməsə, hər kəsə ayrıca göndərilir.)
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2.5">
          <select
            value={groupId}
            onChange={(e) => saveGroup(e.target.value)}
            disabled={busy === "group"}
            className="min-w-[12rem] flex-1 rounded-xl border border-line bg-surface px-3 py-2 text-sm text-text outline-none focus:border-primary"
          >
            <option value="">— Qrupsuz (hər kəsə ayrıca) —</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
          <Button type="button" variant="soft" onClick={loadGroups} disabled={busy === "group"}>
            Yenilə
          </Button>
          {groupId && (
            <Button type="button" variant="soft" onClick={testGroup} disabled={busy === "grouptest"}>
              {busy === "grouptest" ? <Spinner size={16} /> : <FiSend />} Qrupa test
            </Button>
          )}
        </div>
        {groupsLoaded && groups.length === 0 && (
          <p className="mt-2 text-xs text-warning">
            Qrup tapılmadı. WhatsApp-da qrup yaradın, şagirdləri əlavə edin, sonra “Yenilə”yə basın.
          </p>
        )}

        {/* Group invite link → students are sent here after entering their phone. */}
        <div className="mt-4 border-t border-line pt-3">
          <p className="text-xs font-semibold text-text">Qrup dəvət linki</p>
          <p className="mt-0.5 text-xs text-muted">
            Şagird telefon nömrəsini yazdıqdan sonra qrupa qoşulmaq üçün bura yönləndirilir.
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2.5">
            <input
              value={inviteLink}
              onChange={(e) => setInviteLink(e.target.value)}
              placeholder="https://chat.whatsapp.com/..."
              className="min-w-[12rem] flex-1 rounded-xl border border-line bg-surface px-3 py-2 text-sm text-text outline-none focus:border-primary"
            />
            <Button type="button" variant="soft" onClick={saveInvite} disabled={busy === "invite"}>
              {busy === "invite" ? <Spinner size={16} /> : null} Saxla
            </Button>
          </div>
        </div>
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

      {open && createPortal(
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
        </div>,
        document.body
      )}
    </>
  );
};

export default WhatsAppNotifications;
