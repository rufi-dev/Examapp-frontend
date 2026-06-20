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

const ClassEdit = () => {
  useRedirectLoggedOutUser("/login");
  const { singleClass, isLoading } = useSelector((state) => state.quiz);
  const navigate = useNavigate();
  const { classId } = useParams();
  const [classForm, setClassForm] = useState({ name: "" });
  const { name } = classForm;
  const dispatch = useDispatch();

  const handleInputChange = (e) =>
    setClassForm({ ...classForm, [e.target.name]: e.target.value });

  useEffect(() => {
    dispatch(getClass(classId));
  }, [dispatch, classId]);

  useEffect(() => {
    if (singleClass)
      setClassForm({
        // Prefill the text name; fall back to the legacy numeric level.
        name: singleClass.name || (singleClass.level != null ? String(singleClass.level) : ""),
      });
  }, [singleClass]);

  const editClassForm = async (e) => {
    e.preventDefault();
    if (!name.trim()) return toast.error("Sinif adını daxil edin");
    const res = await dispatch(editClass({ classId, classData: { name: name.trim() } }));
    if (res.type != "quiz/editClass/rejected") navigate(-1);
  };

  if (isLoading && !singleClass) return <Loader />;

  return (
    <AccountLayout title="Sinfi redaktə et" subtitle="Sinif adını yenilə.">
      <div className="max-w-xl">
        <form
          onSubmit={editClassForm}
          className="rounded-3xl border border-line bg-surface p-6 shadow-soft sm:p-8"
        >
          <Field label="Sinif adı" htmlFor="name">
            <input
              id="name"
              name="name"
              value={name}
              onChange={handleInputChange}
              className={inputClass}
              placeholder="Məsələn: 11-ci sinif"
            />
          </Field>
          <Button type="submit" className="mt-6">
            Yadda saxla
          </Button>
        </form>
      </div>
    </AccountLayout>
  );
};

export default ClassEdit;
