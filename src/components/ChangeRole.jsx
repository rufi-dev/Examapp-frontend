import { useState } from "react";
import { BsCheck2 } from "react-icons/bs";
import { useDispatch } from "react-redux";
import { toast } from "react-toastify";
import { getUsers, upgradeUser } from "../../redux/features/auth/authSlice";
import { EMAIL_RESET, sendAutomatedEmail } from "../../redux/features/mail/emailSlice";

const ChangeRole = ({ _id, email }) => {
  const dispatch = useDispatch();
  const [userRole, setUserRole] = useState("");

  const changeRole = async (e) => {
    e.preventDefault();
    if (!userRole) {
      return toast.error("Zəhmət olmasa rol seçin");
    }
    const userData = { role: userRole, id: _id };
    const emailData = {
      subject: "Account Role Changed - MATH",
      send_to: email,
      reply_to: "noreply@rufi.com",
      template: "changeRole",
      url: "/login",
    };

    const updateUser = await dispatch(upgradeUser(userData));
    if (updateUser.type != "auth/upgradeUser/rejected") {
      await dispatch(sendAutomatedEmail(emailData));
      await dispatch(getUsers());
      await dispatch(EMAIL_RESET());
    }
  };

  return (
    <form onSubmit={changeRole} className="flex items-center gap-2">
      <select
        value={userRole}
        onChange={(e) => setUserRole(e.target.value)}
        name="role"
        className="h-9 rounded-lg border border-line bg-surface px-2 text-sm text-text outline-none transition focus:border-primary focus:ring-4 focus:ring-ring/20"
      >
        <option value="">Rol seç</option>
        <option value="admin">Admin</option>
        <option value="teacher">Müəllim</option>
        <option value="student">Tələbə</option>
        <option value="suspended">Bloklanıb</option>
      </select>
      <button
        type="submit"
        aria-label="Rolu təsdiqlə"
        className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary text-primary-fg transition-colors hover:bg-primary-hover"
      >
        <BsCheck2 />
      </button>
    </form>
  );
};

export default ChangeRole;
