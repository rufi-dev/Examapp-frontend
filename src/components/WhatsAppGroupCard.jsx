import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import axios from "axios";
import { toast } from "react-toastify";
import { FaWhatsapp } from "react-icons/fa";
import { getUser, selectUser } from "../../redux/features/auth/authSlice";
import Spinner from "./Spinner";

const INVITE_API = `${import.meta.env.VITE_BACKEND_URL}/api/whatsapp/invite`;
const WA = "#25D366";

// Optional "join the exam-notifications WhatsApp group" card for the dashboard.
// Replaces the old mandatory join pop-up: no longer blocks anyone. Hides itself
// once the user has joined (server flag) or when there is no invite link.
const WhatsAppGroupCard = () => {
  const dispatch = useDispatch();
  const user = useSelector(selectUser);
  const [link, setLink] = useState("");
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    axios
      .get(INVITE_API)
      .then((r) => setLink(r?.data && typeof r.data.link === "string" ? r.data.link : ""))
      .catch(() => {});
  }, []);

  if (!link || user?.whatsappGroupJoined) return null;

  const join = async () => {
    window.open(link, "_blank", "noopener");
    setJoining(true);
    try {
      await axios.post(`${import.meta.env.VITE_BACKEND_URL}/api/whatsapp/mark-joined`);
      await dispatch(getUser()); // flips the flag → the card hides
      toast.success("Qrupa qoşuldun ✓");
    } catch {
      toast.error("Alınmadı, yenidən cəhd et.");
    } finally {
      setJoining(false);
    }
  };

  return (
    <div
      className="relative mt-8 overflow-hidden rounded-3xl border p-6 shadow-soft sm:p-7"
      style={{ borderColor: `${WA}55`, background: `linear-gradient(90deg, ${WA}14, ${WA}05)` }}
    >
      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-4">
          <span
            className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl text-2xl text-white shadow-soft"
            style={{ backgroundColor: WA }}
          >
            <FaWhatsapp />
          </span>
          <div>
            <h2 className="font-display text-lg font-bold text-text">İmtahan bildirişləri qrupu</h2>
            <p className="mt-1 max-w-md text-sm text-muted">
              Yeni imtahanlardan WhatsApp-da ilk xəbər tut. Qoşulmaq istəyə bağlıdır.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={join}
          disabled={joining}
          className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl px-5 text-[15px] font-semibold text-white shadow-soft transition hover:brightness-105 disabled:opacity-60"
          style={{ backgroundColor: WA }}
        >
          {joining ? (
            <Spinner />
          ) : (
            <>
              <FaWhatsapp className="text-lg" /> Qrupa qoşul
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default WhatsAppGroupCard;
