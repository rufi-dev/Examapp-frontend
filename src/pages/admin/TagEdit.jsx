import { useEffect, useState } from "react";
import AccountLayout from "../../components/AccountLayout";
import useRedirectLoggedOutUser from "../../customHook/useRedirectLoggedOutUser";
import { useDispatch, useSelector } from "react-redux";
import { editTag, getTag } from "../../../redux/features/quiz/quizSlice";
import { toast } from "react-toastify";
import { useNavigate, useParams } from "react-router-dom";
import Loader from "../../components/Loader";
import Button from "../../components/ui/Button";
import { Field, inputClass } from "../../components/ui/Field";

const TagEdit = () => {
  useRedirectLoggedOutUser("/login");
  const { singleTag, isLoading } = useSelector((state) => state.quiz);
  const navigate = useNavigate();
  const { tagId } = useParams();
  const [tagForm, setTagForm] = useState({ name: "" });
  const { name } = tagForm;
  const dispatch = useDispatch();

  const handleInputChange = (e) =>
    setTagForm({ ...tagForm, [e.target.name]: e.target.value });

  useEffect(() => {
    if (singleTag) setTagForm({ name: singleTag.name || "" });
  }, [singleTag]);

  useEffect(() => {
    dispatch(getTag(tagId));
  }, [dispatch, tagId]);

  const editTagForm = async (e) => {
    e.preventDefault();
    if (!name) return toast.error("Ad xanasını doldurun");
    const editTagData = await dispatch(editTag({ tagId, tagData: { name } }));
    if (editTagData.type != "quiz/editTag/rejected") navigate(-1);
  };

  if (isLoading) return <Loader />;

  return (
    <AccountLayout title="Kateqoriyanı redaktə et" subtitle="Kateqoriya adını yenilə.">
      <div className="max-w-xl">
        <form
          onSubmit={editTagForm}
          className="rounded-3xl border border-line bg-surface p-6 shadow-soft sm:p-8"
        >
          <Field label="Kateqoriya adı" htmlFor="name">
            <input
              id="name"
              name="name"
              value={name}
              onChange={handleInputChange}
              className={inputClass}
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

export default TagEdit;
