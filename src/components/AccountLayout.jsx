import { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { RESET, logout, selectUser } from "../../redux/features/auth/authSlice";
import { AdminTeacherLink } from "./protect/hiddenLink";
import ThemeToggle from "./ui/ThemeToggle";
import UserMenu from "./UserMenu";
import {
  FiGrid,
  FiBarChart2,
  FiAward,
  FiUser,
  FiLock,
  FiUsers,
  FiTag,
  FiStar,
  FiPieChart,
  FiLogOut,
  FiMenu,
  FiX,
} from "react-icons/fi";

const navItems = [
  { to: "/dashboard", label: "İcmal", icon: FiGrid, end: true },
  // /tags shows the category list (category -> class -> exam), so the label
  // matches the page (titled "Kateqoriyalar"), not "İmtahanlar".
  { to: "/tags", label: "Kateqoriyalar", icon: FiTag },
  { to: "/myExams", label: "İmtahanlarım", icon: FiAward },
  { to: "/myResults", label: "Nəticələrim", icon: FiBarChart2 },
  // Visible to everyone; only admins/teachers get the add/delete controls
  // (gated inside the page itself).
  { to: "/achievements", label: "Nailiyyətlərimiz", icon: FiStar },
  { to: "/profile", label: "Profil", icon: FiUser },
  { to: "/changePassword", label: "Şifrə", icon: FiLock },
];

// "Add category" already lives as a button on the Kateqoriyalar page, so the
// admin nav doesn't repeat it — it only keeps user management here.
const adminNav = [
  { to: "/users", label: "İstifadəçilər", icon: FiUsers },
  { to: "/examResults", label: "Nəticələr", icon: FiPieChart },
];

const sideLink = ({ isActive }) =>
  `flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors ${
    isActive ? "bg-primary/12 text-primary" : "text-muted hover:bg-surface2 hover:text-text"
  }`;

export default function AccountLayout({ title, subtitle, actions, children }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = useSelector(selectUser);
  const [open, setOpen] = useState(false);

  const handleLogout = async () => {
    dispatch(RESET());
    await dispatch(logout());
    navigate("/");
  };

  const close = () => setOpen(false);

  const SideItem = ({ to, label, icon: Icon, end }) => (
    <NavLink to={to} end={end} onClick={close} className={sideLink}>
      <Icon className="text-[18px]" />
      {label}
    </NavLink>
  );

  // Full-height sidebar content: brand → nav → user/logout
  const SidebarInner = () => (
    <div className="flex h-full flex-col">
      <div className="flex h-16 shrink-0 items-center justify-between gap-2 border-b border-line px-5">
        <Link to="/dashboard" onClick={close} className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary font-display text-lg font-extrabold text-primary-fg shadow-glow">
            İ
          </span>
          <span className="font-display text-xl font-bold tracking-tight text-text">İmtahan</span>
        </Link>
        <button
          onClick={close}
          aria-label="Bağla"
          className="grid h-9 w-9 place-items-center rounded-lg border border-line text-muted lg:hidden"
        >
          <FiX />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <p className="px-3.5 pb-2 text-xs font-semibold uppercase tracking-wider text-muted">
          Menyu
        </p>
        <div className="flex flex-col gap-1">
          {navItems.map((it) => (
            <SideItem key={it.to} {...it} />
          ))}
        </div>
        <AdminTeacherLink>
          <div className="my-3 border-t border-line" />
          <p className="px-3.5 pb-2 text-xs font-semibold uppercase tracking-wider text-muted">
            İdarəetmə
          </p>
          <div className="flex flex-col gap-1">
            {adminNav.map((it) => (
              <SideItem key={it.to} {...it} />
            ))}
          </div>
        </AdminTeacherLink>
      </nav>

      <div className="shrink-0 border-t border-line p-3">
        <Link
          to="/profile"
          onClick={close}
          className="flex items-center gap-3 rounded-xl border border-line bg-surface2/40 p-2.5 transition-colors hover:bg-surface2"
        >
          <img
            src={user?.photo}
            alt=""
            className="h-9 w-9 shrink-0 rounded-full border border-line object-cover"
          />
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold leading-tight text-text">
              {user?.name || "..."}
            </span>
            <span className="block truncate text-xs leading-tight text-muted">
              {user?.email || ""}
            </span>
          </span>
        </Link>
        <button
          onClick={handleLogout}
          className="mt-2 flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium text-muted transition-colors hover:bg-danger/12 hover:text-danger"
        >
          <FiLogOut className="text-[18px]" /> Çıxış
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-bg">
      {/* Desktop: fixed full-height sidebar pinned to the left */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r border-line bg-surface lg:block">
        <SidebarInner />
      </aside>

      {/* Mobile: slide-in drawer + overlay */}
      <div
        onClick={close}
        className={`fixed inset-0 z-50 bg-black/40 backdrop-blur-sm transition-opacity duration-300 lg:hidden ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 max-w-[82%] border-r border-line bg-surface shadow-lift transition-transform duration-300 ease-out-quint lg:hidden ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <SidebarInner />
      </aside>

      {/* Main area, offset by the sidebar on desktop */}
      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-line bg-bg/80 px-4 backdrop-blur-xl sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setOpen(true)}
              aria-label="Menyu"
              className="grid h-10 w-10 place-items-center rounded-full border border-line bg-surface text-text lg:hidden"
            >
              <FiMenu className="text-[20px]" />
            </button>
            <Link to="/dashboard" className="flex items-center gap-2 lg:hidden">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary font-display text-base font-extrabold text-primary-fg">
                İ
              </span>
              <span className="font-display text-lg font-bold tracking-tight text-text">İmtahan</span>
            </Link>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <ThemeToggle />
            <UserMenu user={user} onLogout={handleLogout} />
          </div>
        </header>

        <main className="mx-auto max-w-screen-2xl px-4 py-8 sm:px-6 lg:px-10">
          {(title || actions) && (
            <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
              <div>
                {title && (
                  <h1 className="font-display text-2xl font-bold text-text sm:text-3xl">{title}</h1>
                )}
                {subtitle && <p className="mt-1 text-muted">{subtitle}</p>}
              </div>
              {actions}
            </div>
          )}
          {children}
        </main>
      </div>
    </div>
  );
}
