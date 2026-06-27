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

const pickInviteLink = (data) => {
  if (!data || typeof data !== "object" || Array.isArray(data)) return "";
  return typeof data.link === "string" ? data.link : "";
};

// EVERYONE needs a real phone; STUDENTS additionally need a grade ("Sinif").
const needsCompletion = (user) => {
  if (!user) return false;
  const noPhone = !isPhoneValid(user.phone);
  const noGrade = user.role === "student" && !String(user.grade || "").trim();
  return noPhone || noGrade;
};

const ProfileCompletionGate = () => {
  const dispatch = useDispatch();
  const isLoggedIn = useSelector(selectIsLoggedIn);
  const user = useSelector(selectUser);

  const [grade, setGrade] = useState("");
  const [phone, setPhone] = useState("+994 ");
  const [saving, setSaving] = useState(false);
  const [inviteLink, setInviteLink] = useState("");
  const [checking, setChecking] = useState(false);
  const [joinClicked, setJoinClicked] = useState(false);
  const [step, setStep] = useState(null); // null | "form" | "group"

  // Load the group invite link (public endpoint).
  useEffect(() => {
    axios
      .get(INVITE_API)
      .then((r) => setInviteLink(pickInviteLink(r.data)))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!user) return;
    setGrade(user.grade || "");
    setPhone(user.phone && user.phone !== "+994" ? user.phone : "+994 ");
  }, [user]);

  // Decide what (if anything) to show: finish the profile first, then — for
  // STUDENTS only — MANDATORY WhatsApp group join. Once the account is verified
  // joined (server flag), it never shows again.
  useEffect(() => {
    if (!isLoggedIn || !user) return setStep(null);
    if (needsCompletion(user)) return setStep("form");
    const isStudent = user.role === "student";
    const needGroup = isStudent && !!inviteLink && !user.whatsappGroupJoined;
    setStep(needGroup ? "group" : null);
  }, [isLoggedIn, user, inviteLink]);

  // Verify membership: confirm the student's registered phone is in the group.
  const checkJoined = async () => {
    setChecking(true);
    try {
      const { data } = await axios.get(
        `${import.meta.env.VITE_BACKEND_URL}/api/whatsapp/check-join`
      );
      if (data?.joined) {
        await dispatch(getUser()); // refreshes the flag → the gate closes
        toast.success("Qrupa qoşulmusan ✓");
      } else if (data && (data.ready === false || data.configured === false)) {
        // Bot offline / no group set → we can't verify; don't trap the student.
        toast.info("WhatsApp yoxlaması hazırda mümkün deyil — davam edə bilərsən.");
        setStep(null);
      } else {
        toast.error(
          `Qrupda tapılmadın. Qeydiyyatdakı nömrə (${user?.phone}) ilə qoşul və yenidən yoxla.`
        );
      }
    } catch {
      toast.error("Yoxlama alınmadı, yenidən cəhd et.");
    } finally {
      setChecking(false);
    }
  };

  // When the student returns from the WhatsApp tab, auto-verify once.
  useEffect(() => {
    if (step !== "group" || !joinClicked) return;
    const onFocus = () => checkJoined();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, joinClicked]);

  // `user` can flip to null (logout / session expiry) before the decide-effect
  // clears `step` — guard so we never read user.role off null.
  if (!step || !user) return null;

  const isStudent = user.role === "student";

  const joinGroup = () => {
    setJoinClicked(true);
    window.open(inviteLink, "_blank", "noopener");
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
            <h2 className="mt-4 font-display text-xl font-bold text-text">WhatsApp qrupuna qoşul</h2>
            <p className="mt-1.5 text-sm text-muted">
              Davam etmək üçün imtahan bildirişləri qrupuna qoşulmaq mütləqdir.
            </p>

            <div className="mt-4 rounded-xl border border-line bg-surface2/40 px-4 py-3 text-left text-xs text-muted">
              <p>
                1. <span className="font-semibold text-text">Qrupa qoşul</span> düyməsini bas və WhatsApp-da qrupa qoşul.
              </p>
              <p className="mt-1">
                2. Geri qayıt və <span className="font-semibold text-text">Qoşulduğumu yoxla</span>ya bas.
              </p>
              <p className="mt-1.5">
                ⚠️ Qeydiyyatdakı nömrə ilə qoşul:{" "}
                <span className="font-semibold text-text">{user?.phone}</span>
              </p>
            </div>

            <Button
              type="button"
              onClick={joinGroup}
              size="lg"
              className="mt-4 w-full bg-[#25D366] text-white hover:brightness-105"
            >
              <FaWhatsapp /> Qrupa qoşul
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={checkJoined}
              size="lg"
              disabled={checking}
              className="mt-3 w-full"
            >
              {checking ? <Spinner /> : "Qoşulduğumu yoxla"}
            </Button>

            <div className="mt-4 flex items-center justify-center gap-4 text-sm">
              {/* Wrong number? jump back to the phone form to fix it. */}
              <button
                type="button"
                onClick={() => setStep("form")}
                className="font-semibold text-primary transition-colors hover:underline"
              >
                Nömrəni dəyiş
              </button>
              <span className="text-line">·</span>
              <button
                type="button"
                onClick={onLogout}
                className="flex items-center gap-1.5 text-muted transition-colors hover:text-text"
              >
                <FiLogOut /> Çıxış et
              </button>
            </div>
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
