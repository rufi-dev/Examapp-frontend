import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { getExamsByClass, getExamsByUser } from "../../redux/features/quiz/quizSlice";
import { getResultsByUser } from "../../redux/features/quiz/resultSlice";
import Loader from "./Loader";
import ExamCard from "./ExamCard";

const ExamList = ({ classId }) => {
  const dispatch = useDispatch();
  const { exams } = useSelector((state) => state.quiz);
  // Loading is reset on EVERY classId change, so switching classes shows the
  // loader instead of flashing the previous class's exams (which still sit in
  // Redux until the new fetch lands).
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    Promise.resolve(dispatch(getExamsByClass(classId))).finally(() => {
      if (active) setLoading(false);
    });
    dispatch(getExamsByUser());
    dispatch(getResultsByUser());
    return () => {
      active = false;
    };
  }, [dispatch, classId]);

  const hasExams = exams && exams.length > 0;
  if (loading) return <Loader />;
  if (!hasExams) {
    return (
      <div className="rounded-2xl border border-dashed border-line bg-surface p-12 text-center text-muted">
        Hələlik imtahan yoxdur.
      </div>
    );
  }

  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
      {exams.map((exam, index) => (
        <div
          key={exam._id}
          className="h-full animate-fade-in"
          style={{ animationDelay: `${Math.min(index * 60, 360)}ms` }}
        >
          <ExamCard exam={exam} onChanged={() => dispatch(getExamsByClass(classId))} />
        </div>
      ))}
    </div>
  );
};

export default ExamList;
