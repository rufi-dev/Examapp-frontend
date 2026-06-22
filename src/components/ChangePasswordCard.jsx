import { useEffect, useState } from "react";
import { BsEye, BsEyeSlash } from "react-icons/bs";
import { FiCheck, FiX } from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { RESET, changePassword, logout } from "../../redux/features/auth/authSlice";
import { validatePassword } from "../../redux/features/auth/authService";
import { toast } from "react-toastify";
import Spinner from "./Spinner";
import { sendAutomatedEmail } from "../../redux/features/mail/emailSlice";
import Button from "./ui/Button";
import { Field } from "./ui/Field";

const initialState = {
  oldPassword: "",
  password: "",
  password2: "",
};

const Req = ({ ok, children }) => (
  <li className={`flex items-center gap-2 ${ok ? "text-success" : "text-muted"}`}>
    <span
      className={`grid h-4 w-4 place-items-center rounded-full ${
        ok ? "bg-success/15" : "bg-surface2"
      }`}
    >
      {ok ? <FiCheck className="text-[11px]" /> : <FiX className="text-[11px]" />}
    </span>
    {children}
  </li>
);

// Password change as an embedded section of the profile page (no separate tab).
// On success the user is logged out and sent to /login — a fresh sign-in with
// the new password.
const ChangePasswordCard = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [formData, setFormData] = useState(initialState);
  const { oldPassword, password, password2 } = formData;
  const { isLoading, user } = useSelector((state) => state.auth);

  const [uCase, setUcase] = useState(false);
  const [num, setNum] = useState(false);
  const [sChar, setSChar] = useState(false);
  const [passLength, setPassLength] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const updatePassword = async (e) => {
    e.preventDefault();
    if (!oldPassword || !password || !password2) {
      return toast.error("Bütün xanaları doldurun");
    }
    if (!validatePassword(password)) {
      return toast.error("Aşağıdakı tələblərə əməl edin");
    }
    if (password != password2) {
      return toast.error("Şifrələr uyğun gəlmir");
    }
    const userData = { oldPassword, password };
    const emailData = {
      subject: "Password changed - MATH",
      send_to: user.email,
      reply_to: "noreply@rufi.com",
      template: "changePassword",
      url: "/forgot",
    };

    const changePasswordResult = await dispatch(changePassword(userData));
    if (changePasswordResult.type != "auth/changePassword/rejected") {
      await dispatch(sendAutomatedEmail(emailData));
      await dispatch(logout());
      await dispatch(RESET());
      navigate("/login");
    }
  };

  useEffect(() => {
    setUcase(/^(?=.*[a-z])(?=.*[A-Z]).*$/.test(password));
    setNum(/([0-9])/.test(password));
    setSChar(/([!@#$%^&*.?,<>/])/.test(password));
    setPassLength(password.length > 5);
  }, [password]);

  const pwInput = (nameKey, placeholder) => (
    <div className="flex items-center gap-2 rounded-xl border border-line bg-surface px-3.5 transition focus-within:border-primary focus-within:ring-4 focus-within:ring-ring/25">
      <input
        value={formData[nameKey]}
        name={nameKey}
        onChange={handleInputChange}
        type={showPassword ? "text" : "password"}
        placeholder={placeholder}
        className="h-11 w-full bg-transparent text-[15px] text-text outline-none placeholder:text-muted/60"
      />
      <button
        type="button"
        onClick={() => setShowPassword(!showPassword)}
        className="text-muted transition-colors hover:text-text"
        aria-label={showPassword ? "Şifrəni gizlət" : "Şifrəni göstər"}
      >
        {showPassword ? <BsEyeSlash /> : <BsEye />}
      </button>
    </div>
  );

  return (
    <div className="mt-6 rounded-3xl border border-line bg-surface p-6 shadow-soft sm:p-8">
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <div>
          <h2 className="font-display text-lg font-bold text-text">Şifrəni dəyiş</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            Təhlükəsizlik üçün güclü bir şifrə seçin. Şifrəni dəyişdikdən sonra yenidən daxil
            olmanız tələb olunacaq.
          </p>
        </div>
        <form onSubmit={updatePassword} className="flex flex-col gap-5">
          <Field label="Cari şifrə">{pwInput("oldPassword", "Cari şifrə")}</Field>
          <Field label="Yeni şifrə">{pwInput("password", "Yeni şifrə")}</Field>

          <ul className="grid gap-2.5 rounded-xl border border-line bg-surface2/40 p-4 text-sm sm:grid-cols-2">
            <Req ok={uCase}>Böyük və kiçik hərf</Req>
            <Req ok={num}>Rəqəm (0-9)</Req>
            <Req ok={sChar}>Xüsusi simvol (!@#$%)</Req>
            <Req ok={passLength}>Ən azı 6 simvol</Req>
          </ul>

          <Field label="Yeni şifrəni təsdiqlə">{pwInput("password2", "Yeni şifrəni təsdiqlə")}</Field>

          <Button type="submit" disabled={isLoading} className="w-full sm:w-auto">
            {isLoading ? <Spinner /> : "Şifrəni dəyiş"}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default ChangePasswordCard;
