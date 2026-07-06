import { useEffect, useState } from "react";
import axios from "axios";
import { useSelector } from "react-redux";
import { toast } from "react-toastify";
import { FiPlus, FiPlay, FiTrash2, FiX, FiVideo } from "react-icons/fi";
import { selectUser } from "../../redux/features/auth/authSlice";
import useRedirectLoggedOutUser from "../customHook/useRedirectLoggedOutUser";
import AccountLayout from "../components/AccountLayout";
import Button from "../components/ui/Button";
import Spinner from "../components/Spinner";

const API = `${import.meta.env.VITE_BACKEND_URL}/api/videos`;
const thumb = (id) => `https://img.youtube.com/vi/${id}/hqdefault.jpg`;

const VideoLessons = () => {
  useRedirectLoggedOutUser("/login");
  const user = useSelector(selectUser);
  const canManage = user?.role === "admin" || user?.role === "teacher";

  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [playing, setPlaying] = useState(null); // the video being watched
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({ title: "", url: "" });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const { data } = await axios.get(API);
      setVideos(Array.isArray(data) ? data : []);
    } catch {
      /* ignore — empty state covers it */
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return toast.error("Başlıq daxil edin");
    if (!form.url.trim()) return toast.error("YouTube linki daxil edin");
    setSaving(true);
    try {
      const { data } = await axios.post(API, {
        title: form.title.trim(),
        url: form.url.trim(),
      });
      setVideos((prev) => [data, ...prev]);
      setForm({ title: "", url: "" });
      setAddOpen(false);
      toast.success("Video əlavə edildi");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Əlavə edilmədi");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id) => {
    if (!window.confirm("Bu videonu silmək istəyirsiniz?")) return;
    try {
      await axios.delete(`${API}/${id}`);
      setVideos((prev) => prev.filter((v) => v._id !== id));
      toast.success("Silindi");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Silinmədi");
    }
  };

  return (
    <AccountLayout
      title="Mövzu izahları"
      subtitle="Müəllimlərin paylaşdığı video izahları — seç və izlə."
      actions={
        canManage && (
          <Button type="button" variant="secondary" size="sm" onClick={() => setAddOpen(true)}>
            <FiPlus /> Video əlavə et
          </Button>
        )
      }
    >
      {loading ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, k) => (
            <div key={k} className="animate-pulse overflow-hidden rounded-2xl border border-line bg-surface">
              <div className="aspect-video bg-surface2" />
              <div className="space-y-2 p-4">
                <div className="h-4 w-3/4 rounded bg-surface2" />
                <div className="h-3 w-1/3 rounded bg-surface2" />
              </div>
            </div>
          ))}
        </div>
      ) : videos.length === 0 ? (
        <div className="mx-auto mt-10 max-w-md rounded-3xl border border-dashed border-line bg-surface p-10 text-center">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-primary/12 text-primary">
            <FiVideo className="text-2xl" />
          </span>
          <h3 className="mt-4 font-display text-lg font-bold text-text">Hələ video yoxdur</h3>
          <p className="mt-1.5 text-sm text-muted">
            {canManage
              ? "İlk mövzu izahı videosunu əlavə et."
              : "Müəlliminiz video əlavə edən kimi burada görünəcək."}
          </p>
          {canManage && (
            <Button type="button" onClick={() => setAddOpen(true)} className="mt-5">
              <FiPlus /> Video əlavə et
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {videos.map((v) => {
            const mine = canManage && (user?.role === "admin" || v.owner === user?._id);
            return (
              <div
                key={v._id}
                className="group overflow-hidden rounded-2xl border border-line bg-surface shadow-soft transition-shadow hover:shadow-lift"
              >
                <button
                  type="button"
                  onClick={() => setPlaying(v)}
                  className="relative block aspect-video w-full overflow-hidden"
                  aria-label={`${v.title} — izlə`}
                >
                  <img
                    src={thumb(v.videoId)}
                    alt={v.title}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <span className="absolute inset-0 grid place-items-center bg-black/25 transition-colors group-hover:bg-black/35">
                    <span className="grid h-14 w-14 place-items-center rounded-full bg-white/95 text-primary shadow-lift transition-transform group-hover:scale-110">
                      <FiPlay className="ml-0.5 text-2xl" />
                    </span>
                  </span>
                </button>
                <div className="flex items-start justify-between gap-2 p-4">
                  <div className="min-w-0">
                    <h3 className="line-clamp-2 text-sm font-semibold text-text">{v.title}</h3>
                    {v.ownerName && (
                      <p className="mt-1 text-xs text-muted">{v.ownerName}</p>
                    )}
                  </div>
                  {mine && (
                    <button
                      type="button"
                      onClick={() => remove(v._id)}
                      className="shrink-0 grid h-8 w-8 place-items-center rounded-lg text-muted transition-colors hover:bg-danger/10 hover:text-danger"
                      aria-label="Sil"
                    >
                      <FiTrash2 />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Player modal */}
      {playing && (
        <div
          className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/80 p-4"
          onClick={() => setPlaying(null)}
        >
          <div className="w-full max-w-3xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-2 flex items-center justify-between gap-3">
              <h3 className="truncate font-display text-base font-semibold text-white">{playing.title}</h3>
              <button
                type="button"
                onClick={() => setPlaying(null)}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-white/80 transition-colors hover:bg-white/10 hover:text-white"
                aria-label="Bağla"
              >
                <FiX />
              </button>
            </div>
            <div className="aspect-video overflow-hidden rounded-2xl bg-black shadow-lift">
              <iframe
                key={playing._id}
                src={`https://www.youtube.com/embed/${playing.videoId}?autoplay=1&rel=0`}
                title={playing.title}
                className="h-full w-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            </div>
          </div>
        </div>
      )}

      {/* Add modal (teachers/admins) */}
      {addOpen && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => !saving && setAddOpen(false)}
          />
          <form
            onSubmit={submit}
            className="relative w-full max-w-md animate-scale-in rounded-3xl border border-line bg-surface p-6 shadow-lift sm:p-7"
          >
            <button
              type="button"
              onClick={() => setAddOpen(false)}
              className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-lg text-muted transition-colors hover:bg-surface2 hover:text-text"
              aria-label="Bağla"
            >
              <FiX />
            </button>
            <div className="mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-primary/12 text-primary">
              <FiVideo className="text-[22px]" />
            </div>
            <h2 className="font-display text-xl font-bold text-text">Video əlavə et</h2>
            <p className="mt-1.5 text-sm text-muted">YouTube linkini yapışdır.</p>
            <input
              autoFocus
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="Başlıq (məs. Törəmə — 1-ci hissə)"
              className="mt-5 h-12 w-full rounded-xl border border-line bg-surface px-3.5 text-[15px] text-text outline-none transition placeholder:text-muted/60 focus:border-primary focus:ring-4 focus:ring-ring/25"
            />
            <input
              value={form.url}
              onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
              placeholder="https://youtube.com/watch?v=..."
              className="mt-3 h-12 w-full rounded-xl border border-line bg-surface px-3.5 text-[15px] text-text outline-none transition placeholder:text-muted/60 focus:border-primary focus:ring-4 focus:ring-ring/25"
            />
            <Button type="submit" disabled={saving} className="mt-5 w-full">
              {saving ? <Spinner /> : "Əlavə et"}
            </Button>
          </form>
        </div>
      )}
    </AccountLayout>
  );
};

export default VideoLessons;
