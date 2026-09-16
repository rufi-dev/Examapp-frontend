import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { FiFolder } from "react-icons/fi";
import ConfirmDialog from "./ui/ConfirmDialog";
import { inputClass } from "./ui/Field";
import { fetchMyClasses, moveExamToClass } from "../helper/classApi";

// Move an exam to another class the teacher owns. Used by the exam card's owner
// actions and by the paper-exams page. `onMoved` lets the host refetch its list.
const MoveExamDialog = ({ open, exam, onClose, onMoved }) => {
  const [classes, setClasses] = useState(null);
  const [classId, setClassId] = useState("");
  const [saving, setSaving] = useState(false);

  const currentId = String(exam?.class?._id || exam?.class || exam?.classId || "");
  const currentName = exam?.class?.name || exam?.className || "";

  useEffect(() => {
    if (!open) return;
    setClasses(null);
    fetchMyClasses()
      .then((list) => {
        const all = list || [];
        setClasses(all);
        const first = all.find((c) => String(c._id) !== currentId);
        setClassId(first ? String(first._id) : "");
      })
      .catch(() => setClasses([]));
  }, [open, currentId]);

  const move = async () => {
    if (!classId) return toast.error("Sinif seçin");
    setSaving(true);
    try {
      const res = await moveExamToClass(exam._id, classId);
      toast.success(`“${exam.name}” → ${res.class?.name || "yeni sinif"}`);
      onClose?.();
      onMoved?.();
    } catch (e) {
      toast.error(e?.response?.data?.message || "Köçürülmədi");
    } finally {
      setSaving(false);
    }
  };

  const options = (classes || []).filter((c) => String(c._id) !== currentId);

  return (
    <ConfirmDialog
      open={open}
      onClose={onClose}
      onConfirm={move}
      icon={<FiFolder className="text-xl" />}
      title="Başqa sinfə köçür"
      confirmLabel="Köçür"
      cancelLabel="Geri"
      loading={saving || classes === null}
    >
      <p>
        <span className="font-semibold text-text">{exam?.name}</span>
        {currentName ? (
          <>
            {" "}
            hazırda <span className="font-semibold text-text">{currentName}</span> sinfindədir.
          </>
        ) : (
          " imtahanı köçürüləcək."
        )}
      </p>
      <label htmlFor="move-class" className="mt-4 block text-sm font-medium text-text">
        Yeni sinif
      </label>
      <select
        id="move-class"
        value={classId}
        onChange={(e) => setClassId(e.target.value)}
        disabled={classes === null || !options.length}
        className={`${inputClass} mt-1.5`}
      >
        {classes === null && <option value="">Yüklənir…</option>}
        {classes !== null && !options.length && <option value="">Başqa sinif yoxdur</option>}
        {options.map((c) => (
          <option key={c._id} value={c._id}>
            {c.name}
            {c.students ? ` · ${c.students} şagird` : ""}
          </option>
        ))}
      </select>
      <p className="mt-3 text-xs">
        Nəticələr və suallar imtahanla birlikdə gedir. İmtahan yalnız yeni sinfin şagirdlərinə görünəcək.
      </p>
    </ConfirmDialog>
  );
};

export default MoveExamDialog;
