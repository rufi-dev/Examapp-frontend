import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";
import useRedirectLoggedOutUser from "../../customHook/useRedirectLoggedOutUser";
import AccountLayout from "../../components/AccountLayout";
import FormSection from "../../components/ui/FormSection";
import { Field, inputClass, textareaClass } from "../../components/ui/Field";
import Button from "../../components/ui/Button";
import Spinner from "../../components/Spinner";
import { AiFillDelete } from "react-icons/ai";
import {
  getNotifications,
  createNotification,
  deleteNotification,
} from "../../../redux/features/notification/notificationSlice";

const Notifications = () => {
  useRedirectLoggedOutUser("/login");
  const dispatch = useDispatch();
  const { items, isLoading } = useSelector((s) => s.notification);
  const [form, setForm] = useState({ title: "", message: "" });
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.resolve(dispatch(getNotifications())).finally(() => {
      if (active) setLoaded(true);
    });
    return () => {
      active = false;
    };
  }, [dispatch]);

  const send = async (e) => {
    e.preventDefault();
    if (!form.message.trim()) return toast.error("Mesaj boş ola bilməz");
    const res = await dispatch(createNotification(form));
    if (res.type === "notification/create/fulfilled") {
      setForm({ title: "", message: "" });
      dispatch(getNotifications());
    }
  };

  return (
    <AccountLayout title="Bildirişlər" subtitle="Bütün şagirdlərə mesaj göndər.">
      <div className="grid items-start gap-6 lg:grid-cols-2">
        <FormSection title="Yeni bildiriş">
          <form onSubmit={send} className="space-y-4">
            <Field label="Başlıq" htmlFor="title" hint="İxtiyari">
              <input
                id="title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className={inputClass}
                placeholder="Məsələn: İmtahan elanı"
              />
            </Field>
            <Field label="Mesaj" htmlFor="message" required>
              <textarea
                id="message"
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                rows={4}
                className={textareaClass}
                placeholder="Şagirdlərə mesajınız..."
              />
            </Field>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? <Spinner /> : "Göndər"}
            </Button>
          </form>
        </FormSection>

        <FormSection title="Göndərilmiş bildirişlər">
          {!loaded ? (
            <div className="flex justify-center py-8">
              <Spinner size={28} className="text-primary" />
            </div>
          ) : items.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted">Hələ bildiriş yoxdur.</p>
          ) : (
            <div className="space-y-3">
              {items.map((n) => (
                <div key={n._id} className="rounded-xl border border-line bg-surface2/40 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      {n.title && <p className="text-sm font-semibold text-text">{n.title}</p>}
                      <p className="whitespace-pre-line text-sm text-muted">{n.message}</p>
                      <p className="mt-1 text-[11px] text-muted/80">
                        {n.createdBy?.name ? `${n.createdBy.name} · ` : ""}
                        {new Date(n.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => dispatch(deleteNotification(n._id))}
                      className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-muted transition-colors hover:bg-danger/12 hover:text-danger"
                      aria-label="Sil"
                    >
                      <AiFillDelete />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </FormSection>
      </div>
    </AccountLayout>
  );
};

export default Notifications;
