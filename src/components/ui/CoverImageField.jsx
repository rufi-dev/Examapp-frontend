import { useState } from "react";
import { toast } from "react-toastify";
import { HiOutlinePhotograph } from "react-icons/hi";
import { FiX, FiRefreshCw } from "react-icons/fi";
import { uploadImage } from "../../helper/cloudinary";
import Spinner from "../Spinner";
import { Field } from "./Field";

// Optional exam cover/banner image. Uploads one image to Cloudinary and hands
// the hosted URL back via onChange (""=removed). Shown at the top of the exam
// card. Display-only, so it's safe in student payloads.
const CoverImageField = ({ value, onChange }) => {
  const [busy, setBusy] = useState(false);

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-picking the same file
    if (!file) return;
    if (!["image/jpeg", "image/jpg", "image/png", "image/webp"].includes(file.type)) {
      return toast.error("Yalnız şəkil faylı yükləyin");
    }
    setBusy(true);
    try {
      onChange(await uploadImage(file));
    } catch (err) {
      toast.error(err?.message || "Şəkil yüklənmədi");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Field label="Üz qabığı şəkli" hint="Kartın yuxarısında görünən banner (istəyə bağlı)">
      {value ? (
        <div className="relative overflow-hidden rounded-xl border border-line">
          {/* Click anywhere on the image to re-pick / replace it. */}
          <label className="group block cursor-pointer" title="Şəkli dəyiş">
            <img src={value} alt="" className="h-40 w-full object-cover" />
            <div className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition-all duration-150 group-hover:bg-black/45 group-hover:opacity-100">
              <span className="inline-flex items-center gap-2 rounded-lg bg-black/65 px-3 py-2 text-sm font-semibold text-white">
                <FiRefreshCw /> Şəkli dəyiş
              </span>
            </div>
            <input type="file" accept="image/*" className="hidden" onChange={onFile} disabled={busy} />
          </label>
          {busy && (
            <div className="pointer-events-none absolute inset-0 grid place-items-center bg-black/40">
              <Spinner size={22} className="text-white" />
            </div>
          )}
          {/* Remove (separate from the image so a click here doesn't re-pick). */}
          <button
            type="button"
            onClick={() => onChange("")}
            aria-label="Şəkli sil"
            disabled={busy}
            className="absolute right-2 top-2 z-10 grid h-8 w-8 place-items-center rounded-lg bg-black/55 text-white transition-colors hover:bg-danger"
          >
            <FiX />
          </button>
        </div>
      ) : (
        <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-line bg-surface2/40 px-4 py-8 text-sm font-semibold text-muted transition-colors hover:border-primary/50 hover:text-primary">
          {busy ? (
            <Spinner size={20} />
          ) : (
            <>
              <HiOutlinePhotograph className="text-2xl" /> Şəkil yüklə
            </>
          )}
          <input type="file" accept="image/*" className="hidden" onChange={onFile} disabled={busy} />
        </label>
      )}
    </Field>
  );
};

export default CoverImageField;
