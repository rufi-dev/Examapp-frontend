import { Link, useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { LuGraduationCap } from "react-icons/lu";
import { FiUsers, FiFileText, FiEdit2, FiTrash2, FiClock, FiCopy, FiCheck, FiPlus, FiUser, FiLock, FiSearch, FiX } from "react-icons/fi";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";
import { getAllClasses, deleteClass } from "../../redux/features/quiz/quizSlice";
import { selectUser } from "../../redux/features/auth/authSlice";
import CenterLoader from "./ui/CenterLoader";
import ConfirmDialog from "./ui/ConfirmDialog";
import ClassRoster from "./ClassRoster";

const levelLabel = (level) =>
  [1, 2].includes(Number(level)) ? `${level} ci qrup` : `${level} sinif`;

// Prefer the free-text class name; fall back to the legacy numeric level label.
const classLabel = (c) =>
  c?.name && String(c.name).trim() ? c.name : c?.level != null ? levelLabel(c.level) : "Sinif";

// Each class gets its own board colour, picked from the id so it never moves.
// A wall of identical white cards is impossible to scan; a teacher learns
// "the green one is 11-ci sinif" within a day.
const BOARDS = [
  "from-emerald-700 to-emerald-900", // classic chalkboard green
  "from-slate-700 to-slate-900",
  "from-indigo-700 to-indigo-900",
  // NB: no cyan-* shades — the theme overrides `cyan` with a single token
  // colour, so `to-cyan-900` generates nothing and the board fades to blank.
  "from-teal-700 to-blue-900",
  "from-violet-700 to-purple-900",
  "from-rose-700 to-rose-900",
  "from-amber-700 to-orange-900",
  "from-sky-700 to-blue-900",
];
const hash = (s) => {
  let h = 0;
  for (let i = 0; i < String(s).length; i += 1) h = (h * 31 + String(s).charCodeAt(i)) >>> 0;
  return h;
};
const boardOf = (id) => BOARDS[hash(id) % BOARDS.length];

// A big faint math glyph on each board — different per class — so a wall of
// cards reads as a mathematics platform at a glance.
const GLYPHS = ["π", "√", "∑", "∫", "Δ", "∞", "θ", "%", "±", "×"];
const glyphOf = (id) => GLYPHS[hash(String(id) + "g") % GLYPHS.length];

// Render classes a batch at a time. An admin's list can be hundreds of classes
// (every teacher's), and painting them all in one go blocks the main thread (the
// "freeze"). We render this many, then more as the user scrolls near the end.
const CLASS_PAGE = 24;

const ClassList = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { classes } = useSelector((state) => state.quiz);
  const me = useSelector(selectUser);
  const canManage = (item) =>
    me?.role === "admin" || (item?.owner && String(item.owner) === String(me?._id));
  // Only staff can create a class, so only they get the empty-state CTA.
  const isTeacher = me?.role === "admin" || me?.role === "teacher";
  const [loadedOnce, setLoadedOnce] = useState(false);
  const [confirmClass, setConfirmClass] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [rosterClass, setRosterClass] = useState(null); // class whose roster is open
  const [copied, setCopied] = useState(null); // class id whose join code was copied
  const [query, setQuery] = useState(""); // class search (name / join code / owner)
  const [visibleCount, setVisibleCount] = useState(CLASS_PAGE); // incremental render window
  const sentinelRef = useRef(null);

  useEffect(() => {
    let active = true;
    // Fast fetch in the background; don't gate on isLoading so cached classes
    // render instantly. New data swaps in when it arrives.
    Promise.resolve(dispatch(getAllClasses())).finally(() => {
      if (active) setLoadedOnce(true);
    });
    return () => {
      active = false;
    };
  }, [dispatch]);

  const hasClasses = classes && classes.length > 0;

  // Client-side class search: match name/level label + join code, and — for an
  // ADMIN only (the only role that sees other teachers' classes, and the only one
  // the server populates `ownerName` for) — the creating teacher's name too.
  const isAdmin = me?.role === "admin";
  const q = query.trim().toLowerCase();
  const filtered = q
    ? classes.filter((c) => {
        const label = classLabel(c).toLowerCase();
        const code = String(c.joinCode || "").toLowerCase();
        const owner = isAdmin ? String(c.ownerName || "").toLowerCase() : "";
        return label.includes(q) || (code && code.includes(q)) || (owner && owner.includes(q));
      })
    : classes;
  // Only worth a search box once there are enough classes to scan.
  const showSearch = classes.length > 4;
  // Incremental window: render `visibleCount`, grow it as the sentinel scrolls in.
  const shown = filtered.slice(0, visibleCount);
  const hasMore = visibleCount < filtered.length;
  // A new search starts from the top again.
  useEffect(() => {
    setVisibleCount(CLASS_PAGE);
  }, [query]);
  // Load the next batch a little before the sentinel is actually reached.
  useEffect(() => {
    if (!hasMore) return undefined;
    const el = sentinelRef.current;
    if (!el) return undefined;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleCount((v) => Math.min(v + CLASS_PAGE, filtered.length));
        }
      },
      { rootMargin: "800px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [hasMore, filtered.length]);

  const handleDeleteClass = async () => {
    if (!confirmClass) return;
    setDeleting(true);
    try {
      await dispatch(deleteClass(confirmClass._id)).unwrap();
      setConfirmClass(null);
      dispatch(getAllClasses());
    } catch {
      /* error toast handled by the slice */
    } finally {
      setDeleting(false);
    }
  };

  const copyCode = async (_class) => {
    try {
      await navigator.clipboard.writeText(_class.joinCode);
      setCopied(_class._id);
      setTimeout(() => setCopied((c) => (c === _class._id ? null : c)), 1600);
    } catch {
      toast.info(`Kod: ${_class.joinCode}`);
    }
  };

  // Spinner only on the very first load when there's nothing to show yet.
  if (!hasClasses && !loadedOnce) {
    return <CenterLoader />;
  }

  if (!hasClasses) {
    return (
      /* Same shape as the empty exam list: the action belongs in the middle of
         an empty page, not tucked into a corner where it has to be hunted for. */
      <div className="relative overflow-hidden rounded-3xl border border-dashed border-line bg-surface px-6 py-14 text-center sm:py-16">
        <span className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-primary/10 blur-3xl" />
        <span className="pointer-events-none absolute -bottom-24 -left-16 h-56 w-56 rounded-full bg-accent2/10 blur-3xl" />

        <div className="relative mx-auto max-w-lg">
          <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-primary to-accent2 text-white shadow-glow">
            <LuGraduationCap className="text-[30px]" />
          </span>
          <h3 className="mt-5 font-display text-xl font-extrabold text-text sm:text-2xl">
            {isTeacher ? "Başlamaq üçün bir sinif yaradın" : "Hələlik sinif yoxdur"}
          </h3>
          <p className="mx-auto mt-2 max-w-md text-[15px] leading-relaxed text-muted">
            {isTeacher
              ? "Sinif şagirdlərinizi bir yerə toplayır — imtahanlar onun içində yaradılır."
              : "Müəlliminizin verdiyi kodla mövcud sinfə qoşulun."}
          </p>
          {isTeacher && (
            <Link
              to="/classAdd"
              data-tour="create-class-center"
              className="mt-7 inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-primary px-7 text-base font-bold text-primary-fg shadow-soft transition-all duration-200 ease-out-quint hover:-translate-y-0.5 hover:bg-primary-hover hover:shadow-glow"
            >
              <FiPlus className="text-lg" /> Sinif əlavə et
            </Link>
          )}
        </div>
      </div>
    );
  }

  return (
    <>
      {showSearch && (
        <div className="mb-5">
          <div className="relative">
            <FiSearch className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              type="search"
              inputMode="search"
              placeholder={isAdmin ? "Sinif adı, müəllim və ya kod ilə axtar…" : "Sinif adı və ya kod ilə axtar…"}
              className="h-12 w-full rounded-2xl border border-line bg-surface pl-11 pr-11 text-[15px] text-text shadow-soft outline-none transition placeholder:text-muted/70 focus:border-primary focus:ring-4 focus:ring-ring/25"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="absolute right-3 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg text-muted transition-colors hover:bg-surface2 hover:text-text"
                aria-label="Təmizlə"
              >
                <FiX />
              </button>
            )}
          </div>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-line bg-surface p-14 text-center">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-surface2 text-muted">
            <FiSearch className="text-xl" />
          </span>
          <p className="mt-3 font-semibold text-text">Sinif tapılmadı</p>
          <p className="mt-1 text-sm text-muted">“{query}” üçün nəticə yoxdur.</p>
        </div>
      ) : (
      <>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {shown.map((_class, index) => {
          const mine = canManage(_class);
          const label = classLabel(_class);
          const pending = mine ? _class.pending || 0 : 0;
          // Student waitlisted (class full): shown but locked until the teacher upgrades.
          const locked = !mine && _class.waitlisted;
          return (
            <article
              key={_class._id}
              data-tour={index === 0 ? "class-first" : undefined}
              className="group flex h-full animate-fade-in flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-soft transition-all duration-200 ease-out-quint hover:-translate-y-1 hover:border-primary/40 hover:shadow-lift"
              style={{ animationDelay: `${Math.min(index * 70, 420)}ms` }}
            >
              {/* ── the board: the class name written up front ─────────── */}
              <button
                type="button"
                onClick={() =>
                  locked
                    ? toast.info("Sinif doludur — müəlliminizlə əlaqə saxlayın.")
                    : navigate(`/exam/${_class._id}`)
                }
                className={`relative block h-44 w-full overflow-hidden bg-gradient-to-br text-left sm:h-48 ${boardOf(
                  _class._id
                )} ${locked ? "cursor-not-allowed" : ""}`}
              >
                {/* A teacher-chosen cover replaces the drawn board; the scrim
                    keeps the class name readable over any photo. */}
                {_class.coverImage && (
                  <>
                    <img
                      src={_class.coverImage}
                      alt=""
                      className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 ease-out-quint group-hover:scale-105"
                    />
                    <span className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/25 to-black/30" />
                  </>
                )}
                {/* chalk dust and a wiped streak, so the board isn't flat */}
                {!_class.coverImage && (
                  <>
                    <span className="pointer-events-none absolute -right-6 -top-10 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
                    <span className="pointer-events-none absolute inset-x-6 top-9 h-8 rounded-full bg-white/[0.06] blur-md" />
                    {/* graph-paper grid — the mathematics workspace texture */}
                    <span
                      className="pointer-events-none absolute inset-0 opacity-[0.08]"
                      style={{
                        backgroundImage:
                          "linear-gradient(rgba(255,255,255,.9) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.9) 1px, transparent 1px)",
                        backgroundSize: "22px 22px",
                      }}
                    />
                    {/* a big faint math glyph, unique per class */}
                    <span className="pointer-events-none absolute -bottom-5 right-3 select-none font-display text-[104px] font-black leading-none text-white/[0.09]">
                      {glyphOf(_class._id)}
                    </span>
                  </>
                )}

                {pending > 0 && (
                  <span className="absolute right-3 top-3.5 inline-flex items-center gap-1 rounded-full bg-warning px-2.5 py-1 text-[11px] font-bold text-white shadow-sm">
                    <FiClock className="text-[12px]" /> {pending} gözləyir
                  </span>
                )}
                {locked && (
                  <>
                    <span className="absolute inset-0 bg-black/45 backdrop-blur-[1px]" />
                    <span className="absolute right-3 top-3.5 inline-flex items-center gap-1 rounded-full bg-black/60 px-2.5 py-1 text-[11px] font-bold text-white shadow-sm">
                      <FiLock className="text-[12px]" /> Gözləmədə
                    </span>
                  </>
                )}

                {/* Frosted-glass panel: class name + counts, sitting inside the board */}
                <div className="absolute inset-x-3 bottom-3">
                  <div className="rounded-xl border border-white/25 bg-white/10 px-3.5 py-2.5 shadow-lg backdrop-blur-md">
                    <h3 className="line-clamp-1 font-display text-[16px] font-extrabold leading-tight text-white drop-shadow">
                      {label}
                    </h3>
                    <div className="mt-1.5 flex items-center gap-2.5 text-white/90">
                      <span className="text-xs">
                        <b className="font-display text-sm font-extrabold tabular-nums text-white">
                          {_class.students ?? 0}
                        </b>{" "}
                        Şagird
                      </span>
                      <span className="h-3 w-px bg-white/30" />
                      <span className="text-xs">
                        <b className="font-display text-sm font-extrabold tabular-nums text-white">
                          {_class.exams ?? 0}
                        </b>{" "}
                        İmtahan
                      </span>
                    </div>
                  </div>
                </div>

                {/* the chalk ledge, with two pieces of chalk resting on it */}
                {!_class.coverImage && (
                  <>
                    <span className="pointer-events-none absolute inset-x-0 bottom-0 h-[7px] bg-black/25" />
                    <span className="pointer-events-none absolute bottom-[13px] left-4 h-[5px] w-7 rounded-full bg-white/75" />
                    <span className="pointer-events-none absolute bottom-[13px] left-[52px] h-[5px] w-4 rounded-full bg-amber-200/70" />
                  </>
                )}
              </button>

              {/* ── body: creator, join code, and the actions ─────────── */}
              <div className="flex flex-1 flex-col p-4">
                {/* Admin only: who created this class. */}
                {me?.role === "admin" && _class.ownerName && (
                  <p className="flex items-center gap-1.5 truncate text-[11.5px] text-muted">
                    <FiUser className="shrink-0 text-[12px]" /> Yaradan:{" "}
                    <span className="truncate font-semibold text-text">{_class.ownerName}</span>
                  </p>
                )}

                {/* The join code is what a teacher reads out loud in the room,
                    so it belongs on the card rather than behind an edit page. */}
                {mine && _class.joinCode && (
                  <button
                    type="button"
                    onClick={() => copyCode(_class)}
                    title="Kodu kopyala"
                    className="mt-3 flex items-center justify-center gap-2 rounded-xl border border-dashed border-line py-2 text-xs font-semibold text-muted transition-colors hover:border-primary/50 hover:text-primary"
                  >
                    {copied === _class._id ? (
                      <>
                        <FiCheck className="text-success" /> Kopyalandı
                      </>
                    ) : (
                      <>
                        <FiCopy /> Qoşulma kodu:{" "}
                        <span className="font-mono tracking-widest text-text">
                          {_class.joinCode}
                        </span>
                      </>
                    )}
                  </button>
                )}

                <div className="mt-auto flex items-center gap-2 pt-4">
                  {locked ? (
                    <span
                      title="Sinif doludur — müəlliminizlə əlaqə saxlayın"
                      className="inline-flex h-12 flex-1 cursor-not-allowed items-center justify-center gap-2 rounded-xl border border-line bg-surface2 px-4 text-[15px] font-semibold text-muted"
                    >
                      <FiLock /> Gözləmədə
                    </span>
                  ) : (
                    <Link
                      to={`/exam/${_class._id}`}
                      className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-[15px] font-bold text-primary-fg shadow-soft transition-all duration-200 ease-out-quint hover:-translate-y-0.5 hover:bg-primary-hover hover:shadow-glow"
                    >
                      <FiFileText className="text-[17px]" /> İmtahanlar
                    </Link>
                  )}
                  {mine && (
                    <>
                      <button
                        type="button"
                        onClick={() => setRosterClass(_class)}
                        title="Şagirdlər"
                        aria-label="Şagirdlər"
                        className={`relative grid h-12 w-12 shrink-0 place-items-center rounded-xl border transition-colors ${
                          pending > 0
                            ? "border-warning/50 text-warning hover:bg-warning/10"
                            : "border-line text-muted hover:border-primary/40 hover:text-primary"
                        }`}
                      >
                        <FiUsers />
                        {pending > 0 && (
                          <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-warning ring-2 ring-surface" />
                        )}
                      </button>
                      <Link
                        to={`/class/edit/${_class._id}`}
                        title="Düzəliş et"
                        aria-label="Düzəliş et"
                        className="grid h-12 w-12 shrink-0 place-items-center rounded-xl border border-line text-muted transition-colors hover:border-primary/40 hover:text-primary"
                      >
                        <FiEdit2 />
                      </Link>
                      <button
                        type="button"
                        onClick={() => setConfirmClass(_class)}
                        title="Sil"
                        aria-label="Sil"
                        className="grid h-12 w-12 shrink-0 place-items-center rounded-xl border border-line text-muted transition-colors hover:border-danger/40 hover:text-danger"
                      >
                        <FiTrash2 />
                      </button>
                    </>
                  )}
                </div>
              </div>
            </article>
          );
        })}
      </div>
      {hasMore && (
        <div ref={sentinelRef} className="flex items-center justify-center gap-3 py-8 text-sm text-muted">
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-line border-t-primary" />
          Daha çox sinif yüklənir… ({shown.length}/{filtered.length})
        </div>
      )}
      </>
      )}

      {rosterClass && (
        <ClassRoster
          classObj={rosterClass}
          label={classLabel(rosterClass)}
          onClose={() => setRosterClass(null)}
          onChange={() => dispatch(getAllClasses())}
        />
      )}

      <ConfirmDialog
        open={!!confirmClass}
        onClose={() => setConfirmClass(null)}
        onConfirm={handleDeleteClass}
        title="Sinfi silmək?"
        confirmLabel="Bəli, sinfi sil"
        cancelLabel="Geri"
        tone="danger"
        loading={deleting}
      >
        <p>
          <span className="font-semibold text-text">{classLabel(confirmClass)}</span> sinfi{" "}
          <span className="font-semibold text-text">həmişəlik</span> silinəcək.
        </p>
        <p className="mt-2">
          İçindəki bütün imtahanlar isə <span className="font-semibold text-text">zibil
          qutusuna</span> keçəcək — 30 gün ərzində geri qaytara bilərsiniz, sonra avtomatik
          silinəcək.
        </p>
      </ConfirmDialog>
    </>
  );
};

export default ClassList;
