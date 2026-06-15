import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { LuGraduationCap } from "react-icons/lu";
import { FiArrowUpRight } from "react-icons/fi";
import { MdOutlineModeEditOutline } from "react-icons/md";
import { useDispatch, useSelector } from "react-redux";
import { getTags } from "../../redux/features/quiz/quizSlice";
import { AdminTeacherLink } from "./protect/hiddenLink";
import CenterLoader from "./ui/CenterLoader";

const Categories = () => {
  const dispatch = useDispatch();
  const { tags } = useSelector((state) => state.quiz);
  const [loadedOnce, setLoadedOnce] = useState(false);

  useEffect(() => {
    let active = true;
    // Refetch in the background, but ignore the global isLoading flag so cached
    // tags render instantly with no spinner flash on revisit.
    Promise.resolve(dispatch(getTags())).finally(() => {
      if (active) setLoadedOnce(true);
    });
    return () => {
      active = false;
    };
  }, [dispatch]);

  const hasTags = tags && tags.length > 0;

  // Spinner only on the very first load when there's nothing cached to show.
  if (!hasTags && !loadedOnce) {
    return <CenterLoader />;
  }

  if (!hasTags) {
    return (
      <div className="rounded-2xl border border-dashed border-line bg-surface p-12 text-center text-muted">
        Hələlik kateqoriya yoxdur.
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {tags.map((tag, index) => (
        <div
          key={tag._id}
          className="group relative animate-fade-in"
          style={{ animationDelay: `${Math.min(index * 70, 420)}ms` }}
        >
          <AdminTeacherLink>
            <Link
              to={`/tag/edit/${tag._id}`}
              className="absolute right-3 top-3 z-10 grid h-8 w-8 place-items-center rounded-lg bg-surface2 text-muted opacity-0 transition-all hover:text-primary group-hover:opacity-100"
              aria-label="Düzəliş et"
            >
              <MdOutlineModeEditOutline />
            </Link>
          </AdminTeacherLink>
          <Link
            to={`/class/${tag._id}`}
            className="flex h-full flex-col items-start gap-4 rounded-2xl border border-line bg-surface p-6 shadow-soft transition-all duration-200 ease-out-quint hover:-translate-y-1 hover:border-primary/40 hover:shadow-lift"
          >
            <span className="grid h-12 w-12 place-items-center rounded-xl bg-primary/12 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-fg">
              <LuGraduationCap className="text-[22px]" />
            </span>
            <div className="flex w-full items-center justify-between gap-3">
              <h3 className="font-display text-lg font-bold text-text">{tag.name}</h3>
              <FiArrowUpRight className="shrink-0 text-xl text-muted transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary" />
            </div>
          </Link>
        </div>
      ))}
    </div>
  );
};

export default Categories;
