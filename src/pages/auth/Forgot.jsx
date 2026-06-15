import { useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import { useDispatch, useSelector } from "react-redux";
import { RESET, forgotPassword } from "../../../redux/features/auth/authSlice";
import { validateEmail } from "../../../redux/features/auth/authService";
import { FiMail } from "react-icons/fi";
import AuthLayout from "../../components/AuthLayout";
import Button from "../../components/ui/Button";
import Spinner from "../../components/Spinner";

const inputCls =
  "h-12 w-full rounded-xl border border-line bg-surface pl-11 pr-3.5 text-[15px] text-text outline-none transition placeholder:text-muted/60 focus:border-primary focus:ring-4 focus:ring-ring/25";

const Forgot = () => {
  const [email, setEmail] = useState("");
  const dispatch = useDispatch();
  const { isLoading } = useSelector((state) => state.auth);

  const handleForgot = async (e) => {
    e.preventDefault();
    if (!email) return toast.error("Email daxil edin");
    if (!validateEmail(email)) return toast.error("Email yanlış formatdadır");
    await dispatch(forgotPassword({ email }));
    await dispatch(RESET());
  };

  return (
    <AuthLayout
      title="Şifrəni unutmusan?"
      subtitle="Email ünvanını daxil et, şifrə sıfırlama linki göndərək."
      footer={
        <span>
          Yadına düşdü?{" "}
          <Link to="/login" className="font-semibold text-primary hover:underline">
            Giriş et
          </Link>
        </span>
      }
    >
      <form onSubmit={handleForgot} className="flex flex-col gap-4">
        <div className="relative">
          <FiMail className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
          <input
            value={email}
            name="email"
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            placeholder="Email"
            className={inputCls}
          />
        </div>
        <Button type="submit" size="lg" disabled={isLoading} className="w-full">
          {isLoading ? <Spinner /> : "Sıfırlama linki göndər"}
        </Button>
      </form>
    </AuthLayout>
  );
};

export default Forgot;
