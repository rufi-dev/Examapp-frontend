import { useEffect, useRef } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import { selectIsLoggedIn } from "../../redux/features/auth/authSlice";

// Completes a "join by link" that started while logged out: /join/:code stashed
// the code in localStorage and sent the student to login; once they're logged
// in, this enrolls them and drops them on the categories page. Mounted once at
// the app root so it survives the login navigation.
const PendingJoinHandler = () => {
  const isLoggedIn = useSelector(selectIsLoggedIn);
  const navigate = useNavigate();
  const done = useRef(false);

  useEffect(() => {
    if (!isLoggedIn || done.current) return;
    let code = null;
    try {
      code = localStorage.getItem("pendingJoin");
    } catch {
      /* ignore */
    }
    if (!code) return;
    done.current = true;
    try {
      localStorage.removeItem("pendingJoin");
    } catch {
      /* ignore */
    }
    axios
      .post(`${import.meta.env.VITE_BACKEND_URL}/api/quiz/enroll`, { code })
      .then((res) => {
        toast.success(res.data?.message || "Sinifə qoşuldunuz");
        navigate("/classes", { replace: true });
      })
      .catch((err) => {
        toast.error(err?.response?.data?.message || "Qoşulmaq alınmadı");
      });
  }, [isLoggedIn, navigate]);

  return null;
};

export default PendingJoinHandler;
