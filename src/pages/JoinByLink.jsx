import { useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import axios from "axios";
import { toast } from "react-toastify";
import Spinner from "../components/Spinner";
import { selectIsLoggedIn } from "../../redux/features/auth/authSlice";

// Shareable join link target. A logged-in student is enrolled immediately and
// sent to the categories page; a logged-out student has the code stashed and is
// sent to login — PendingJoinHandler finishes the join after they sign in.
const JoinByLink = () => {
  const { code } = useParams();
  const isLoggedIn = useSelector(selectIsLoggedIn);
  const navigate = useNavigate();
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    const c = String(code || "").trim().toUpperCase();
    if (!c) {
      navigate("/classes", { replace: true });
      return;
    }

    if (isLoggedIn) {
      axios
        .post(`${import.meta.env.VITE_BACKEND_URL}/api/quiz/enroll`, { code: c })
        .then((res) => toast.success(res.data?.message || "Sinifə qoşuldunuz"))
        .catch((err) => toast.error(err?.response?.data?.message || "Qoşulmaq alınmadı"))
        .finally(() => navigate("/classes", { replace: true }));
    } else {
      try {
        localStorage.setItem("pendingJoin", c);
      } catch {
        /* ignore */
      }
      toast.info("Sinifə qoşulmaq üçün daxil olun və ya qeydiyyatdan keçin");
      navigate("/login", { replace: true });
    }
  }, [code, isLoggedIn, navigate]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-bg p-6 text-center">
      <Spinner size={44} className="text-primary" />
      <p className="text-sm font-medium text-muted">Sinifə qoşulursunuz...</p>
    </div>
  );
};

export default JoinByLink;
