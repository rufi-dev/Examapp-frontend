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
  const close = () => setOpen(false);

  const handleLogout = async () => {
    dispatch(RESET());
    await dispatch(logout());
    navigate("/");
  };

  const desktopLink = ({ isActive }) =>
    `text-[15px] font-medium transition-colors ${
      isActive ? "text-text" : "text-muted hover:text-text"
    }`;

  const mobileLinkCls =
    "block rounded-xl px-4 py-3.5 text-lg font-semibold text-text transition-colors hover:bg-surface2";

  return (
    <>
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
      </header>

      {/*
        Full-screen mobile menu. Rendered OUTSIDE <header> on purpose: the
        header's backdrop-blur would otherwise become the containing block for
        these fixed elements and clip them to the 64px header box.
      */}
      <div
        className={`fixed inset-0 z-[1300] bg-bg transition-[transform,opacity] duration-300 ease-out-quint lg:hidden ${
          open ? "translate-x-0 opacity-100" : "pointer-events-none translate-x-full opacity-0"
        }`}
      >
        <div className="flex h-full flex-col">
          <div className="flex h-16 shrink-0 items-center justify-between border-b border-line/70 px-5 sm:px-8">
            <Brand onClick={close} />
            <div className="flex items-center gap-2.5">
              <ThemeToggle />
              <button
                onClick={close}
                aria-label="Bağla"
                className="grid h-10 w-10 place-items-center rounded-full border border-line bg-surface text-text"
              >
                <GrClose className="text-[15px]" />
              </button>
            </div>
          </div>

          <nav className="flex flex-1 flex-col px-5 py-6 sm:px-8">
            <ul className="flex flex-col gap-1">
              {links.map((l) => (
                <li key={l.label}>
                  {l.to ? (
                    <NavLink to={l.to} onClick={close} className={mobileLinkCls}>
                      {l.label}
                    </NavLink>
                  ) : (
                    <a href={l.hash} onClick={close} className={mobileLinkCls}>
                      {l.label}
                    </a>
                  )}
                </li>
              ))}
            </ul>

            <div className="mt-auto flex flex-col gap-3 pt-8">
              <ShowOnLogout>
                <Button to="/login" variant="secondary" onClick={close} size="lg" className="w-full">
                  Daxil ol
                </Button>
                <Button to="/register" variant="primary" onClick={close} size="lg" className="w-full">
                  Qeydiyyat
                </Button>
              </ShowOnLogout>
              <ShowOnLogin>
                <div className="rounded-xl border border-line bg-surface px-4 py-3 text-sm font-semibold text-text">
                  <UserName />
                </div>
                <Button
                  variant="secondary"
                  size="lg"
                  onClick={() => {
                    close();
                    handleLogout();
                  }}
                  className="w-full"
                >
                  Çıxış et
                </Button>
              </ShowOnLogin>
            </div>
          </nav>
        </div>
      </div>
    </>
  );
};

export default Navbar;
