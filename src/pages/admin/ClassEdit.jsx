import { useEffect, useState } from "react";
import AccountLayout from "../../components/AccountLayout";
import useRedirectLoggedOutUser from "../../customHook/useRedirectLoggedOutUser";
import { useDispatch, useSelector } from "react-redux";
import { editClass, getClass } from "../../../redux/features/quiz/quizSlice";
import { toast } from "react-toastify";
import { useNavigate, useParams } from "react-router-dom";
import Loader from "../../components/Loader";
import Button from "../../components/ui/Button";
import { Field, inputClass } from "../../components/ui/Field";
import ToggleSection from "../../components/ui/ToggleSection";
import ClassRoster from "../../components/ClassRoster";
import { FiLock, FiGlobe, FiCopy, FiRefreshCw } from "react-icons/fi";

const ClassEdit = () => {
  useRedirectLoggedOutUser("/login");
  const { singleClass, isLoading } = useSelector((state) => state.quiz);
  const navigate = useNavigate();
  const { classId } = useParams();
  const [name, setName] = useState("");
  // Reflect the class's CURRENT visibility. Existing classes (requireCode
  // absent) are code-only today, so anything other than an explicit `false`
  // shows the toggle ON. Saving then normalises it to an explicit boolean.
  const [requireCode, setRequireCode] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(getClass(classId));
  }, [dispatch, classId]);

  useEffect(() => {
    if (singleClass) {
      setName(singleClass.name || (singleClass.level != null ? String(singleClass.level) : ""));
      setRequireCode(singleClass.requireCode !== false);
    }
  }, [singleClass]);

  const joinCode = singleClass?.joinCode;

  const copy = (text, label) => {
    if (!text) return;
    navigator.clipboard?.writeText(text);
    toast.success(`${label} kopyalandı`);
  };

  const editClassForm = async (e) => {
    e.preventDefault();
    if (!name.trim()) return toast.error("Sinif adını daxil edin");
    const res = await dispatch(
      editClass({ classId, classData: { name: name.trim(), requireCode } })
    );
    if (res.type != "quiz/editClass/rejected") navigate(-1);
  };

  const regenerate = async () => {
    setRegenerating(true);
    const res = await dispatch(
      editClass({ classId, classData: { name: name.trim() || "Sinif", requireCode, regenerateCode: true } })
    );
    if (res.type != "quiz/editClass/rejected") {
      await dispatch(getClass(classId)); // pull the freshly rotated code
      toast.success("Yeni kod yaradıldı");
    }
    setRegenerating(false);
  };

  if (isLoading && !singleClass) return <Loader />;

  return (
    <AccountLayout
      title="Sinfi redaktə et"
      subtitle="Sinif adını, girişini və tələbələrini bir yerdən idarə et."
    >
      <div className="grid items-start gap-6 lg:grid-cols-2">
        {/* Left column — class settings (name + visibility), saved together. */}
        <form onSubmit={editClassForm} className="space-y-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">
            Sinif parametrləri
          </p>

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
              Sinif yalnız sağdakı <span className="font-semibold text-text">sinif kodunu</span>{" "}
              daxil edən şagirdlərə görünür. Kodu istənilən vaxt yeniləyə bilərsiniz.
            </p>
          </ToggleSection>

          <Button type="submit" size="lg" className="w-full sm:w-auto">
            Yadda saxla
          </Button>
        </form>

        {/* Right column — adapts to visibility:
            code-only → join code + student roster;
            public   → an "open class" info card (no code, no roster needed). */}
        <div className="space-y-5">
          {requireCode ? (
            <>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted">
                Giriş və tələbələr
              </p>

              {joinCode && (
                <div className="rounded-3xl border border-line bg-surface p-6 shadow-soft sm:p-8">
                  <p className="text-sm font-semibold text-text">Sinif kodu</p>
                  <p className="mt-1 text-sm text-muted">
                    Şagirdlər bu kodla sinfə qoşulur. Kodu yeniləsəniz, köhnə kod işləməyəcək.
                  </p>
                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <span className="rounded-xl border border-line bg-surface2 px-4 py-2.5 text-lg font-bold uppercase tracking-[0.3em] text-text">
                      {joinCode}
                    </span>
                    <Button type="button" variant="secondary" size="sm" onClick={() => copy(joinCode, "Kod")}>
                      <FiCopy /> Kopyala
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={regenerate}
                      disabled={regenerating}
                    >
                      <FiRefreshCw className={regenerating ? "animate-spin" : ""} /> Yenilə
                    </Button>
                  </div>
                </div>
              )}

              {/* Roster only matters for code-only classes (managed members). */}
              {singleClass?._id && (
                <ClassRoster embedded classObj={singleClass} label="Tələbələr" />
              )}
            </>
          ) : (
            <>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted">
                Sinif növü
              </p>
              <div className="rounded-3xl border border-line bg-surface p-6 shadow-soft sm:p-8">
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-primary/12 text-primary">
                  <FiGlobe className="text-[22px]" />
                </span>
                <h2 className="mt-4 font-display text-lg font-bold text-text">Açıq sinif</h2>
                <p className="mt-2 text-sm leading-relaxed text-muted">
                  Bu sinif açıqdır — bütün şagirdlər onu{" "}
                  <span className="font-semibold text-text">Siniflər</span> siyahısında görür və
                  imtahanlarını həll edə bilər. Kod və ya qoşulma tələb olunmur, ona görə də ayrıca
                  tələbə idarəetməsi yoxdur.
                </p>
                <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-line bg-surface2/40 px-4 py-3 text-sm text-muted">
                  <FiLock className="mt-0.5 shrink-0 text-primary" />
                  <span>
                    Sinfi yalnız müəyyən şagirdlərə vermək istəyirsinizsə,{" "}
                    <span className="font-semibold text-text">Yalnız kodla giriş</span>-i aktiv edin —
                    sinif kodu və tələbə siyahısı burada görünəcək.
                  </span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </AccountLayout>
  );
};

export default ClassEdit;
