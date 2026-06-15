import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { BsEye, BsEyeSlash } from "react-icons/bs";
import { FiLock, FiCheck, FiX } from "react-icons/fi";
import { useDispatch, useSelector } from "react-redux";
import Spinner from "../../components/Spinner";
import { RESET, resetPassword } from "../../../redux/features/auth/authSlice";
import { validatePassword } from "../../../redux/features/auth/authService";
import { toast } from "react-toastify";
import AuthLayout from "../../components/AuthLayout";
import Button from "../../components/ui/Button";

const initialState = { password: "", password2: "" };

const Req = ({ ok, children }) => (
  <li className={`flex items-center gap-2 ${ok ? "text-success" : "text-muted"}`}>
    <span
      className={`grid h-4 w-4 place-items-center rounded-full ${ok ? "bg-success/15" : "bg-surface2"}`}
    >
      {ok ? <FiCheck className="text-[11px]" /> : <FiX className="text-[11px]" />}
    </span>
    {children}
  </li>
);

const Reset = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { resetToken } = useParams();

  const [formData, setFormData] = useState(initialState);
  const { password, password2 } = formData;
  const [showPassword, setShowPassword] = useState(false);

  const [uCase, setUcase] = useState(false);
  const [num, setNum] = useState(false);
  const [sChar, setSChar] = useState(false);
  const [passLength, setPassLength] = useState(false);

  const { isLoading, message, isSuccess } = useSelector((state) => state.auth);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  useEffect(() => {
    setUcase(/^(?=.*[a-z])(?=.*[A-Z]).*$/.test(password));
    setNum(/([0-9])/.test(password));
    setSChar(/([!@#$%^&*.?,<>/])/.test(password));
    setPassLength(password.length > 5);
  }, [password]);

  const handleReset = async (e) => {
    e.preventDefault();
    if (!password || !password2) return toast.error("Bütün xanaları doldurun");
    if (!validatePassword(password)) return toast.error("Aşağıdakı tələblərə əməl edin");
    if (password != password2) return toast.error("Şifrələr uyğun gəlmir");
    await dispatch(resetPassword({ userData: { password }, resetToken }));
  };

  useEffect(() => {
    if (isSuccess && message.includes("reset successful")) {
      navigate("/login");
    }
    dispatch(RESET());
  }, [isSuccess, dispatch, navigate, message]);

  const pwInput = (nameKey, placeholder) => (
    <div className="relative">
      <FiLock className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
      <input
        value={formData[nameKey]}
        name={nameKey}
        onChange={handleInputChange}
        type={showPassword ? "text" : "password"}
        placeholder={placeholder}
        className="h-12 w-full rounded-xl border border-line bg-surface pl-11 pr-11 text-[15px] text-text outline-none transition placeholder:text-muted/60 focus:border-primary focus:ring-4 focus:ring-ring/25"
      />
      <button
        type="button"
        onClick={() => setShowPassword(!showPassword)}
        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted hover:text-text"
        aria-label="Şifrəni göstər"
      >
        {showPassword ? <BsEyeSlash /> : <BsEye />}
      </button>
    </div>
  );

  return (
    <AuthLayout
      title="Şifrəni sıfırla"
      subtitle="Yeni şifrəni təyin et."
      footer={
        <span>
          <Link to="/login" className="font-semibold text-primary hover:underline">
            Girişə qayıt
          </Link>
        </span>
      }
    >
      <form onSubmit={handleReset} className="flex flex-col gap-4">
        {pwInput("password", "Yeni şifrə")}
        <ul className="grid gap-2.5 rounded-xl border border-line bg-surface2/40 p-4 text-sm sm:grid-cols-2">
          <Req ok={uCase}>Böyük və kiçik hərf</Req>
          <Req ok={num}>Rəqəm (0-9)</Req>
          <Req ok={sChar}>Xüsusi simvol (!@#$%)</Req>
          <Req ok={passLength}>Ən azı 6 simvol</Req>
        </ul>
        {pwInput("password2", "Şifrəni təsdiqlə")}
        <Button type="submit" size="lg" disabled={isLoading} className="w-full">
          {isLoading ? <Spinner /> : "Şifrəni sıfırla"}
        </Button>
      </form>
    </AuthLayout>
  );
};

export default Reset;
