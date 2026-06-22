import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import axios from "axios";
import { toast } from "react-toastify";
import { FiPhone, FiLogOut } from "react-icons/fi";
import { PiStudentBold } from "react-icons/pi";
import { FaWhatsapp } from "react-icons/fa";
import {
  selectIsLoggedIn,
  selectUser,
  updateUser,
  getUser,
  logout,
  RESET,
} from "../../redux/features/auth/authSlice";
import { GRADES, gradeLabel } from "../helper/grades";
import Select from "./ui/Select";
import Button from "./ui/Button";
import Spinner from "./Spinner";

const INVITE_API = `${import.meta.env.VITE_BACKEND_URL}/api/whatsapp/invite`;
const WA_GREEN = "#25D366";

const inputCls =
  "h-12 w-full rounded-xl border border-line bg-surface pl-11 pr-3.5 text-[15px] text-text outline-none transition placeholder:text-muted/60 focus:border-primary focus:ring-4 focus:ring-ring/25";

const isPhoneValid = (p) => String(p || "").replace(/\D/g, "").length >= 9;

// EVERYONE needs a real phone; STUDENTS additionally need a grade ("Sinif").
const needsCompletion = (user) => {
  if (!user) return false;
  const noPhone = !isPhoneValid(user.phone);
  const noGrade = user.role === "student" && !String(user.grade || "").trim();
  return noPhone || noGrade;
};

const groupKey = (user) => `wa_grp_${user?._id}`;

const ProfileCompletionGate = () => {
  const dispatch = useDispatch();
  const isLoggedIn = useSelector(selectIsLoggedIn);
  const user = useSelector(selectUser);

  const [grade, setGrade] = useState("");
  const [phone, setPhone] = useState("+994 ");
  const [saving, setSaving] = useState(false);
  const [inviteLink, setInviteLink] = useState("");
  const [step, setStep] = useState(null); // null | "form" | "group"

  // Load the group invite link once (public endpoint).
  useEffect(() => {
    axios
      .get(INVITE_API)
      .then((r) => setInviteLink(r.data?.link || ""))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!user) return;
    setGrade(user.grade || "");
    setPhone(user.phone && user.phone !== "+994" ? user.phone : "+994 ");
  }, [user]);

  // Decide what (if anything) to show: finish the profile first, then a one-time
  // (per device) prompt for students to join the WhatsApp group.
  useEffect(() => {
    if (!isLoggedIn || !user) return setStep(null);
    if (needsCompletion(user)) return setStep("form");
    // Prompt to join the WhatsApp group once (per device) — for any role.
    const needGroup = !!inviteLink && !localStorage.getItem(groupKey(user));
    setStep(needGroup ? "group" : null);
  }, [isLoggedIn, user, inviteLink]);

  if (!step) return null;

  const isStudent = user.role === "student";

  const finishGroup = () => {
    try {
      localStorage.setItem(groupKey(user), "1");
    } catch {
      /* ignore */
    }
    setStep(null);
  };
  const joinGroup = () => {
    window.open(inviteLink, "_blank", "noopener");
    finishGroup();
  };

  const submit = async (e) => {
    e.preventDefault();
    if (isStudent && !grade) return toast.error("Sinfi seçin");
    if (!isPhoneValid(phone)) return toast.error("Düzgün telefon nömrəsi yazın");
    setSaving(true);
    try {
      await dispatch(updateUser({ phone: phone.trim(), ...(isStudent ? { grade } : {}) }));
      await dispatch(getUser());
      toast.success("Profil tamamlandı 🎉");
      // The decide-effect re-runs on the updated user and flips to the group step
      // (students with an invite link) or closes the gate.
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
        {step === "group" ? (
          <div className="text-center">
            <span
              className="mx-auto grid h-14 w-14 place-items-center rounded-2xl"
              style={{ backgroundColor: `${WA_GREEN}1f`, color: WA_GREEN }}
            >
              <FaWhatsapp className="text-2xl" />
            </span>
            <h2 className="mt-4 font-display text-xl font-bold text-text">Demək olar ki, hazırdır!</h2>
            <p className="mt-1.5 text-sm text-muted">
              Yeni imtahan bildirişlərini almaq üçün WhatsApp qrupuna qoşul.
            </p>
            <Button
              type="button"
              onClick={joinGroup}
              size="lg"
              className="mt-6 w-full bg-[#25D366] text-white hover:brightness-105"
            >
              <FaWhatsapp /> WhatsApp qrupuna qoşul
            </Button>
            <button
              type="button"
              onClick={finishGroup}
              className="mx-auto mt-4 block text-sm text-muted transition-colors hover:text-text"
            >
              Keç
            </button>
          </div>
        ) : (
          <>
            <div className="text-center">
              <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-primary/12 text-primary">
                <PiStudentBold className="text-2xl" />
              </span>
              <h2 className="mt-4 font-display text-xl font-bold text-text">Profilini tamamla</h2>
              <p className="mt-1.5 text-sm text-muted">
                {isStudent
                  ? "Davam etmək üçün sinfini və telefon nömrəni daxil et."
                  : "Davam etmək üçün telefon nömrəni daxil et."}
              </p>
            </div>

            <form onSubmit={submit} className="mt-6 flex flex-col gap-4">
              {isStudent && (
                <Select
                  value={grade}
                  onChange={setGrade}
                  options={GRADES.map((g) => ({ value: g, label: gradeLabel(g) }))}
                  placeholder="Sinif seç"
                  icon={<PiStudentBold />}
                />
              )}

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
          </>
        )}
      </div>
    </div>
  );
};

export default ProfileCompletionGate;
