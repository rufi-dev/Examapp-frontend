import { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { RxHamburgerMenu } from "react-icons/rx";
import { GrClose } from "react-icons/gr";
import { FiLogOut } from "react-icons/fi";
import { useDispatch } from "react-redux";
import { RESET, logout } from "../../redux/features/auth/authSlice";
import { ShowOnLogin, ShowOnLogout } from "./protect/hiddenLink";
import { UserName } from "../pages/profile/Profile";
import ThemeToggle from "./ui/ThemeToggle";
import Button from "./ui/Button";

const links = [
  { hash: "#features", label: "Üstünlüklər" },
  { hash: "#how", label: "Necə işləyir" },
  { to: "/ourSuccess", label: "Uğurlarımız" },
];

const Brand = ({ onClick }) => (
  <Link to="/" onClick={onClick} className="flex shrink-0 items-center gap-2.5">
    <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary font-display text-lg font-extrabold text-primary-fg shadow-glow">
      İ
    </span>
    <span className="font-display text-xl font-bold tracking-tight text-text">İmtahan</span>
  </Link>
);

const Navbar = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const handleLogout = async () => {
    dispatch(RESET());
    await dispatch(logout());
    navigate("/");
  };

  const desktopLink = ({ isActive }) =>
    `text-[15px] font-medium transition-colors ${
      isActive ? "text-text" : "text-muted hover:text-text"
    }`;

  const mobileLink = ({ isActive }) =>
    `block rounded-xl px-4 py-3 text-base font-medium transition-colors ${
      isActive ? "bg-primary/12 text-primary" : "text-text hover:bg-surface2"
    }`;

  return (
    <header className="sticky top-0 z-[900] border-b border-line/70 bg-bg/80 backdrop-blur-xl">
      <nav className="container-app flex h-16 items-center justify-between gap-4">
        <Brand />

        <ul className="hidden items-center gap-9 lg:flex">
          {links.map((l) => (
            <li key={l.label}>
              {l.to ? (
                <NavLink to={l.to} className={desktopLink}>
                  {l.label}
                </NavLink>
              ) : (
                <a
                  href={l.hash}
                  className="text-[15px] font-medium text-muted transition-colors hover:text-text"
                >
                  {l.label}
                </a>
              )}
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-2.5">
          <ThemeToggle />
          <div className="hidden items-center gap-2.5 lg:flex">
            <ShowOnLogout>
              <Button to="/login" variant="ghost" size="sm">
                Daxil ol
              </Button>
              <Button to="/register" variant="primary" size="sm">
                Qeydiyyat
              </Button>
            </ShowOnLogout>
            <ShowOnLogin>
              <span className="text-sm font-semibold text-text">
                <UserName />
              </span>
              <button
                onClick={handleLogout}
                aria-label="Çıxış et"
                title="Çıxış et"
                className="grid h-10 w-10 place-items-center rounded-full border border-line bg-surface text-muted transition-colors hover:bg-surface2 hover:text-danger"
              >
                <FiLogOut className="text-[17px]" />
              </button>
            </ShowOnLogin>
          </div>

          <button
            onClick={() => setOpen(true)}
            className="grid h-10 w-10 place-items-center rounded-full border border-line bg-surface text-text lg:hidden"
            aria-label="Menyu"
          >
            <RxHamburgerMenu className="text-[20px]" />
          </button>
        </div>
      </nav>

      {/* Mobile drawer */}
      <div
        className={`fixed inset-0 z-[950] bg-black/40 backdrop-blur-sm transition-opacity duration-300 lg:hidden ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={() => setOpen(false)}
      />
      <aside
        className={`fixed right-0 top-0 z-[960] flex h-full w-[84%] max-w-sm flex-col border-l border-line bg-bg p-6 shadow-lift transition-transform duration-300 ease-out-quint lg:hidden ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between">
          <Brand onClick={() => setOpen(false)} />
          <button
            onClick={() => setOpen(false)}
            className="grid h-10 w-10 place-items-center rounded-full border border-line text-text"
            aria-label="Bağla"
          >
            <GrClose />
          </button>
        </div>

        <ul className="mt-8 flex flex-col gap-1">
          {links.map((l) => (
            <li key={l.label}>
              {l.to ? (
                <NavLink to={l.to} onClick={() => setOpen(false)} className={mobileLink}>
                  {l.label}
                </NavLink>
              ) : (
                <a
                  href={l.hash}
                  onClick={() => setOpen(false)}
                  className="block rounded-xl px-4 py-3 text-base font-medium text-text transition-colors hover:bg-surface2"
                >
                  {l.label}
                </a>
              )}
            </li>
          ))}
        </ul>

        <div className="mt-auto flex flex-col gap-3 pt-6">
          <ShowOnLogout>
            <Button to="/login" variant="secondary" onClick={() => setOpen(false)} className="w-full">
              Daxil ol
            </Button>
            <Button to="/register" variant="primary" onClick={() => setOpen(false)} className="w-full">
              Qeydiyyat
            </Button>
          </ShowOnLogout>
          <ShowOnLogin>
            <div className="rounded-xl border border-line bg-surface px-4 py-3 text-sm font-semibold text-text">
              <UserName />
            </div>
            <Button
              variant="secondary"
              onClick={() => {
                setOpen(false);
                handleLogout();
              }}
              className="w-full"
            >
              Çıxış et
            </Button>
          </ShowOnLogin>
        </div>
      </aside>
    </header>
  );
};

export default Navbar;
