import { useState } from "react";
import AccountLayout from "../../components/AccountLayout";
import useRedirectLoggedOutUser from "../../customHook/useRedirectLoggedOutUser";
import { useDispatch } from "react-redux";
import { addClass } from "../../../redux/features/quiz/quizSlice";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import Button from "../../components/ui/Button";
import { Field, inputClass } from "../../components/ui/Field";
import ToggleSection from "../../components/ui/ToggleSection";
import { FiLock, FiGlobe } from "react-icons/fi";

const ClassAdd = () => {
  useRedirectLoggedOutUser("/login");
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [name, setName] = useState("");
  // OFF by default = public: anyone can see the class until the teacher turns
  // on code-only access.
  const [requireCode, setRequireCode] = useState(false);

  const addClassForm = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      return toast.error("Sinif adını daxil edin");
    }
    const addClassData = await dispatch(
      addClass({ classData: { name: name.trim(), requireCode } })
    );
    if (addClassData.type != "quiz/addClass/rejected") {
      navigate("/classes");
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

          <Button type="submit" size="lg">
            Əlavə et
          </Button>
        </form>
      </div>
    </AccountLayout>
  );
};

export default ClassAdd;
