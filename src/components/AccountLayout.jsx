import { useState } from "react";
import { Link, NavLink, useNavigate, useLocation } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { RESET, logout, selectUser } from "../../redux/features/auth/authSlice";
import { AdminTeacherLink, AdminLink } from "./protect/hiddenLink";
import UserMenu from "./UserMenu";
import {
  FiGrid,
  FiBarChart2,
  FiAward,
  FiUser,
  FiUsers,
  FiStar,
  FiPieChart,
  FiDollarSign,
  FiLogOut,
  FiMenu,
  FiX,
  FiChevronRight,
  FiHome,
  FiLink2,
  FiVideo,
  FiTrash2,
  FiActivity,
} from "react-icons/fi";
import { LuGraduationCap } from "react-icons/lu";

const navItems = [
  { to: "/dashboard", label: "İcmal", icon: FiGrid, end: true },
  // Classes are top-level now (no category layer) — /classes lists every
  // class the user can access; each class opens its exams.
  { to: "/classes", label: "Siniflər", icon: LuGraduationCap },
  { to: "/myExams", label: "İmtahanlarım", icon: FiAward },
  { to: "/myResults", label: "Nəticələrim", icon: FiBarChart2 },
  // Teachers add YouTube topic-explanation videos; everyone watches (add/delete
  // controls are gated inside the page).
  { to: "/videos", label: "Mövzu izahları", icon: FiVideo },
  // Visible to everyone; only admins/teachers get the add/delete controls
  // (gated inside the page itself).
  { to: "/achievements", label: "Nailiyyətlərimiz", icon: FiStar },
  // Password change lives inside Profil now (no separate tab).
  { to: "/profile", label: "Profil", icon: FiUser },
];

// "Add class" already lives as a button on the Siniflər page, so the admin
// nav doesn't repeat it — it only keeps user management here.
const adminNav = [
  { to: "/users", label: "İstifadəçilər", icon: FiUsers },
  { to: "/examResults", label: "Nəticələr", icon: FiPieChart },
  // Telegram + WhatsApp notification integrations live here now (moved out of Profil).
  { to: "/connections", label: "Bağlantılar", icon: FiLink2 },
  // Soft-deleted exams — restore or purge (auto-purged after 30 days).
  { to: "/trash", label: "Zibil qutusu", icon: FiTrash2 },
];

// Fallback label for the CURRENT page when a page doesn't pass a `title`
// (e.g. Profile) — so the breadcrumb never shows a generic "Səhifə".
const PATH_LABELS = {
  "/dashboard": "İcmal",
  "/classes": "Siniflər",
  "/myExams": "İmtahanlarım",
  "/myResults": "Nəticələrim",
  "/videos": "Mövzu izahları",
  "/achievements": "Nailiyyətlərimiz",
  "/profile": "Profil",
  "/users": "İstifadəçilər",
  "/examResults": "Nəticələr",
  "/connections": "Bağlantılar",
  "/trash": "Zibil qutusu",
  "/aiUsage": "AI xərcləri",
  "/health": "Sistem sağlamlığı",
};

// Parent crumbs (with links) for nested routes; the current page itself is
// appended from the `title` prop. Leaf pages get just İcmal / {title}.
const sectionParents = (path) => {
  if (/^\/exam\/[^/]+\/result$/.test(path)) return [{ label: "Nəticələrim", to: "/myResults" }];
  if (/^\/exam\/[^/]+\/resultsByExam$/.test(path)) return [{ label: "Nəticələr", to: "/examResults" }];
  if (/^\/user\/[^/]+\/details$/.test(path)) return [{ label: "İstifadəçilər", to: "/users" }];
  if (
    /^\/(classAdd|class|examAdd|exams)\b/.test(path) ||
    /^\/class\/edit\//.test(path) ||
    /^\/exam\/edit\//.test(path) ||
    /^\/exam\/[^/]+$/.test(path)
  )
    return [{ label: "Siniflər", to: "/classes" }];
  return [];
};

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

  const { pathname } = useLocation();
  // Location breadcrumb: İcmal (root) → section parents → current page.
  const rawCrumbs =
    pathname === "/dashboard"
      ? [{ label: "İcmal", current: true }]
      : [
          { label: "İcmal", to: "/dashboard" },
          ...sectionParents(pathname),
          { label: title || PATH_LABELS[pathname] || "Səhifə", current: true },
        ];
  // Drop a current crumb that just repeats its parent (e.g. /classes).
  const crumbs = rawCrumbs.filter(
    (c, i) => !(i > 0 && c.label === rawCrumbs[i - 1].label)
  );

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
        <Link to="/" onClick={close} className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary font-display text-lg font-extrabold text-primary-fg shadow-glow">
            B
          </span>
          <span className="font-display text-xl font-bold tracking-tight text-text">
            Bunker<span className="text-primary">Math</span>
          </span>
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
        <AdminLink>
          <div className="mt-1 flex flex-col gap-1">
            <SideItem to="/aiUsage" label="AI xərcləri" icon={FiDollarSign} />
            <SideItem to="/health" label="Sistem sağlamlığı" icon={FiActivity} />
          </div>
        </AdminLink>
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
            <Link to="/" className="flex items-center gap-2 lg:hidden">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary font-display text-base font-extrabold text-primary-fg">
                B
              </span>
              <span className="font-display text-lg font-bold tracking-tight text-text">
                Bunker<span className="text-primary">Math</span>
              </span>
            </Link>
            {/* Desktop: pressable location breadcrumb (the left is otherwise
                empty here — logo/menu are mobile-only). */}
            <nav
              aria-label="Naviqasiya"
              className="hidden min-w-0 max-w-[42vw] items-center gap-1.5 text-sm lg:flex"
            >
              {crumbs.map((c, i) => (
                <span key={i} className="flex min-w-0 items-center gap-1.5">
                  {i > 0 && (
                    <FiChevronRight className="shrink-0 text-[14px] text-muted/60" />
                  )}
                  {c.current || !c.to ? (
                    <span
                      aria-current="page"
                      className="truncate font-semibold text-text"
                      title={c.label}
                    >
                      {c.label}
                    </span>
                  ) : (
                    <Link
                      to={c.to}
                      className="shrink-0 text-muted transition-colors hover:text-text"
                    >
                      {c.label}
                    </Link>
                  )}
                </span>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              to="/"
              title="Ana səhifə"
              aria-label="Ana səhifə"
              className="grid h-10 w-10 place-items-center rounded-full border border-line bg-surface text-muted transition-colors hover:bg-surface2 hover:text-primary"
            >
              <FiHome className="text-[18px]" />
            </Link>
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
