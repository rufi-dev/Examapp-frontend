import { useSelector } from "react-redux";
import { FiLink2 } from "react-icons/fi";
import AccountLayout from "../components/AccountLayout";
import TelegramNotifications from "../components/TelegramNotifications";
import WhatsAppNotifications from "../components/WhatsAppNotifications";
import { selectUser } from "../../redux/features/auth/authSlice";

// Dedicated home for the notification integrations (Telegram + WhatsApp),
// moved out of Profil so each lives in its own clearly-labelled place.
const Connections = () => {
  const user = useSelector(selectUser);
  const isStaff = user?.role === "teacher" || user?.role === "admin";

  return (
    <AccountLayout
      title="Bağlantılar"
      subtitle="Telegram və WhatsApp bildiriş kanallarını buradan qoş və idarə et."
    >
      {isStaff ? (
        <div className="space-y-5">
          <TelegramNotifications />
          <WhatsAppNotifications />
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-line bg-surface p-12 text-center">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary">
            <FiLink2 className="text-xl" />
          </span>
          <p className="text-sm text-muted">
            Bu bölmə yalnız müəllim və adminlər üçündür.
          </p>
        </div>
      )}
    </AccountLayout>
  );
};

export default Connections;
