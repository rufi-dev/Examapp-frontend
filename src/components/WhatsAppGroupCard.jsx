import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import axios from "axios";
import { toast } from "react-toastify";
import { FaWhatsapp } from "react-icons/fa";
import { FiCheck } from "react-icons/fi";
import { getUser, selectUser } from "../../redux/features/auth/authSlice";
import Spinner from "./Spinner";

const INVITE_API = `${import.meta.env.VITE_BACKEND_URL}/api/whatsapp/invite`;
const WA = "#25D366";
// Fallback so the card always shows even if the backend hasn't returned a link
// yet (e.g. a local dev backend with no group configured). The server value,
// when present, overrides this.
const FALLBACK_LINK = "https://chat.whatsapp.com/GjCsuwxq5Xe9y2mWvjh3YM";

// Optional "join the exam-notifications WhatsApp group" card for the dashboard.
// Replaces the old mandatory join pop-up: no longer blocks anyone. Hides itself
// once the user has joined (server flag) or when there is no invite link.
const WhatsAppGroupCard = () => {
  const dispatch = useDispatch();
  const user = useSelector(selectUser);
  const [link, setLink] = useState(FALLBACK_LINK);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    axios
      .get(INVITE_API)
      .then((r) => {
        const l = r?.data && typeof r.data.link === "string" ? r.data.link : "";
        if (l) setLink(l); // server value overrides the fallback
      })
      .catch(() => {});
  }, []);

  const joined = !!user?.whatsappGroupJoined;

  const join = async () => {
    window.open(link, "_blank", "noopener");
    if (joined) return; // already recorded — just reopen the group
    setJoining(true);
    try {
      await axios.post(`${import.meta.env.VITE_BACKEND_URL}/api/whatsapp/mark-joined`);
      await dispatch(getUser());
      toast.success("Qrupa qoşuldun ✓");
    } catch {
      toast.error("Alınmadı, yenidən cəhd et.");
    } finally {
      setJoining(false);
    }
  };

  return (
    <div
      className="flex h-full flex-col justify-between gap-3 rounded-2xl border p-4"
      style={{ borderColor: `${WA}55`, background: `linear-gradient(90deg, ${WA}12, ${WA}04)` }}
    >
      <div className="flex items-center gap-2.5">
        <span
          className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-lg text-white"
          style={{ backgroundColor: WA }}
        >
          <FaWhatsapp />
        </span>
        <h2 className="font-display text-[15px] font-bold text-text">Whatsapp sınaq qrupu</h2>
        {joined && (
          <span
            className="ml-auto inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold"
            style={{ backgroundColor: `${WA}22`, color: "#0E8A43" }}
          >
            <FiCheck className="text-[12px]" /> Qoşulmusan
          </span>
        )}
      </div>
      <button
        type="button"
        onClick={join}
        disabled={joining}
        className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold text-white shadow-soft transition hover:brightness-105 disabled:opacity-60"
        style={{ backgroundColor: WA }}
      >
        {joining ? (
          <Spinner />
        ) : (
          <>
            <FaWhatsapp className="text-base" /> Qrupa qoşul
          </>
        )}
      </button>
    </div>
  );
};

export default WhatsAppGroupCard;
