import { useEffect, useLayoutEffect, useMemo, useState } from "react";
import AccountLayout from "../../components/AccountLayout";
import useRedirectLoggedOutUser from "../../customHook/useRedirectLoggedOutUser";
import { useDispatch, useSelector } from "react-redux";
import { getUser, selectUser, updateUser } from "../../../redux/features/auth/authSlice";
import { toast } from "react-toastify";
import { NavLink } from "react-router-dom";
import { TailSpin } from "react-loader-spinner";
import { RiArrowDropDownLine } from "react-icons/ri";
import { FiCamera, FiTrash2, FiCopy, FiCheck, FiAlertCircle, FiUser, FiCalendar } from "react-icons/fi";
import { BsWhatsapp } from "react-icons/bs";
import Button from "../../components/ui/Button";
import Badge from "../../components/ui/Badge";
import Spinner from "../../components/Spinner";
import ChangePasswordCard from "../../components/ChangePasswordCard";
import { Field, inputClass, textareaClass } from "../../components/ui/Field";
import Select from "../../components/ui/Select";
import { GRADES, gradeLabel } from "../../helper/grades";

const cloud_name = import.meta.env.VITE_CLOUD_NAME;
const upload_preset = import.meta.env.VITE_UPLAD_PRESET;

export const shortenText = (text, n) => {
  if (text.length > n) {
    return text.substring(0, n).concat("...");
  }
  return text;
};

const roleLabels = {
  admin: "Admin",
  teacher: "Müəllim",
  student: "Tələbə",
  suspended: "Bloklanıb",
};

const AZ_MONTHS = [
  "Yanvar", "Fevral", "Mart", "Aprel", "May", "İyun",
  "İyul", "Avqust", "Sentyabr", "Oktyabr", "Noyabr", "Dekabr",
];

const initialsOf = (name) =>
  (name || "?")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() || "")
    .join("") || "?";

// Circular profile-completeness meter (SVG so it animates + stays crisp).
const CompletenessRing = ({ percent }) => {
  const r = 26;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (percent / 100) * circumference;
  return (
    <div className="relative h-16 w-16 shrink-0">
      <svg viewBox="0 0 64 64" className="h-16 w-16 -rotate-90">
        <circle cx="32" cy="32" r={r} fill="none" stroke="rgb(var(--surface-2))" strokeWidth="6" />
        <circle
          cx="32"
          cy="32"
          r={r}
          fill="none"
          stroke="rgb(var(--primary))"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-700 ease-out"
        />
      </svg>
      <span className="absolute inset-0 grid place-items-center text-sm font-bold text-text">
        {percent}%
      </span>
    </div>
  );
};

