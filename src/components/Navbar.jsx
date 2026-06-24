import { useState, useEffect } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { RxHamburgerMenu } from "react-icons/rx";
import { GrClose } from "react-icons/gr";
import { FiLogOut, FiArrowRight } from "react-icons/fi";
import { useDispatch } from "react-redux";
import { RESET, logout } from "../../redux/features/auth/authSlice";
import { ShowOnLogin, ShowOnLogout } from "./protect/hiddenLink";
import { UserName } from "../pages/profile/Profile";
import ThemeToggle from "./ui/ThemeToggle";
import Button from "./ui/Button";
import BunkerMathLogo from "./blueprint/BunkerMathLogo";
import { MathGridBackground } from "./blueprint/MathVisuals";

// Mövzular / Sınaqlar scroll to home sections (in-page anchors); the rest are
// real routes.
const links = [
  { to: "/", label: "Ana səhifə", end: true },
  { hash: "#sinaqlar", label: "Sınaqlar" },
  { hash: "#exam-preview", label: "İmtahan mühiti" },
  { to: "/about", label: "Haqqımızda" },
  { to: "/contact", label: "Əlaqə" },
];

const Navbar = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const close = () => setOpen(false);

  // Transparent over the hero; solid with a border once scrolled.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleLogout = async () => {
    dispatch(RESET());
    await dispatch(logout());
    navigate("/");
  };

  // Active route link → a small cobalt "graph segment" underline.
  const desktopLink = ({ isActive }) =>
    `relative text-[15px] font-medium transition-colors after:absolute after:-bottom-1.5 after:left-0 after:h-[2.5px] after:rounded-full after:bg-primary after:transition-all after:duration-300 ${
      isActive ? "text-text after:w-5" : "text-muted hover:text-text after:w-0 hover:after:w-5"
    }`;

  const anchorLink =
    "text-[15px] font-medium text-muted transition-colors hover:text-text";
  const mobileLinkCls =
    "block rounded-xl px-4 py-3.5 text-lg font-semibold text-text transition-colors hover:bg-surface2";

  return (
    <>
      <header
        className={`sticky top-0 z-[900] bg-surface transition-shadow duration-300 ${
          scrolled ? "border-b border-line shadow-soft" : "border-b border-transparent"
        }`}
      >
        <nav className="container-app flex h-16 items-center justify-between gap-4">
          <Link to="/" aria-label="BunkerMath — ana səhifə">
            <BunkerMathLogo />
          </Link>

          <ul className="hidden items-center gap-8 lg:flex">
            {links.map((l) => (
              <li key={l.label}>
                {l.to ? (
                  <NavLink to={l.to} end={l.end} className={desktopLink}>
                    {l.label}
                  </NavLink>
                ) : (
                  <a href={l.hash} className={anchorLink}>
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
                  Sınağa başla <FiArrowRight />
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

            {/* Mobile: a direct login / dashboard button (no need to open the menu).
                "Panel" sends a logged-in user straight to their dashboard. */}
            <ShowOnLogout>
              <Button to="/login" variant="primary" size="sm" className="lg:hidden">
                Daxil ol
              </Button>
            </ShowOnLogout>
            <ShowOnLogin>
              <Button to="/dashboard" variant="primary" size="sm" className="lg:hidden">
                Panel
              </Button>
            </ShowOnLogin>

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

      {/* Full-screen mobile menu (rendered outside header to escape backdrop-blur). */}
      <div
        className={`fixed inset-0 z-[1300] bg-bg transition-[transform,opacity] duration-300 ease-out-quint lg:hidden ${
          open ? "translate-x-0 opacity-100" : "pointer-events-none translate-x-full opacity-0"
        }`}
      >
        <MathGridBackground variant="graph" fade />
        <div className="relative flex h-full flex-col">
          <div className="flex h-16 shrink-0 items-center justify-between border-b border-line/70 px-5 sm:px-8">
            <Link to="/" onClick={close}>
              <BunkerMathLogo />
            </Link>
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
                    <NavLink to={l.to} end={l.end} onClick={close} className={mobileLinkCls}>
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
                  Sınağa başla <FiArrowRight />
                </Button>
              </ShowOnLogout>
              <ShowOnLogin>
                <div
                  onClick={close}
                  className="rounded-xl border border-line bg-surface px-4 py-3 text-sm font-semibold text-text"
                >
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
