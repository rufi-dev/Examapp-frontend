import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";
import { validateEmail, validatePassword } from "../../../redux/features/auth/authService";
import {
  RESET,
  register,
  sendVerificationEmail,
  loginWithGoogle,
} from "../../../redux/features/auth/authSlice";
import { useGoogleLogin } from "@react-oauth/google";
import { FcGoogle } from "react-icons/fc";
import { FiUser, FiMail, FiLock, FiEye, FiEyeOff } from "react-icons/fi";
import AuthLayout from "../../components/AuthLayout";
import Button from "../../components/ui/Button";
import Spinner from "../../components/Spinner";

const initialState = { name: "", email: "", password: "" };

// Master switch (mirrors backend EMAIL_ENABLED). While off, skip the
// verification email so no email toast/error appears on sign-up.
const EMAIL_ENABLED = import.meta.env.VITE_EMAIL_ENABLED === "true";

const inputCls =
  "h-12 w-full rounded-xl border border-line bg-surface pl-11 pr-3.5 text-[15px] text-text outline-none transition placeholder:text-muted/60 focus:border-primary focus:ring-4 focus:ring-ring/25";

const Register = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { isLoading, isLoggedIn, isSuccess } = useSelector((state) => state.auth);

  const [userData, setUserData] = useState(initialState);
  const { name, email, password } = userData;
  const [showPassword, setShowPassword] = useState(false);

  const handleInputChange = (e) =>
    setUserData({ ...userData, [e.target.name]: e.target.value });

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!name || !password || !email) return toast.error("Bütün xanaları doldurun!");
    if (!validatePassword(password)) {
      return toast.error("Şifrə ən azı bir rəqəmdən ibarət olmalıdır.");
    }
    if (!validateEmail(email)) return toast.error("Email yanlış formatdadır");

    await dispatch(register({ name, email, password }));
    if (EMAIL_ENABLED) await dispatch(sendVerificationEmail());
  };

  useEffect(() => {
    if (isSuccess && isLoggedIn) navigate("/dashboard");
    dispatch(RESET());
  }, [isLoggedIn, isSuccess, dispatch, navigate]);

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
      title="Qeydiyyatdan keç"
      subtitle="Pulsuz hesab yarat və hazırlaşmağa başla."
      footer={
        <span>
          Hesabın var?{" "}
          <Link to="/login" className="font-semibold text-primary hover:underline">
            Giriş et
          </Link>
        </span>
      }
    >
      <form onSubmit={handleRegister} className="flex flex-col gap-4">
        <div className="relative">
          <FiUser className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
          <input
            name="name"
            value={name}
            onChange={handleInputChange}
            type="text"
            placeholder="Ad Soyad"
            className={inputCls}
          />
        </div>

        <div className="relative">
          <FiMail className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
          <input
            name="email"
            value={email}
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

        <Button type="submit" size="lg" disabled={isLoading} className="mt-1 w-full">
          {isLoading ? <Spinner /> : "Qeydiyyatdan keç"}
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
              <FcGoogle className="text-[20px]" /> Google ilə davam et
            </button>
          </>
        )}
      </form>
    </AuthLayout>
  );
};

export default Register;