const Profile = () => {
  const dispatch = useDispatch();

  useRedirectLoggedOutUser("/login");

  const { isLoading, user } = useSelector((state) => state.auth);

  const initialState = {
    name: user?.name || "",
    email: user?.email || "",
    phone: user?.phone || "",
    bio: user?.bio || "",
    role: user?.role || "",
    photo: user?.photo || "",
    isVerified: user?.isVerified || false,
    whatsappOptIn: user?.whatsappOptIn ?? true,
    grade: user?.grade || "",
  };
  const [profileData, setProfileData] = useState(initialState);
  const [profileImage, setProfileImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [photoCleared, setPhotoCleared] = useState(false);

  const { name, email, phone, bio, role, isVerified, whatsappOptIn, grade } = profileData;

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setProfileImage(file);
    setImagePreview(URL.createObjectURL(file));
    setPhotoCleared(false);
  };

  const removePhoto = () => {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setProfileImage(null);
    setImagePreview(null);
    setPhotoCleared(true);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setProfileData({ ...profileData, [name]: value });
  };

  // The photo the UI is currently showing / would save.
  const effectivePhoto = imagePreview !== null ? imagePreview : photoCleared ? "" : user?.photo || "";
  const hasPhoto = !!effectivePhoto;

  // Live completeness — recomputes as the user edits so the ring reacts.
  const { pct, missing } = useMemo(() => {
    const checks = [
      { label: "şəkil", done: hasPhoto },
      { label: "ad", done: !!name?.trim() },
      { label: "telefon", done: !!phone?.trim() },
      { label: "haqqında", done: !!bio?.trim() },
      ...(role === "student" ? [{ label: "sinif", done: !!grade }] : []),
    ];
    const done = checks.filter((c) => c.done).length;
    return {
      pct: Math.round((done / checks.length) * 100),
      missing: checks.filter((c) => !c.done).map((c) => c.label),
    };
  }, [hasPhoto, name, phone, bio, grade, role]);

  // Dirty tracking — Save stays disabled until something actually changed.
  const dirty =
    name !== (user?.name || "") ||
    phone !== (user?.phone || "") ||
    bio !== (user?.bio || "") ||
    (whatsappOptIn ?? true) !== (user?.whatsappOptIn ?? true) ||
    grade !== (user?.grade || "") ||
    profileImage !== null ||
    photoCleared;

  // Loose international-format check — non-blocking, just a hint.
  const phoneValid = !phone?.trim() || /^\+?\d[\d\s()-]{7,}$/.test(phone.trim());

  const memberSince = user?.createdAt
    ? `${AZ_MONTHS[new Date(user.createdAt).getMonth()]} ${new Date(user.createdAt).getFullYear()}`
    : null;

  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText(email);
      toast.success("Email kopyalandı");
    } catch {
      toast.error("Kopyalanmadı");
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    // Baseline: keep current, clear on explicit remove, replace on new upload.
    let imageUrl = photoCleared && !profileImage ? "" : profileData.photo;
    try {
      if (
        profileImage !== null &&
        (profileImage.type === "image/jpeg" ||
          profileImage.type === "image/jpg" ||
          profileImage.type === "image/png")
      ) {
        if (!cloud_name || !upload_preset) {
          return toast.error("Şəkil yükləmə konfiqurasiya olunmayıb (Cloudinary)");
        }

        const image = new FormData();
        image.append("file", profileImage, profileImage.name || "avatar.jpg");
        image.append("cloud_name", cloud_name);
        image.append("upload_preset", upload_preset);

        const response = await fetch(
          `https://api.cloudinary.com/v1_1/${cloud_name}/image/upload`,
          { method: "post", body: image }
        );

        const imgData = await response.json();
        if (!response.ok || !(imgData.secure_url || imgData.url)) {
          return toast.error(imgData?.error?.message || "Şəkil yüklənmədi, yenidən cəhd edin");
        }
        imageUrl = (imgData.secure_url || imgData.url).toString();
      }

      const userData = {
        name: profileData.name,
        phone: profileData.phone,
        bio: profileData.bio,
        photo: imageUrl,
        whatsappOptIn: profileData.whatsappOptIn,
        ...(profileData.grade ? { grade: profileData.grade } : {}),
      };
      await dispatch(updateUser(userData));
      setProfileImage(null);
      setImagePreview(null);
      setPhotoCleared(false);
      toast.success("Profil yeniləndi");
    } catch (error) {
      toast.error(error.message);
    }
  };

  useLayoutEffect(() => {
    if (user) {
      setProfileData({
        ...profileData,
        name: user.name,
        email: user.email,
        phone: user.phone,
        bio: user.bio,
        role: user.role,
        photo: user.photo,
        isVerified: user.isVerified,
        whatsappOptIn: user.whatsappOptIn ?? true,
        grade: user.grade || "",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    dispatch(getUser());
  }, [dispatch]);

  return (
    <AccountLayout title="Profil" subtitle="Hesab məlumatların, təhlükəsizlik və bildirişlər.">
      {!user ? (
        <div className="flex justify-center py-24">
          <TailSpin height="80" width="80" color="rgb(74 100 220)" visible />
        </div>
      ) : (
        <>
          {/* ── Identity header ── */}
          <div className="overflow-hidden rounded-3xl border border-line bg-surface shadow-soft">
            {/* soft, restrained branded band (not a loud gradient block) */}
            <div className="relative h-24 bg-gradient-to-r from-primary/10 via-accent2/10 to-primary/10 sm:h-28">
              <div aria-hidden className="absolute inset-0 bg-dots opacity-60" />
            </div>

            <div className="px-6 pb-6 sm:px-8">
              <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
                <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-end">
                  {/* avatar */}
                  <div className="-mt-14 flex flex-col items-center gap-2.5 sm:-mt-16">
                    <label htmlFor="image" className="group relative cursor-pointer">
                      {hasPhoto ? (
                        <img
                          src={effectivePhoto}
                          alt={user.name}
                          className="h-28 w-28 rounded-full object-cover ring-4 ring-surface shadow-lift"
                        />
                      ) : (
                        <span className="grid h-28 w-28 place-items-center rounded-full bg-primary/15 font-display text-3xl font-bold text-primary ring-4 ring-surface shadow-lift">
                          {initialsOf(name)}
                        </span>
                      )}
                      <span className="absolute inset-0 grid place-items-center rounded-full bg-black/45 text-white opacity-0 transition-opacity group-hover:opacity-100">
                        <FiCamera className="text-2xl" />
                      </span>
                    </label>
                    {hasPhoto && (
                      <button
                        type="button"
                        onClick={removePhoto}
                        className="inline-flex items-center gap-1 rounded-full border border-line bg-surface px-2.5 py-1 text-xs font-semibold text-muted transition-colors hover:border-danger/40 hover:text-danger"
                      >
                        <FiTrash2 /> Şəkli sil
                      </button>
                    )}
                  </div>
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*"
                    id="image"
                    name="image"
                    onChange={handleImageChange}
                  />

                  <div className="pb-1 text-center sm:pb-1.5 sm:text-left">
                    <div className="flex flex-wrap items-center justify-center gap-2.5 sm:justify-start">
                      <h1 className="font-display text-2xl font-bold tracking-tight text-text">{name}</h1>
                      <Badge tone={role === "admin" ? "primary" : role === "teacher" ? "accent" : "neutral"}>
                        {roleLabels[role] || role}
                      </Badge>
                      {isVerified ? (
                        <Badge tone="success">Təsdiqlənib</Badge>
                      ) : (
                        <Badge tone="warning">Təsdiqlənməyib</Badge>
                      )}
                    </div>
                    <p className="mt-1.5 text-sm text-muted">{email}</p>
                    {memberSince && (
                      <p className="mt-1 flex items-center justify-center gap-1.5 text-sm text-muted sm:justify-start">
                        <FiCalendar className="text-[13px]" /> Üzv olub: {memberSince}
                      </p>
                    )}
                  </div>
                </div>

                {/* completeness — clean, borderless inline block */}
                <div className="flex items-center gap-3 rounded-2xl bg-surface2/50 px-4 py-3">
                  <CompletenessRing percent={pct} />
                  <div className="min-w-0 max-w-[190px]">
                    <p className="text-sm font-bold text-text">
                      {pct === 100 ? "Profil tamamlanıb 🎉" : `${pct}% tamamlanıb`}
                    </p>
                    <p className="mt-0.5 text-xs text-muted">
                      {pct < 100 ? `Əlavə et: ${missing.join(", ")}` : "Bütün sahələr doldurulub."}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── Personal info ── */}
          <form
            onSubmit={handleUpdate}
            className="mt-6 rounded-3xl border border-line bg-surface p-6 shadow-soft sm:p-8"
          >
            <div className="mb-6 flex items-center gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-primary/12 text-primary">
                <FiUser className="text-[19px]" />
              </span>
              <div>
                <h2 className="font-display text-lg font-bold text-text">Şəxsi məlumatlar</h2>
                <p className="text-sm text-muted">Ad, əlaqə və haqqında məlumatların.</p>
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <Field label="Ad və Soyad" htmlFor="name">
                <input id="name" name="name" value={name} onChange={handleInputChange} className={inputClass} />
              </Field>

              <Field label="Email" htmlFor="email" hint="Email dəyişdirilə bilməz">
                <div className="relative">
                  <input
                    id="email"
                    name="email"
                    type="email"
                    disabled
                    value={email}
                    className={`${inputClass} pr-11`}
                  />
                  <button
                    type="button"
                    onClick={copyEmail}
                    aria-label="Email-i kopyala"
                    className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg text-muted transition-colors hover:bg-surface2 hover:text-text"
                  >
                    <FiCopy />
                  </button>
                </div>
              </Field>

              <div>
                <Field label="Telefon" htmlFor="phone">
                  <input id="phone" name="phone" value={phone} onChange={handleInputChange} className={inputClass} />
                </Field>
                {phone?.trim() &&
                  (phoneValid ? (
                    <p className="mt-1.5 flex items-center gap-1 text-xs font-medium text-success">
                      <FiCheck /> Format düzgündür
                    </p>
                  ) : (
                    <p className="mt-1.5 flex items-center gap-1 text-xs font-medium text-warning">
                      <FiAlertCircle /> Beynəlxalq formatda yazın (məs. +99450...)
                    </p>
                  ))}
              </div>

              {role === "student" && (
                <Field label="Sinif">
                  <Select
                    value={grade}
                    onChange={(v) => setProfileData((p) => ({ ...p, grade: v }))}
                    options={GRADES.map((g) => ({ value: g, label: gradeLabel(g) }))}
                    placeholder="Sinif seç"
                  />
                </Field>
              )}

              <Field label="Haqqımda" htmlFor="bio">
                <textarea id="bio" name="bio" value={bio} onChange={handleInputChange} className={textareaClass} />
              </Field>
            </div>

            {/* WhatsApp notification opt-in — premium toggle. */}
            <div className="mt-6 flex items-start justify-between gap-4 rounded-2xl border border-line bg-surface2/40 p-4">
              <div className="flex items-start gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-success/12 text-lg text-success">
                  <BsWhatsapp />
                </span>
                <div className="min-w-0">
                  <p className="font-semibold text-text">WhatsApp bildirişləri</p>
                  <p className="mt-0.5 text-sm text-muted">
                    Yeni imtahan əlavə olunduqda WhatsApp-a avtomatik bildiriş al. Telefon nömrən
                    beynəlxalq formatda olmalıdır (məs. +99450...).
                  </p>
                </div>
              </div>
              <label className="relative mt-0.5 inline-flex shrink-0 cursor-pointer items-center">
                <input
                  type="checkbox"
                  checked={!!whatsappOptIn}
                  onChange={(e) =>
                    setProfileData((p) => ({ ...p, whatsappOptIn: e.target.checked }))
                  }
                  className="peer sr-only"
                />
                <span className="relative h-6 w-11 rounded-full bg-line transition-colors peer-checked:bg-success peer-focus-visible:ring-4 peer-focus-visible:ring-ring/30 after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow after:transition-transform after:content-[''] peer-checked:after:translate-x-5" />
              </label>
            </div>

            <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-line pt-6">
              <div className="flex items-center gap-3">
                <Button type="submit" disabled={isLoading || !dirty}>
                  {isLoading ? <Spinner /> : "Yadda saxla"}
                </Button>
                {dirty && !isLoading && (
                  <span className="flex items-center gap-1.5 text-sm text-muted">
                    <span className="h-2 w-2 rounded-full bg-warning" />
                    Saxlanılmamış dəyişikliklər
                  </span>
                )}
              </div>
              <Button to="/classes" variant="soft">
                İmtahanlar
              </Button>
            </div>
          </form>

          <ChangePasswordCard />
        </>
      )}
    </AccountLayout>
  );
};

export const UserName = () => {
  const user = useSelector(selectUser);
  const username = user?.name || "...";
  const activeLink = ({ isActive }) =>
    `flex items-center transition-colors ${isActive ? "text-primary" : "text-text hover:text-primary"}`;

  return (
    <NavLink to={"/dashboard"} className={activeLink}>
      Salam, {shortenText(username, 15)}
      <span className="text-[26px]">
        <RiArrowDropDownLine />
      </span>
    </NavLink>
  );
};

export default Profile;
