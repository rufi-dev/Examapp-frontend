import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link } from "react-router-dom";
import {
  FiBarChart2,
  FiEye,
  FiEyeOff,
  FiRadio,
  FiFilePlus,
  FiEdit3,
  FiTrash2,
} from "react-icons/fi";
import { deleteExam, setExamHidden } from "../../redux/features/quiz/quizSlice";
import ConfirmDialog from "./ui/ConfirmDialog";

// Owner/admin action button — a soft tinted chip that lifts + colours on hover,
// with a tooltip naming the action. `tone` picks the hover accent.
const TONE = {
  primary: "hover:bg-primary/12 hover:text-primary hover:ring-primary/25",
  accent: "hover:bg-accent2/12 hover:text-accent2 hover:ring-accent2/25",
  danger: "hover:bg-danger/12 hover:text-danger hover:ring-danger/25",
};
const ExamAction = ({ to, onClick, label, tone = "primary", children }) => {
  const cls = `grid h-10 w-10 place-items-center rounded-xl bg-surface2 text-muted ring-1 ring-line/70 shadow-sm transition-all duration-200 ease-out-quint hover:-translate-y-0.5 hover:shadow-soft ${TONE[tone] || TONE.primary}`;
  return (
    <div className="group/act relative">
      {to ? (
        <Link to={to} aria-label={label} className={cls}>
          {children}
        </Link>
      ) : (
        <button type="button" onClick={onClick} aria-label={label} className={cls}>
          {children}
        </button>
      )}
      <span className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-text px-2 py-1 text-xs font-semibold text-bg opacity-0 shadow-lift transition-opacity duration-150 group-hover/act:opacity-100">
        {label}
      </span>
    </div>
  );
};

// Shared owner/admin management row for an exam card (hide, results, add
// questions, edit, delete) + the delete confirmation. Renders nothing unless
// the current user owns the exam (or is an admin). `onChanged` is called after
// a hide/delete so the host can refetch its list.
const ExamAdminActions = ({ exam, onChanged, className = "" }) => {
  const dispatch = useDispatch();
  const { user } = useSelector((s) => s.auth);
  const canManage =
    user?.role === "admin" || (exam?.owner && String(exam.owner) === String(user?._id));
  const [confirm, setConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  if (!canManage) return null;

  const toggleHidden = async () => {
    try {
      await dispatch(setExamHidden({ examId: exam._id, hidden: !exam.hidden })).unwrap();
      onChanged?.();
    } catch {
      /* error toast handled by the slice */
    }
  };

  const doDelete = async () => {
    setDeleting(true);
    try {
      await dispatch(deleteExam(exam._id)).unwrap();
      setConfirm(false);
      onChanged?.();
    } catch {
      /* error toast handled by the slice */
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <div className={`flex items-center justify-between gap-1.5 ${className}`}>
        <ExamAction onClick={toggleHidden} label={exam.hidden ? "Göstər" : "Gizlət"}>
          {exam.hidden ? <FiEye className="text-[17px]" /> : <FiEyeOff className="text-[17px]" />}
        </ExamAction>
        <ExamAction to={`/exam/${exam._id}/live`} label="Canlı izlə" tone="accent">
          <FiRadio className="text-[17px]" />
        </ExamAction>
        <ExamAction to={`/exam/${exam._id}/resultsByExam`} label="Nəticələr">
          <FiBarChart2 className="text-[17px]" />
        </ExamAction>
        <ExamAction
          to={exam.mode === "structured" ? `/exam/${exam._id}/build` : `/exam/${exam._id}/addQuestion`}
          label="Sual əlavə et"
        >
          <FiFilePlus className="text-[17px]" />
        </ExamAction>
        <ExamAction to={`/exam/edit/${exam._id}`} label="Redaktə et">
          <FiEdit3 className="text-[17px]" />
        </ExamAction>
        <ExamAction onClick={() => setConfirm(true)} label="Sil" tone="danger">
          <FiTrash2 className="text-[17px]" />
        </ExamAction>
      </div>

      <ConfirmDialog
        open={confirm}
        onClose={() => setConfirm(false)}
        onConfirm={doDelete}
        title="İmtahanı arxivləşdirmək?"
        confirmLabel="Bəli, arxivə at"
        cancelLabel="Geri"
        tone="danger"
        loading={deleting}
      >
        <p>
          <span className="font-semibold text-text">{exam?.name}</span> imtahanı{" "}
          <span className="font-semibold text-text">Zibil qutusuna</span> keçəcək. 30 gün ərzində
          geri qaytara bilərsiniz; sonra avtomatik həmişəlik silinəcək.
        </p>
      </ConfirmDialog>
    </>
  );
};

export default ExamAdminActions;
