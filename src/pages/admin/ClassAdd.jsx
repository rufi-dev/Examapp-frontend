import { useState } from "react";
import AccountLayout from "../../components/AccountLayout";
import useRedirectLoggedOutUser from "../../customHook/useRedirectLoggedOutUser";
import { useDispatch } from "react-redux";
import { addClass } from "../../../redux/features/quiz/quizSlice";
import { toast } from "react-toastify";
import { useNavigate, useParams } from "react-router-dom";
import Button from "../../components/ui/Button";
import { Field, inputClass } from "../../components/ui/Field";

const ClassAdd = () => {
  useRedirectLoggedOutUser("/login");
  const navigate = useNavigate();
  const { tagId } = useParams();
  const dispatch = useDispatch();
  const [classForm, setClassForm] = useState({ name: "" });
  const { name } = classForm;

  const handleInputChange = (e) =>
    setClassForm({ ...classForm, [e.target.name]: e.target.value });

  const addClassForm = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      return toast.error("Sinif adını daxil edin");
    }
    const addClassData = await dispatch(addClass({ classData: { name: name.trim() }, tagId }));
    if (addClassData.type != "quiz/addClass/rejected") {
      navigate("/class/" + tagId);
    }
  };

  return (
    <AccountLayout title="Sinif əlavə et" subtitle="Bu kateqoriyaya yeni sinif əlavə et.">
      <div className="max-w-xl">
        <form
          onSubmit={addClassForm}
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
            Əlavə et
          </Button>
        </form>
      </div>
    </AccountLayout>
  );
};

export default ClassAdd;
