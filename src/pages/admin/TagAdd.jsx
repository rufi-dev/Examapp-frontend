import { useState } from "react";
import AccountLayout from "../../components/AccountLayout";
import useRedirectLoggedOutUser from "../../customHook/useRedirectLoggedOutUser";
import { useDispatch } from "react-redux";
import { addTag } from "../../../redux/features/quiz/quizSlice";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import Button from "../../components/ui/Button";
import { Field, inputClass } from "../../components/ui/Field";

const TagAdd = () => {
  useRedirectLoggedOutUser("/login");
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [tagForm, setTagForm] = useState({ name: "" });
  const { name } = tagForm;

  const handleInputChange = (e) =>
    setTagForm({ ...tagForm, [e.target.name]: e.target.value });

  const addTagForm = async (e) => {
    e.preventDefault();
    if (!name) {
      return toast.error("Ad xanasını doldurun");
    }
    const addTagData = await dispatch(addTag({ name }));
    if (addTagData.type != "quiz/addTag/rejected") {
      navigate("/tags");
    }
  };

  return (
    <AccountLayout title="İmtahan kateqoriyası" subtitle="Yeni kateqoriya (tag) əlavə et.">
      <div className="max-w-xl">
        <form
          onSubmit={addTagForm}
          className="rounded-3xl border border-line bg-surface p-6 shadow-soft sm:p-8"
        >
          <Field label="Kateqoriya adı" htmlFor="name">
            <input
              id="name"
              name="name"
              value={name}
              onChange={handleInputChange}
              className={inputClass}
              placeholder="Məsələn: Buraxılış"
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

export default TagAdd;
