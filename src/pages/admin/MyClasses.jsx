import { useEffect, useState } from "react";
import axios from "axios";
import { useSelector } from "react-redux";
import { toast } from "react-toastify";
import {
  FiUsers,
  FiCopy,
  FiLink2,
  FiRefreshCw,
  FiCheck,
  FiX,
  FiClock,
  FiUserX,
  FiUserPlus,
  FiSearch,
  FiPlus,
} from "react-icons/fi";
import AccountLayout from "../../components/AccountLayout";
import CenterLoader from "../../components/ui/CenterLoader";
import Badge from "../../components/ui/Badge";
import useRedirectLoggedOutUser from "../../customHook/useRedirectLoggedOutUser";
import { selectUser } from "../../../redux/features/auth/authSlice";

const API = `${import.meta.env.VITE_BACKEND_URL}/api/quiz`;

const MyClasses = () => {
  useRedirectLoggedOutUser("/login");
  const user = useSelector(selectUser);
  const isStaff = user?.role === "admin" || user?.role === "teacher";

  const [classes, setClasses] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [roster, setRoster] = useState(null); // { class, students: [enrollment{student}] }
  const [picker, setPicker] = useState(false); // add-student picker open
  const [assignable, setAssignable] = useState([]);
  const [pickSearch, setPickSearch] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const [c, r] = await Promise.all([
        axios.get(`${API}/teacher/classes`),
        axios.get(`${API}/teacher/requests`),
      ]);
      setClasses(c.data || []);
      setRequests(r.data || []);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Yüklənmədi");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isStaff) load();
    else setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isStaff]);

  const decide = async (id, action) => {
    try {
      await axios.patch(`${API}/enrollment/${id}`, { action });
      toast.success(action === "approve" ? "Təsdiqləndi" : "Rədd edildi");
      load();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Alınmadı");
    }
  };

  const updateClass = async (classId, body) => {
    try {
      await axios.patch(`${API}/class/${classId}/joinSettings`, body);
      load();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Alınmadı");
    }
  };

  const copyCode = (code) => {
    try {
      navigator.clipboard.writeText(code);
      toast.success(`Kod kopyalandı: ${code}`);
    } catch {
      toast.info(code);
    }
  };
  const copyLink = (code) => {
    const url = `${window.location.origin}/join/${code}`;
    try {
      navigator.clipboard.writeText(url);
      toast.success("Qoşulma linki kopyalandı");
    } catch {
      toast.info(url);
    }
  };

  // Per-class roster (approved students of a class).
  const openRoster = async (cls) => {
    try {
      const res = await axios.get(`${API}/class/${cls._id}/students`);
      setRoster({ class: cls, students: res.data || [] });
    } catch (err) {
      toast.error(err?.response?.data?.message || "Yüklənmədi");
    }
  };
  const reloadRoster = async (clsId) => {
    try {
      const res = await axios.get(`${API}/class/${clsId}/students`);
      setRoster((r) => (r ? { ...r, students: res.data || [] } : r));
    } catch {
      /* ignore */
    }
  };
  const removeFromClass = async (enrollmentId, clsId) => {
    try {
      await axios.patch(`${API}/enrollment/${enrollmentId}`, { action: "remove" });
      toast.success("Sinifdən çıxarıldı");
      reloadRoster(clsId);
      load(); // refresh class counts
    } catch (err) {
      toast.error(err?.response?.data?.message || "Alınmadı");
    }
  };

  // Add-student picker: list students that can be added to the open roster class.
  const openPicker = async () => {
    if (!roster) return;
    try {
      const res = await axios.get(`${API}/class/${roster.class._id}/assignable`);
      setAssignable(res.data || []);
      setPickSearch("");
      setPicker(true);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Yüklənmədi");
    }
  };
  const addStudent = async (studentId) => {
    if (!roster) return;
    const clsId = roster.class._id;
    try {
      await axios.post(`${API}/class/${clsId}/addStudent`, { studentId });
      toast.success("Tələbə əlavə edildi");
      setAssignable((prev) => prev.filter((s) => s._id !== studentId));
      reloadRoster(clsId);
      load(); // refresh counts
    } catch (err) {
      toast.error(err?.response?.data?.message || "Alınmadı");
    }
  };

  if (!isStaff) {
    return (
      <AccountLayout title="Siniflərim" subtitle="Yalnız müəllimlər üçün.">
        <div className="rounded-3xl border border-dashed border-line bg-surface p-16 text-center text-muted">
          Bu səhifə yalnız müəllimlər üçündür.
        </div>
      </AccountLayout>
    );
  }

  const classLabel = (c) =>
    c?.name && String(c.name).trim() ? c.name : c?.level != null ? `${c.level}-ci sinif` : "Sinif";
  const className = (c) => `${c.tag?.name || "—"} · ${classLabel(c)}`;

  return (
    <AccountLayout
      title="Siniflərim"
      subtitle="Sinif kodlarını paylaş, qoşulma sorğularını təsdiqlə."
    >
      {loading ? (
        <CenterLoader />
      ) : (
        <>
          {/* Pending join requests */}
          {requests.length > 0 && (
            <div className="mb-8">
              <h3 className="mb-3 flex items-center gap-2 font-display text-base font-bold text-text">
                <FiClock className="text-warning" /> Gözləyən sorğular
                <Badge tone="warning">{requests.length}</Badge>
              </h3>
              <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-soft">
                {requests.map((r) => (
                  <div
                    key={r._id}
                    className="flex flex-wrap items-center justify-between gap-3 border-b border-line/60 px-4 py-3 last:border-0"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-text">{r.student?.name || "—"}</p>
                      <p className="text-xs text-muted">
                        {r.student?.email} · {r.class?.tag?.name || "—"} · {classLabel(r.class)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => decide(r._id, "approve")}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-success px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:brightness-105"
                      >
                        <FiCheck /> Təsdiqlə
                      </button>
                      <button
                        type="button"
                        onClick={() => decide(r._id, "reject")}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-sm font-semibold text-muted transition-colors hover:border-danger hover:text-danger"
                      >
                        <FiX /> Rədd et
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Classes with join codes */}
          <h3 className="mb-3 flex items-center gap-2 font-display text-base font-bold text-text">
            <FiUsers className="text-primary" /> Siniflər
          </h3>
          {classes.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-line bg-surface p-12 text-center text-muted">
              Hələ sinif yoxdur. Kateqoriya açıb içində sinif əlavə edin.
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {classes.map((c) => (
                <div
                  key={c._id}
                  className="rounded-2xl border border-line bg-surface p-5 shadow-soft"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-display text-lg font-bold text-text">{className(c)}</p>
                      <p className="mt-0.5 text-xs text-muted">
                        {c.students} tələbə
                        {c.pending > 0 && (
                          <span className="text-warning"> · {c.pending} gözləyir</span>
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Join code */}
                  <div className="mt-4 flex items-center gap-2 rounded-xl border border-line bg-surface2/40 p-2.5">
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                      Kod
                    </span>
                    <span className="flex-1 text-center font-display text-xl font-bold tracking-[0.25em] text-text">
                      {c.joinCode || "—"}
                    </span>
                    <button
                      type="button"
                      onClick={() => copyLink(c.joinCode)}
                      title="Qoşulma linkini kopyala"
                      className="grid h-8 w-8 place-items-center rounded-lg text-muted transition-colors hover:bg-surface hover:text-primary"
                    >
                      <FiLink2 />
                    </button>
                    <button
                      type="button"
                      onClick={() => copyCode(c.joinCode)}
                      title="Kodu kopyala"
                      className="grid h-8 w-8 place-items-center rounded-lg text-muted transition-colors hover:bg-surface hover:text-primary"
                    >
                      <FiCopy />
                    </button>
                    <button
                      type="button"
                      onClick={() => updateClass(c._id, { regenerate: true })}
                      title="Yeni kod yarat"
                      className="grid h-8 w-8 place-items-center rounded-lg text-muted transition-colors hover:bg-surface hover:text-text"
                    >
                      <FiRefreshCw />
                    </button>
                  </div>

                  {/* Auto-approve toggle */}
                  <label className="mt-3 flex cursor-pointer items-center justify-between gap-3">
                    <span className="text-sm text-text">
                      Avtomatik təsdiq
                      <span className="block text-xs text-muted">
                        Kodu daxil edən dərhal qoşulur (sorğu gözləmir)
                      </span>
                    </span>
                    <button
                      type="button"
                      onClick={() => updateClass(c._id, { autoApprove: !c.autoApprove })}
                      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
                        c.autoApprove ? "bg-primary" : "bg-line"
                      }`}
                      role="switch"
                      aria-checked={c.autoApprove}
                    >
                      <span
                        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
                          c.autoApprove ? "left-[22px]" : "left-0.5"
                        }`}
                      />
                    </button>
                  </label>

                  <button
                    type="button"
                    onClick={() => openRoster(c)}
                    className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-line px-3 py-2 text-sm font-semibold text-text transition-colors hover:border-primary hover:text-primary"
                  >
                    <FiUsers /> Tələbələr ({c.students})
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Per-class roster: only the students who joined THIS class. */}
          {roster && (
            <div className="fixed inset-0 z-[1500] flex items-center justify-center p-4">
              <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={() => setRoster(null)}
              />
              <div className="relative flex max-h-[80vh] w-full max-w-md flex-col rounded-3xl border border-line bg-surface p-6 shadow-lift">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <h2 className="truncate font-display text-lg font-bold text-text">
                      {className(roster.class)}
                    </h2>
                    <p className="text-xs text-muted">{roster.students.length} tələbə</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={openPicker}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-primary-fg transition-colors hover:bg-primary-hover"
                    >
                      <FiUserPlus /> Tələbə əlavə et
                    </button>
                    <button
                      type="button"
                      onClick={() => setRoster(null)}
                      className="grid h-8 w-8 place-items-center rounded-lg text-muted transition-colors hover:bg-surface2 hover:text-text"
                      aria-label="Bağla"
                    >
                      <FiX />
                    </button>
                  </div>
                </div>
                <div className="scrollbar-thin -mr-2 min-h-0 flex-1 overflow-y-auto pr-2">
                  {roster.students.length === 0 ? (
                    <p className="py-10 text-center text-sm text-muted">
                      Bu sinifə hələ tələbə qoşulmayıb.
                    </p>
                  ) : (
                    roster.students.map((r) => {
                      const s = r.student || {};
                      return (
                        <div
                          key={r._id}
                          className="flex items-center justify-between gap-2 border-b border-line/60 py-2.5 last:border-0"
                        >
                          <div className="min-w-0">
                            <p className="truncate font-medium text-text">{s.name}</p>
                            <p className="truncate text-xs text-muted">{s.email}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeFromClass(r._id, roster.class._id)}
                            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-sm font-semibold text-muted transition-colors hover:border-danger hover:text-danger"
                          >
                            <FiUserX /> Sinifdən çıxar
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Add-student picker: select students to add to the open class. */}
          {picker &&
            (() => {
              const q = pickSearch.trim().toLowerCase();
              const filtered = q
                ? assignable.filter(
                    (s) =>
                      (s.name || "").toLowerCase().includes(q) ||
                      (s.email || "").toLowerCase().includes(q)
                  )
                : assignable;
              return (
                <div className="fixed inset-0 z-[1600] flex items-center justify-center p-4">
                  <div
                    className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                    onClick={() => setPicker(false)}
                  />
                  <div className="relative flex max-h-[80vh] w-full max-w-md flex-col rounded-3xl border border-line bg-surface p-6 shadow-lift">
                    <div className="mb-3 flex items-center justify-between gap-2">
                      <h2 className="font-display text-lg font-bold text-text">
                        Tələbə əlavə et
                      </h2>
                      <button
                        type="button"
                        onClick={() => setPicker(false)}
                        className="grid h-8 w-8 place-items-center rounded-lg text-muted transition-colors hover:bg-surface2 hover:text-text"
                        aria-label="Bağla"
                      >
                        <FiX />
                      </button>
                    </div>
                    <div className="relative mb-3">
                      <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                      <input
                        autoFocus
                        value={pickSearch}
                        onChange={(e) => setPickSearch(e.target.value)}
                        placeholder="Ad və ya email axtar..."
                        className="w-full rounded-xl border border-line bg-surface py-2 pl-9 pr-3 text-sm text-text outline-none transition focus:border-primary"
                      />
                    </div>
                    <div className="scrollbar-thin -mr-2 min-h-0 flex-1 overflow-y-auto pr-2">
                      {filtered.length === 0 ? (
                        <p className="py-10 text-center text-sm text-muted">
                          Əlavə ediləcək tələbə yoxdur.
                        </p>
                      ) : (
                        filtered.map((s) => (
                          <div
                            key={s._id}
                            className="flex items-center justify-between gap-2 border-b border-line/60 py-2.5 last:border-0"
                          >
                            <div className="min-w-0">
                              <p className="truncate font-medium text-text">{s.name}</p>
                              <p className="truncate text-xs text-muted">{s.email}</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => addStudent(s._id)}
                              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-primary/40 bg-primary/5 px-3 py-1.5 text-sm font-semibold text-primary transition-colors hover:bg-primary/10"
                            >
                              <FiPlus /> Əlavə et
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              );
            })()}
        </>
      )}
    </AccountLayout>
  );
};

export default MyClasses;
