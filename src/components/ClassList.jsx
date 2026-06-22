import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { LuGraduationCap } from "react-icons/lu";
import { FiArrowUpRight, FiUsers, FiGlobe, FiLock } from "react-icons/fi";
import { MdOutlineModeEditOutline } from "react-icons/md";
import { AiFillDelete } from "react-icons/ai";
import { useDispatch, useSelector } from "react-redux";
import { getAllClasses, deleteClass } from "../../redux/features/quiz/quizSlice";
import { selectUser } from "../../redux/features/auth/authSlice";
import CenterLoader from "./ui/CenterLoader";
import ConfirmDialog from "./ui/ConfirmDialog";
import ClassRoster from "./ClassRoster";
import Badge from "./ui/Badge";

const levelLabel = (level) =>
  [1, 2].includes(Number(level)) ? `${level} ci qrup` : `${level} sinif`;

// Prefer the free-text class name; fall back to the legacy numeric level label.
const classLabel = (c) =>
  c?.name && String(c.name).trim() ? c.name : c?.level != null ? levelLabel(c.level) : "Sinif";

const ClassList = () => {
  const dispatch = useDispatch();
  const { classes } = useSelector((state) => state.quiz);
  const me = useSelector(selectUser);
  const canManage = (item) =>
    me?.role === "admin" || (item?.owner && String(item.owner) === String(me?._id));
  const [loadedOnce, setLoadedOnce] = useState(false);
  const [confirmClass, setConfirmClass] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [rosterClass, setRosterClass] = useState(null); // class whose roster is open

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

  // Spinner only on the very first load when there's nothing to show yet.
  if (!hasClasses && !loadedOnce) {
    return <CenterLoader />;
  }

  if (!hasClasses) {
    return (
      <div className="rounded-2xl border border-dashed border-line bg-surface p-12 text-center text-muted">
        Hələlik sinif yoxdur.
      </div>
    );
  }

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {classes.map((_class, index) => (
          <div
            key={_class._id}
            className="group relative flex h-full animate-fade-in flex-col rounded-2xl border border-line bg-surface p-6 shadow-soft transition-all duration-200 ease-out-quint hover:-translate-y-1 hover:border-primary/40 hover:shadow-lift"
            style={{ animationDelay: `${Math.min(index * 70, 420)}ms` }}
          >
            {canManage(_class) && (
              <div className="absolute right-3 top-3 z-10 flex items-center gap-1">
                {/* Roster only for code-only classes — an open class needs no
                    membership management (everyone already has access). */}
                {_class.requireCode !== false && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setRosterClass(_class);
                    }}
                    title="Qoşulan tələbələr"
                    className="inline-flex h-8 items-center gap-1 rounded-lg border border-line bg-surface px-2 text-xs font-bold text-text transition-colors hover:border-primary hover:text-primary"
                  >
                    <FiUsers className="text-primary" /> {_class.students ?? 0}
                  </button>
                )}
                <Link
                  to={`/class/edit/${_class._id}`}
                  className="grid h-8 w-8 place-items-center rounded-lg border border-line bg-surface text-muted transition-colors hover:text-primary"
                  aria-label="Düzəliş et"
                >
                  <MdOutlineModeEditOutline />
                </Link>
                <button
                  type="button"
                  onClick={() => setConfirmClass(_class)}
                  className="grid h-8 w-8 place-items-center rounded-lg border border-line bg-surface text-muted transition-colors hover:border-danger/40 hover:text-danger"
                  aria-label="Sil"
                >
                  <AiFillDelete />
                </button>
              </div>
            )}
            <Link to={`/exam/${_class._id}`} className="flex flex-col items-start gap-4">
              <span className="grid h-12 w-12 place-items-center rounded-xl bg-primary/12 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-fg">
                <LuGraduationCap className="text-[22px]" />
              </span>
              <div className="w-full">
                <div className="flex w-full items-center justify-between gap-3">
                  <h3 className="font-display text-lg font-bold text-text">{classLabel(_class)}</h3>
                  <FiArrowUpRight className="shrink-0 text-xl text-muted transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary" />
                </div>
                {/* Visibility chip — only the managing teacher/admin needs it. */}
                {canManage(_class) && (
                  <Badge
                    tone={_class.requireCode === false ? "success" : "neutral"}
                    className="mt-3"
                  >
                    {_class.requireCode === false ? (
                      <>
                        <FiGlobe /> Açıq
                      </>
                    ) : (
                      <>
                        <FiLock /> Kodla
                      </>
                    )}
                  </Badge>
                )}
              </div>
            </Link>
          </div>
        ))}
      </div>

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
        confirmLabel="Bəli, sil"
        cancelLabel="Geri"
        tone="danger"
        loading={deleting}
      >
        <p>
          <span className="font-semibold text-text">{classLabel(confirmClass)}</span> və
          içindəki{" "}
          <span className="font-semibold text-text">
            bütün imtahanlar, suallar və nəticələr
          </span>{" "}
          həmişəlik silinəcək. Bu əməliyyat geri qaytarıla bilməz.
        </p>
      </ConfirmDialog>
    </>
  );
};

export default ClassList;
