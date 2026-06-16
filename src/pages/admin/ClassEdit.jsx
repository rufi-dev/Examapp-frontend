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
  const [classForm, setClassForm] = useState({ level: "" });
  const { level } = classForm;
  const dispatch = useDispatch();

  const handleInputChange = (e) =>
    setClassForm({ ...classForm, [e.target.name]: e.target.value });

  useEffect(() => {
    dispatch(getClass(classId));
  }, [dispatch, classId]);

  useEffect(() => {
    if (singleClass) setClassForm({ level: singleClass.level ?? "" });
  }, [singleClass]);

  const editClassForm = async (e) => {
    e.preventDefault();
    if (!level) return toast.error("Sinif xanasını doldurun");
    const res = await dispatch(editClass({ classId, classData: { level } }));
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
          <Field label="Sinif" htmlFor="level">
            <input
              id="level"
              name="level"
              value={level}
              onChange={handleInputChange}
              className={inputClass}
              placeholder="Məsələn: 11"
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
