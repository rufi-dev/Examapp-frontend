import { useRef, useState } from "react";
import AccountLayout from "../../components/AccountLayout";
import useRedirectLoggedOutUser from "../../customHook/useRedirectLoggedOutUser";
import { useDispatch } from "react-redux";
import { addClass } from "../../../redux/features/quiz/quizSlice";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import Button from "../../components/ui/Button";
import { Field, inputClass } from "../../components/ui/Field";
import ToggleSection from "../../components/ui/ToggleSection";
import CoverImageField from "../../components/ui/CoverImageField";
import { FiLock, FiGlobe } from "react-icons/fi";

const ClassAdd = () => {
  useRedirectLoggedOutUser("/login");
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [name, setName] = useState("");
  // OFF by default = public: anyone can see the class until the teacher turns
  // on code-only access.
  const [requireCode, setRequireCode] = useState(false);
  const [coverImage, setCoverImage] = useState("");
  const [coverBusy, setCoverBusy] = useState(false); // cover still uploading
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);

  const addClassForm = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      return toast.error("Sinif adını daxil edin");
    }
    // Saving now would create the class WITHOUT its cover (and the teacher would
    // have to upload the picture again).
    if (coverBusy) return toast.info("Üz qabığı şəkli hələ yüklənir — bir az gözləyin.");
    // One class per press: a second tap while the first save is on its way (easy
    // on a slow phone) is ignored instead of creating a second class.
    if (submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    try {
      const addClassData = await dispatch(
        addClass({ classData: { name: name.trim(), requireCode, coverImage } })
      );
      if (addClassData.type != "quiz/addClass/rejected") {
        navigate("/classes");
      }
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  return (
    <AccountLayout title="Sinif əlavə et" subtitle="Yeni sinif yarat.">
      <div className="max-w-xl space-y-5">
        <form onSubmit={addClassForm} className="space-y-5">
          <div className="rounded-3xl border border-line bg-surface p-6 shadow-soft sm:p-8">
            <Field label="Sinif adı" htmlFor="name">
              <input
                id="name"
                name="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={inputClass}
                placeholder="Məsələn: 11-ci sinif"
              />
            </Field>

            <div className="mt-5">
              <CoverImageField value={coverImage} onChange={setCoverImage} onBusyChange={setCoverBusy} />
              <p className="mt-1.5 text-xs text-muted">
                Sinif kartının üz şəkli — şagirdlərin siniflər siyahısında görünəcək.
              </p>
            </div>
          </div>

          <ToggleSection
            icon={FiLock}
            title="Yalnız kodla giriş"
            description="Aktiv olduqda sinif gizli olur — yalnız kodu olanlar görür."
            enabled={requireCode}
            onToggle={setRequireCode}
          >
            <p className="text-sm leading-relaxed text-muted">
              Sinif yalnız sizin paylaşdığınız <span className="font-semibold text-text">sinif
              kodunu</span> daxil edən şagirdlərə görünəcək. Kodu sonradan da dəyişə bilərsiniz.
            </p>
          </ToggleSection>

          {!requireCode && (
            <div className="flex items-start gap-3 rounded-2xl border border-primary/25 bg-primary/8 px-4 py-3 text-sm text-text">
              <FiGlobe className="mt-0.5 shrink-0 text-primary" />
              <span>
                <span className="font-semibold">Açıq sinif</span> — bütün şagirdlər bu sinfi görə
                və imtahanlarını həll edə bilər. Kod tələb olunmur.
              </span>
            </div>
          )}

          <Button type="submit" size="lg" disabled={submitting || coverBusy}>
            {coverBusy ? "Şəkil yüklənir…" : submitting ? "Yaradılır…" : "Əlavə et"}
          </Button>
        </form>
      </div>
    </AccountLayout>
  );
};

export default ClassAdd;
