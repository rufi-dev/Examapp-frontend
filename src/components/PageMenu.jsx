import { NavLink } from "react-router-dom";
import { AdminTeacherLink, AdminLink } from "./protect/hiddenLink";

const items = [
  { to: "/", label: "Ana səhifə", end: true },
  { to: "/profile", label: "Haqqımda" },
  { to: "/myResults", label: "Nəticələrim" },
  { to: "/myExams", label: "İmtahanlarım" },
];

const adminItems = [
  { to: "/users", label: "İstifadəçilər" },
  { to: "/classAdd", label: "Sinif əlavə et" },
];

// Admin-only (teachers don't see these).
const adminOnlyItems = [{ to: "/aiUsage", label: "AI xərcləri" }];

const pill = ({ isActive }) =>
  `rounded-xl px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors ${
    isActive ? "bg-primary text-primary-fg shadow-soft" : "text-muted hover:bg-surface2 hover:text-text"
  }`;

const PageMenu = () => {
  return (
    <nav className="mb-8 overflow-x-auto scrollbar-none">
      <ul className="flex min-w-max gap-1 rounded-2xl border border-line bg-surface p-1.5 shadow-soft">
        {items.map((it) => (
          <li key={it.to}>
            <NavLink to={it.to} end={it.end} className={pill}>
              {it.label}
            </NavLink>
          </li>
        ))}
        <AdminTeacherLink>
          <span className="mx-1 my-1.5 w-px shrink-0 bg-line" aria-hidden />
          {adminItems.map((it) => (
            <li key={it.to}>
              <NavLink to={it.to} className={pill}>
                {it.label}
              </NavLink>
            </li>
          ))}
        </AdminTeacherLink>
        <AdminLink>
          {adminOnlyItems.map((it) => (
            <li key={it.to}>
              <NavLink to={it.to} className={pill}>
                {it.label}
              </NavLink>
            </li>
          ))}
        </AdminLink>
      </ul>
    </nav>
  );
};

export default PageMenu;
