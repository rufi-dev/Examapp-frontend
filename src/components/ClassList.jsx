import { Link, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { LuGraduationCap } from "react-icons/lu";
import { FiArrowUpRight } from "react-icons/fi";
import { AiFillDelete } from "react-icons/ai";
import { useDispatch, useSelector } from "react-redux";
import { getClassesByTag, deleteClass } from "../../redux/features/quiz/quizSlice";
import { AdminTeacherLink } from "./protect/hiddenLink";
import CenterLoader from "./ui/CenterLoader";
import ConfirmDialog from "./ui/ConfirmDialog";

const levelLabel = (level) =>
  [1, 2].includes(Number(level)) ? `${level} ci qrup` : `${level} sinif`;

const ClassList = () => {
  const dispatch = useDispatch();
  const { classes } = useSelector((state) => state.quiz);
  const { tagId } = useParams();
  const [loadedOnce, setLoadedOnce] = useState(false);
  const [confirmClass, setConfirmClass] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let active = true;
    // Fast fetch in the background; don't gate on isLoading so cached classes
    // render instantly. New data swaps in when it arrives.
    Promise.resolve(dispatch(getClassesByTag(tagId))).finally(() => {
      if (active) setLoadedOnce(true);
    });
    return () => {
      active = false;
    };
  }, [dispatch, tagId]);

  const hasClasses = classes && classes.length > 0;

  const handleDeleteClass = async () => {
    if (!confirmClass) return;
    setDeleting(true);
    try {
      await dispatch(deleteClass(confirmClass._id)).unwrap();
      setConfirmClass(null);
      dispatch(getClassesByTag(tagId));
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
            className="group relative animate-fade-in"
            style={{ animationDelay: `${Math.min(index * 70, 420)}ms` }}
          >
            <AdminTeacherLink>
              <button
                type="button"
                onClick={() => setConfirmClass(_class)}
                className="absolute right-3 top-3 z-10 grid h-8 w-8 place-items-center rounded-lg border border-line bg-surface text-muted transition-colors hover:border-danger/40 hover:text-danger"
                aria-label="Sil"
              >
                <AiFillDelete />
              </button>
            </AdminTeacherLink>
            <Link
              to={`/exam/${_class._id}`}
              className="flex h-full flex-col items-start gap-4 rounded-2xl border border-line bg-surface p-6 shadow-soft transition-all duration-200 ease-out-quint hover:-translate-y-1 hover:border-primary/40 hover:shadow-lift"
            >
              <span className="grid h-12 w-12 place-items-center rounded-xl bg-primary/12 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-fg">
                <LuGraduationCap className="text-[22px]" />
              </span>
              <div className="flex w-full items-center justify-between gap-3">
                <h3 className="font-display text-lg font-bold text-text">{levelLabel(_class.level)}</h3>
                <FiArrowUpRight className="shrink-0 text-xl text-muted transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary" />
              </div>
            </Link>
          </div>
        ))}
      </div>

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
          <span className="font-semibold text-text">{levelLabel(confirmClass?.level)}</span> və
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
