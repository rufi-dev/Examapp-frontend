import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { FiUser, FiLock, FiLogOut, FiChevronDown } from "react-icons/fi";

// Header avatar with a dropdown (profile / password / logout).
const UserMenu = ({ user, onLogout }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const onDoc = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const item =
    "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors";

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-full border border-line bg-surface py-1 pl-1 pr-2.5 transition-colors hover:bg-surface2"
        aria-label="Hesab menyusu"
      >
        <img
          src={user?.photo}
          alt=""
          className="h-8 w-8 shrink-0 rounded-full border border-line object-cover"
        />
        <span className="hidden max-w-[120px] truncate text-sm font-semibold text-text sm:block">
          {user?.name?.split(" ")[0] || "Hesab"}
        </span>
        <FiChevronDown
          className={`text-muted transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-60 animate-scale-in overflow-hidden rounded-2xl border border-line bg-surface shadow-lift">
          <div className="flex items-center gap-3 border-b border-line p-3">
            <img
              src={user?.photo}
              alt=""
              className="h-10 w-10 shrink-0 rounded-full border border-line object-cover"
            />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-text">{user?.name || "—"}</p>
              <p className="truncate text-xs text-muted">{user?.email}</p>
            </div>
          </div>
          <div className="p-1.5">
            <Link to="/profile" onClick={() => setOpen(false)} className={`${item} text-text hover:bg-surface2`}>
              <FiUser /> Profil
            </Link>
            <Link to="/changePassword" onClick={() => setOpen(false)} className={`${item} text-text hover:bg-surface2`}>
              <FiLock /> Şifrə
            </Link>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onLogout?.();
              }}
              className={`${item} text-danger hover:bg-danger/10`}
            >
              <FiLogOut /> Çıxış
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserMenu;
