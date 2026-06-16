import { useEffect, useState } from "react";
import { FiDownload, FiX, FiShare } from "react-icons/fi";

const DISMISS_KEY = "pwa_install_dismissed";

const isStandalone = () =>
  window.matchMedia?.("(display-mode: standalone)").matches ||
  window.navigator.standalone === true;

const isIos = () => /iphone|ipad|ipod/i.test(window.navigator.userAgent);

// A dismissible "install the app" banner. On Android/desktop it uses the native
// beforeinstallprompt flow; on iOS Safari (which has no such event) it shows the
// manual "Share → Add to Home Screen" hint instead.
export default function InstallPrompt() {
  const [deferred, setDeferred] = useState(null);
  const [show, setShow] = useState(false);
  const [iosHint, setIosHint] = useState(false);

  useEffect(() => {
    if (isStandalone()) return; // already installed
    try {
      if (localStorage.getItem(DISMISS_KEY)) return; // user said no before
    } catch {
      /* ignore */
    }

    const onPrompt = (e) => {
      e.preventDefault();
      setDeferred(e);
      setIosHint(false);
      setShow(true);
    };
    const onInstalled = () => {
      setShow(false);
      setDeferred(null);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);

    // iOS gives no install event — surface the manual steps.
    if (isIos()) {
      setIosHint(true);
      setShow(true);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const dismiss = () => {
    setShow(false);
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* ignore */
    }
  };

  const install = async () => {
    if (!deferred) return;
    deferred.prompt();
    try {
      await deferred.userChoice;
    } catch {
      /* ignore */
    }
    setDeferred(null);
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="fixed inset-x-3 bottom-3 z-[60] animate-fade-in sm:left-auto sm:right-4 sm:w-[22rem]">
      <div className="flex items-start gap-3 rounded-2xl border border-line bg-surface p-3.5 shadow-lift">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary font-display text-xl font-extrabold text-primary-fg">
          İ
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-display text-sm font-bold text-text">Tətbiqi qur</p>
          {iosHint ? (
            <p className="mt-0.5 text-xs leading-relaxed text-muted">
              Safari-də <FiShare className="inline -mt-0.5" /> Paylaş düyməsinə bas, sonra{" "}
              <span className="font-semibold text-text">«Ana ekrana əlavə et»</span> seç.
            </p>
          ) : (
            <p className="mt-0.5 text-xs leading-relaxed text-muted">
              İmtahan platformasını telefonuna tətbiq kimi qur, daha sürətli aç.
            </p>
          )}
          {!iosHint && (
            <button
              type="button"
              onClick={install}
              className="mt-2.5 inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-primary-fg transition-colors hover:bg-primary-hover"
            >
              <FiDownload /> Qur
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Bağla"
          className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-muted transition-colors hover:bg-surface2 hover:text-text"
        >
          <FiX />
        </button>
      </div>
    </div>
  );
}
