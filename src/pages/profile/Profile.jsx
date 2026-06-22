import { useEffect, useLayoutEffect, useState } from "react";
import AccountLayout from "../../components/AccountLayout";
import useRedirectLoggedOutUser from "../../customHook/useRedirectLoggedOutUser";
import { useDispatch, useSelector } from "react-redux";
import { getUser, selectUser, updateUser } from "../../../redux/features/auth/authSlice";
import { toast } from "react-toastify";
import { NavLink } from "react-router-dom";
import { TailSpin } from "react-loader-spinner";
import { RiArrowDropDownLine } from "react-icons/ri";
import { FiCamera } from "react-icons/fi";
import Button from "../../components/ui/Button";
import Badge from "../../components/ui/Badge";
import Spinner from "../../components/Spinner";
import TelegramNotifications from "../../components/TelegramNotifications";
import ChangePasswordCard from "../../components/ChangePasswordCard";
import { Field, inputClass, textareaClass } from "../../components/ui/Field";

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
  };
  const [profileData, setProfileData] = useState(initialState);
  const [profileImage, setProfileImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  const { name, email, phone, bio, role, isVerified } = profileData;

  const handleImageChange = (e) => {
    setProfileImage(e.target.files[0]);
    setImagePreview(URL.createObjectURL(e.target.files[0]));
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setProfileData({ ...profileData, [name]: value });
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    // Default to the existing photo; only replaced if a new upload succeeds.
    let imageUrl = profileData.photo;
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
        image.append("file", profileImage);
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
      };
      await dispatch(updateUser(userData));
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
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    dispatch(getUser());
  }, [dispatch]);

  return (
    <AccountLayout>
      {!user ? (
        <div className="flex justify-center py-24">
          <TailSpin height="80" width="80" color="oklch(0.55 0.185 270)" visible />
        </div>
      ) : (
          <>
            {/* Header */}
            <div className="flex flex-col items-center gap-6 rounded-3xl border border-line bg-surface p-6 shadow-soft sm:flex-row sm:p-8">
              <label htmlFor="image" className="group relative shrink-0 cursor-pointer">
                <img
                  src={imagePreview === null ? user.photo : imagePreview}
                  alt={user.name}
                  className="h-28 w-28 rounded-full border border-line object-cover shadow-soft"
                />
                <span className="absolute inset-0 grid place-items-center rounded-full bg-black/45 text-white opacity-0 transition-opacity group-hover:opacity-100">
                  <FiCamera className="text-2xl" />
                </span>
              </label>
              <input
                type="file"
                className="hidden"
                accept="image/*"
                id="image"
                name="image"
                onChange={handleImageChange}
              />
              <div className="text-center sm:text-left">
                <div className="flex flex-wrap items-center justify-center gap-2.5 sm:justify-start">
                  <h1 className="font-display text-2xl font-bold text-text">{profileData?.name}</h1>
                  <Badge tone={role === "admin" ? "primary" : role === "teacher" ? "accent" : "neutral"}>
                    {roleLabels[role] || role}
                  </Badge>
                  {isVerified ? (
                    <Badge tone="success">Təsdiqlənib</Badge>
                  ) : (
                    <Badge tone="warning">Təsdiqlənməyib</Badge>
                  )}
                </div>
                <p className="mt-1.5 text-muted">{profileData?.email}</p>
                <p className="mt-1 text-sm text-muted">Profil şəklini dəyişmək üçün şəklin üzərinə kliklə.</p>
              </div>
            </div>

            {/* Form */}
            <form
              onSubmit={handleUpdate}
              className="mt-6 rounded-3xl border border-line bg-surface p-6 shadow-soft sm:p-8"
            >
              <div className="grid gap-6 md:grid-cols-2">
                <Field label="Ad və Soyad" htmlFor="name">
                  <input id="name" name="name" value={name} onChange={handleInputChange} className={inputClass} />
                </Field>
                <Field label="Email" htmlFor="email" hint="Email dəyişdirilə bilməz">
                  <input id="email" name="email" type="email" disabled value={email} className={inputClass} />
                </Field>
                <Field label="Telefon" htmlFor="phone">
                  <input id="phone" name="phone" value={phone} onChange={handleInputChange} className={inputClass} />
                </Field>
                <Field label="Haqqımda" htmlFor="bio">
                  <textarea id="bio" name="bio" value={bio} onChange={handleInputChange} className={textareaClass} />
                </Field>
              </div>

              <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? <Spinner /> : "Yadda saxla"}
                </Button>
                <Button to="/classes" variant="soft">
                  İmtahanlar
                </Button>
              </div>
            </form>

            <ChangePasswordCard />

            {(role === "teacher" || role === "admin") && <TelegramNotifications />}
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
