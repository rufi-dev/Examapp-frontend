import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";
import { FiPhone, FiLogOut } from "react-icons/fi";
import { PiStudentBold } from "react-icons/pi";
import {
  selectIsLoggedIn,
  selectUser,
  updateUser,
  getUser,
  logout,
  RESET,
} from "../../redux/features/auth/authSlice";
import { GRADES, gradeLabel } from "../helper/grades";
import Button from "./ui/Button";
import Spinner from "./Spinner";

const inputCls =
  "h-12 w-full rounded-xl border border-line bg-surface pl-11 pr-3.5 text-[15px] text-text outline-none transition placeholder:text-muted/60 focus:border-primary focus:ring-4 focus:ring-ring/25";

const isPhoneValid = (p) => String(p || "").replace(/\D/g, "").length >= 9;

// Students must have a grade ("Sinif") + a real phone number. Anyone who signed
// up before this (or via Google, which skips those fields) is asked to fill them
// before they can use the app.
const needsCompletion = (user) =>
  !!user &&
  user.role === "student" &&
  (!isPhoneValid(user.phone) || !String(user.grade || "").trim());

const ProfileCompletionGate = () => {
  const dispatch = useDispatch();
  const isLoggedIn = useSelector(selectIsLoggedIn);
  const user = useSelector(selectUser);

  const [grade, setGrade] = useState("");
  const [phone, setPhone] = useState("+994 ");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    setGrade(user.grade || "");
    setPhone(user.phone && user.phone !== "+994" ? user.phone : "+994 ");
  }, [user]);

  if (!isLoggedIn || !needsCompletion(user)) return null;

  const submit = async (e) => {
    e.preventDefault();
    if (!grade) return toast.error("Sinfi seçin");
    if (!isPhoneValid(phone)) return toast.error("Düzgün telefon nömrəsi yazın");
    setSaving(true);
    try {
      await dispatch(updateUser({ phone: phone.trim(), grade }));
      await dispatch(getUser());
      toast.success("Profil tamamlandı 🎉");
    } catch {
      toast.error("Yadda saxlanmadı, yenidən cəhd edin");
    } finally {
      setSaving(false);
    }
  };

  const onLogout = async () => {
    await dispatch(logout());
    dispatch(RESET());
  };

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="animate-scale-in w-full max-w-md rounded-3xl border border-line bg-surface p-6 shadow-lift sm:p-8">
        <div className="text-center">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-primary/12 text-primary">
            <PiStudentBold className="text-2xl" />
          </span>
          <h2 className="mt-4 font-display text-xl font-bold text-text">Profilini tamamla</h2>
          <p className="mt-1.5 text-sm text-muted">
            Davam etmək üçün sinfini və telefon nömrəni daxil et.
          </p>
        </div>

        <form onSubmit={submit} className="mt-6 flex flex-col gap-4">
          <div className="relative">
            <PiStudentBold className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
            <select
              value={grade}
              onChange={(e) => setGrade(e.target.value)}
              className={`${inputCls} appearance-none pr-9 ${grade ? "" : "text-muted/60"}`}
            >
              <option value="" disabled>
                Sinif seç
              </option>
              {GRADES.map((g) => (
                <option key={g} value={g} className="text-text">
                  {gradeLabel(g)}
                </option>
              ))}
            </select>
            <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-muted">
              ▾
            </span>
          </div>

          <div className="relative">
            <FiPhone className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              type="tel"
              inputMode="tel"
              placeholder="+994 50 123 45 67"
              className={inputCls}
            />
          </div>

          <Button type="submit" size="lg" disabled={saving} className="mt-1 w-full">
            {saving ? <Spinner /> : "Davam et"}
          </Button>
        </form>

        <button
          type="button"
          onClick={onLogout}
          className="mx-auto mt-4 flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-text"
        >
          <FiLogOut /> Çıxış et
        </button>
      </div>
    </div>
  );
};

export default ProfileCompletionGate;
