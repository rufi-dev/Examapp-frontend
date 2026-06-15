import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";
import { RESET, login, loginWithGoogle } from "../../../redux/features/auth/authSlice";
import { validateEmail } from "../../../redux/features/auth/authService";
import { useGoogleLogin } from "@react-oauth/google";
import { FcGoogle } from "react-icons/fc";
import { FiMail, FiLock, FiEye, FiEyeOff } from "react-icons/fi";
import AuthLayout from "../../components/AuthLayout";
import Button from "../../components/ui/Button";
import Spinner from "../../components/Spinner";

const initialState = { email: "", password: "" };

const inputCls =
  "h-12 w-full rounded-xl border border-line bg-surface pl-11 pr-3.5 text-[15px] text-text outline-none transition placeholder:text-muted/60 focus:border-primary focus:ring-4 focus:ring-ring/25";

const Login = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { isLoading, isLoggedIn, isSuccess, isError } = useSelector((state) => state.auth);

  const [userData, setUserData] = useState(initialState);
  const { email, password } = userData;
  const [showPassword, setShowPassword] = useState(false);

  const handleInputChange = (e) =>
    setUserData({ ...userData, [e.target.name]: e.target.value });

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) return toast.error("Bütün xanaları doldurun");
    if (!validateEmail(email)) return toast.error("Email yanlış formatdadır");
    await dispatch(login({ email, password }));
  };

  useEffect(() => {
    if (isSuccess && isLoggedIn) navigate("/dashboard");
    dispatch(RESET());
  }, [isLoggedIn, isSuccess, isError, email, dispatch, navigate]);

  const handleGoogleSuccess = async (codeResponse) => {
    await dispatch(loginWithGoogle({ code: codeResponse.code }));
  };
  const googleLogin = useGoogleLogin({
    flow: "auth-code",
    onSuccess: handleGoogleSuccess,
    onError: () => toast.error("Google ilə giriş alınmadı"),
  });

  return (
    <AuthLayout
      title="Daxil ol"
      subtitle="Davam etmək üçün hesabına daxil ol."
      footer={
        <span>
          Hesabın yoxdur?{" "}
          <Link to="/register" className="font-semibold text-primary hover:underline">
            Qeydiyyatdan keç
          </Link>
        </span>
      }
    >
      <form onSubmit={handleLogin} className="flex flex-col gap-4">
        <div className="relative">
          <FiMail className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
          <input
            value={email}
            name="email"
            onChange={handleInputChange}
            type="email"
            placeholder="Email"
            className={inputCls}
          />
        </div>

        <div className="relative">
          <FiLock className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
          <input
            value={password}
            name="password"
            onChange={handleInputChange}
            type={showPassword ? "text" : "password"}
            placeholder="Şifrə"
            className={`${inputCls} pr-11`}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted transition-colors hover:text-text"
            aria-label={showPassword ? "Şifrəni gizlət" : "Şifrəni göstər"}
          >
            {showPassword ? <FiEyeOff /> : <FiEye />}
          </button>
        </div>

        <div className="flex justify-end">
          <Link to="/forgot" className="text-sm font-medium text-primary hover:underline">
            Şifrəni unutmusan?
          </Link>
        </div>

        <Button type="submit" size="lg" disabled={isLoading} className="w-full">
          {isLoading ? <Spinner /> : "Daxil ol"}
        </Button>

        {import.meta.env.VITE_GOOGLE_CLIENT_ID && (
          <>
            <div className="relative my-1 flex items-center gap-3 text-xs text-muted">
              <span className="h-px flex-1 bg-line" />
              və ya
              <span className="h-px flex-1 bg-line" />
            </div>
            <button
              type="button"
              onClick={() => googleLogin()}
              className="flex h-12 items-center justify-center gap-2.5 rounded-xl border border-line bg-surface font-medium text-text transition-colors hover:bg-surface2"
            >
              <FcGoogle className="text-[20px]" /> Google ilə daxil ol
            </button>
          </>
        )}
      </form>
    </AuthLayout>
  );
};

export default Login;
