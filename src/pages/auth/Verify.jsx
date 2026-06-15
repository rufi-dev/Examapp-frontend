import { useDispatch } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";
import { verifyUser } from "../../../redux/features/auth/authSlice";
import { FiCheckCircle } from "react-icons/fi";
import AuthLayout from "../../components/AuthLayout";
import Button from "../../components/ui/Button";

const Verify = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { verificationToken } = useParams();

  const verifyAccount = async () => {
    await dispatch(verifyUser(verificationToken));
    navigate("/profile");
  };

  return (
    <AuthLayout title="Xoş gəldin!" subtitle="Davam etmək üçün hesabını təsdiqlə.">
      <div className="flex flex-col gap-6">
        <p className="leading-relaxed text-muted">
          Səni aramızda görməyə şadıq. Başlamaq üçün hesabını təsdiqlə, sonra bütün
          imtahanlara çıxış əldə edəcəksən. Aşağıdakı düyməyə bas.
        </p>
        <Button onClick={verifyAccount} size="lg" className="w-full sm:w-auto">
          <FiCheckCircle /> Hesabı təsdiqlə
        </Button>
      </div>
    </AuthLayout>
  );
};

export default Verify;
