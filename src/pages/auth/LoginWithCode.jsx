import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";
import { RESET, loginWithCode, sendLoginCode } from "../../../redux/features/auth/authSlice";
import { FiUnlock } from "react-icons/fi";
import AuthLayout from "../../components/AuthLayout";
import Button from "../../components/ui/Button";
import Spinner from "../../components/Spinner";

const LoginWithCode = () => {
  const [loginCode, setLoginCode] = useState("");
  const { email } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { isLoading, isLoggedIn, isSuccess } = useSelector((state) => state.auth);

  const sendUserLoginCode = async () => {
    await dispatch(sendLoginCode(email));
    await dispatch(RESET());
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!loginCode) return toast.error("Giriş kodunu daxil edin");
    if (loginCode.length != 6) return toast.error("Kod 6 simvol olmalıdır");
    await dispatch(loginWithCode({ code: { loginCode }, email }));
  };

  useEffect(() => {
    if (isSuccess && isLoggedIn) navigate("/profile");
    dispatch(RESET());
  }, [isLoggedIn, isSuccess, dispatch, navigate]);

  return (
    <AuthLayout
      title="Giriş kodu"
      subtitle="Email-inə göndərilən 6 rəqəmli kodu daxil et."
      footer={
        <button
          onClick={sendUserLoginCode}
          className="font-semibold text-primary hover:underline"
        >
          Kodu yenidən göndər
        </button>
      }
    >
      <form onSubmit={handleLogin} className="flex flex-col gap-4">
        <div className="relative">
          <FiUnlock className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
          <input
            value={loginCode}
            name="loginCode"
            onChange={(e) => setLoginCode(e.target.value)}
            type="text"
            placeholder="Giriş kodu"
            className="h-12 w-full rounded-xl border border-line bg-surface pl-11 pr-3.5 text-[15px] tracking-[0.3em] text-text outline-none transition placeholder:tracking-normal placeholder:text-muted/60 focus:border-primary focus:ring-4 focus:ring-ring/25"
          />
        </div>
        <Button type="submit" size="lg" disabled={isLoading} className="w-full">
          {isLoading ? <Spinner /> : "Giriş et"}
        </Button>
      </form>
    </AuthLayout>
  );
};

export default LoginWithCode;
