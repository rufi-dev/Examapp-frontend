import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { FiBell, FiPlus } from "react-icons/fi";
import {
  getNotifications,
  markNotificationsSeen,
} from "../../redux/features/notification/notificationSlice";
import { AdminTeacherLink } from "./protect/hiddenLink";

const timeAgo = (iso) => {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "indi";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} dəq əvvəl`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} saat əvvəl`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d} gün əvvəl`;
  return new Date(iso).toLocaleDateString();
};

const NotificationBell = () => {
  const dispatch = useDispatch();
  const { items, unread } = useSelector((s) => s.notification);
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    dispatch(getNotifications());
  }, [dispatch]);

  useEffect(() => {
    const onDoc = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next && unread > 0) dispatch(markNotificationsSeen());
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={toggle}
        className="relative grid h-10 w-10 place-items-center rounded-full border border-line bg-surface text-text transition-colors hover:bg-surface2"
        aria-label="Bildirişlər"
      >
        <FiBell className="text-[18px]" />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-danger px-1 text-[11px] font-bold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed inset-x-3 top-16 z-50 w-auto animate-scale-in overflow-hidden rounded-2xl border border-line bg-surface shadow-lift sm:absolute sm:inset-x-auto sm:right-0 sm:top-auto sm:mt-2 sm:w-80">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <span className="font-display text-sm font-bold text-text">Bildirişlər</span>
            <AdminTeacherLink>
              <Link
                to="/notifications"
                onClick={() => setOpen(false)}
                className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
              >
                <FiPlus /> Yeni
              </Link>
            </AdminTeacherLink>
          </div>
          <div className="scrollbar-thin max-h-96 overflow-y-auto">
            {items.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-muted">Bildiriş yoxdur.</p>
            ) : (
              items.map((n) => (
                <div key={n._id} className="border-b border-line/60 px-4 py-3 last:border-0">
                  {n.title && <p className="text-sm font-semibold text-text">{n.title}</p>}
                  <p className="whitespace-pre-line text-sm text-muted">{n.message}</p>
                  <p className="mt-1 text-[11px] text-muted/80">
                    {n.createdBy?.name ? `${n.createdBy.name} · ` : ""}
                    {timeAgo(n.createdAt)}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
