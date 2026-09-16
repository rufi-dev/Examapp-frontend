import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useDispatch, useSelector } from "react-redux";
import { Link } from "react-router-dom";
import {
  FiBarChart2,
  FiEye,
  FiEyeOff,
  FiRadio,
  FiCamera,
  FiFilePlus,
  FiEdit3,
  FiTrash2,
  FiFolder,
  FiMoreHorizontal,
} from "react-icons/fi";
import { deleteExam, setExamHidden } from "../../redux/features/quiz/quizSlice";
import ConfirmDialog from "./ui/ConfirmDialog";
import MoveExamDialog from "./MoveExamDialog";

/*
 * Owner tools for an exam card.
 *
 * Seven 40px chips in a row filled the whole card width, so the row now carries
 * the four a teacher reaches for while working and the rest live in a labelled
 * menu. The occasional actions (go live, move to another class, delete) are also
 * the ones worth spelling out: a tooltip is a guess you must hover to confirm.
 * Delete belongs there too — it is destructive and was the easiest to hit by
 * accident at the end of the row.
 */

// Owner/admin action button — a soft tinted chip that lifts + colours on hover,
// with a tooltip naming the action. `tone` picks the hover accent.
const TONE = {
  primary: "hover:bg-primary/12 hover:text-primary hover:ring-primary/25",
  accent: "hover:bg-accent2/12 hover:text-accent2 hover:ring-accent2/25",
  danger: "hover:bg-danger/12 hover:text-danger hover:ring-danger/25",
};
const ExamAction = ({ to, onClick, label, tone = "primary", active, children }) => {
  const cls = `grid h-10 w-10 place-items-center rounded-xl ring-1 shadow-sm transition-all duration-200 ease-out-quint hover:-translate-y-0.5 hover:shadow-soft ${
    active ? "bg-primary/12 text-primary ring-primary/25" : "bg-surface2 text-muted ring-line/70"
  } ${TONE[tone] || TONE.primary}`;
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

// A row in the overflow menu — labelled, because these are used rarely enough to
// need telling rather than reminding.
const MenuItem = ({ icon, label, hint, onClick, to, danger }) => {
  const cls = `flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${
    danger ? "text-danger hover:bg-danger/10" : "text-text hover:bg-surface2"
  }`;
  const body = (
    <>
      <span className={`mt-0.5 shrink-0 text-[15px] ${danger ? "text-danger" : "text-muted"}`}>{icon}</span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold leading-5">{label}</span>
        {hint && <span className="block text-[11px] leading-4 text-muted">{hint}</span>}
      </span>
    </>
  );
  return to ? (
    <Link to={to} role="menuitem" className={cls}>
      {body}
    </Link>
  ) : (
    <button type="button" role="menuitem" onClick={onClick} className={cls}>
      {body}
    </button>
  );
};

// Shared owner/admin management row for an exam card. Renders nothing unless the
// current user owns the exam (or is an admin). `onChanged` is called after a
// hide/move/delete so the host can refetch its list.
const ExamAdminActions = ({ exam, onChanged, className = "" }) => {
  const dispatch = useDispatch();
  const { user } = useSelector((s) => s.auth);
  const canManage =
    user?.role === "admin" || (exam?.owner && String(exam.owner) === String(user?._id));
  const [confirm, setConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [moving, setMoving] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState(null);
  const menuRef = useRef(null);
  const triggerRef = useRef(null);

  /*
   * The menu is PORTALLED to the body rather than positioned inside the card:
   * ExamCard's root is `overflow-hidden` (it clips the cover image), so a popover
   * rendered inside would be cut off at the card edge. A portal escapes that clip
   * and any ancestor stacking context, at the cost of placing it by hand.
   */
  useLayoutEffect(() => {
    if (!menuOpen || !triggerRef.current) return undefined;
    const place = () => {
      const r = triggerRef.current?.getBoundingClientRect();
      if (!r) return;
      const W = 264;
      const H = 210; // approximate; only decides which side to open on
      setMenuPos({
        // Right-aligned to the trigger, but never off the left edge on a phone.
        left: Math.max(8, Math.min(r.right - W, window.innerWidth - W - 8)),
        // Above by default (the row sits low in the card); below when there is no
        // room above, as for a card at the top of the viewport.
        top: r.top > H + 8 ? r.top - H - 8 : r.bottom + 8,
        width: W,
      });
    };
    place();
    // Reposition rather than drift: scrolling would leave the menu behind.
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    return () => {
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
    };
  }, [menuOpen]);

  // Close on an outside click or Escape — the card underneath is itself one big
  // navigation link, so leaving the menu open would swallow the next tap.
  useEffect(() => {
    if (!menuOpen) return undefined;
    const onDown = (e) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target)
      ) {
        setMenuOpen(false);
      }
    };
    const onKey = (e) => e.key === "Escape" && setMenuOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  if (!canManage) return null;

  const paper = exam.mode === "paper";

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
      <div className={`flex items-center gap-1.5 ${className}`}>
        <ExamAction onClick={toggleHidden} label={exam.hidden ? "Göstər" : "Gizlət"}>
          {exam.hidden ? <FiEye className="text-[17px]" /> : <FiEyeOff className="text-[17px]" />}
        </ExamAction>
        <ExamAction to={`/exam/${exam._id}/resultsByExam`} label="Nəticələr">
          <FiBarChart2 className="text-[17px]" />
        </ExamAction>
        <ExamAction
          to={exam.mode === "structured" ? `/exam/${exam._id}/build` : `/exam/${exam._id}/addQuestion`}
          label={paper ? "Cavab açarı" : "Sual əlavə et"}
        >
          <FiFilePlus className="text-[17px]" />
        </ExamAction>
        <ExamAction to={`/exam/edit/${exam._id}`} label="Redaktə et">
          <FiEdit3 className="text-[17px]" />
        </ExamAction>

        <div className="ml-auto" ref={triggerRef}>
          <ExamAction onClick={() => setMenuOpen((v) => !v)} label="Digər əməliyyatlar" active={menuOpen}>
            <FiMoreHorizontal className="text-[17px]" />
          </ExamAction>
        </div>

        {menuOpen &&
          menuPos &&
          createPortal(
            <div
              ref={menuRef}
              role="menu"
              className="animate-scale-in fixed z-[60] overflow-hidden rounded-2xl border border-line bg-surface p-1.5 shadow-lift"
              style={menuPos}
            >
              {paper ? (
                <MenuItem
                  icon={<FiCamera />}
                  label="Kağızları yoxla"
                  hint="vərəqləri oxut və nəticəni saxla"
                  to={`/exam/${exam._id}/paper`}
                />
              ) : (
                <MenuItem
                  icon={<FiRadio />}
                  label="Canlı izlə"
                  hint="imtahan gedişini real vaxtda gör"
                  to={`/exam/${exam._id}/live`}
                />
              )}
              <MenuItem
                icon={<FiFolder />}
                label="Sinfi dəyiş"
                hint="imtahanı başqa sinfə köçür"
                onClick={() => {
                  setMenuOpen(false);
                  setMoving(true);
                }}
              />
              <div className="my-1 h-px bg-line" />
              <MenuItem
                icon={<FiTrash2 />}
                label="İmtahanı sil"
                hint="30 gün zibil qutusunda qalır"
                danger
                onClick={() => {
                  setMenuOpen(false);
                  setConfirm(true);
                }}
              />
            </div>,
            document.body
          )}
      </div>

      <MoveExamDialog
        open={moving}
        exam={exam}
        onClose={() => setMoving(false)}
        onMoved={() => onChanged?.()}
      />

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
