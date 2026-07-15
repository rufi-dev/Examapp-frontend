import { useState } from "react";
import Modal from "react-modal";
import { useDispatch, useSelector } from "react-redux";
import Spinner from "./Spinner";
import Button from "./ui/Button";
import {
  addAchivement,
  getAchivements,
} from "../../redux/features/achivement/achivementSlice";
import { toast } from "react-toastify";
import { HiOutlinePhotograph } from "react-icons/hi";
import { FiX, FiChevronDown, FiUploadCloud } from "react-icons/fi";

const cloud_name = import.meta.env.VITE_CLOUD_NAME;
const upload_preset = import.meta.env.VITE_UPLAD_PRESET;

const isImage = (f) =>
  f && ["image/jpeg", "image/jpg", "image/png", "image/webp"].includes(f.type);

const inputCls =
  "w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm text-text placeholder:text-muted outline-none transition focus:border-primary focus:ring-4 focus:ring-ring/25";

const AchivementModal = ({ modalIsOpen, closeModal }) => {
  const { isLoading } = useSelector((state) => state.achivement);
  const [imagePreview, setImagePreview] = useState(null);
  const [achivementImage, setAchivementImage] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const dispatch = useDispatch();

  const initialState = { title: "", photo: "", about: "", size: "" };
  const [achivementForm, setAchivementForm] = useState(initialState);
  const { title, about, size } = achivementForm;

  const setImage = (file) => {
    if (!isImage(file)) {
      toast.error("Yalnız JPG, PNG və ya WEBP şəkil seçin.");
      return;
    }
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setAchivementImage(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const clearImage = () => {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setAchivementImage(null);
    setImagePreview(null);
  };

  const reset = () => {
    clearImage();
    setAchivementForm(initialState);
  };

  const close = () => {
    reset();
    closeModal();
  };

  const addAchivementForm = async (e) => {
    e.preventDefault();
    if (!achivementImage) {
      toast.error("Zəhmət olmasa şəkil əlavə edin.");
      return;
    }
    if (!title.trim()) {
      toast.error("Başlıq boş ola bilməz.");
      return;
    }
    let imageUrl;
    try {
      const image = new FormData();
      image.append("file", achivementImage, achivementImage.name || "achievement.jpg");
      image.append("cloud_name", cloud_name);
      image.append("upload_preset", upload_preset);
      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${cloud_name}/image/upload`,
        { method: "post", body: image }
      );
      const imgData = await response.json();
      imageUrl = (imgData.secure_url || imgData.url)?.toString();
      if (!imageUrl) throw new Error("Şəkil yüklənmədi");

      await dispatch(
        addAchivement({
          title: title.trim(),
          about,
          photo: imageUrl,
          size: size || "medium",
        })
      );
      await dispatch(getAchivements());
      reset();
      closeModal();
    } catch (error) {
      toast.error(error?.message || "Nailiyyət əlavə olunmadı");
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setAchivementForm({ ...achivementForm, [name]: value });
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    setImage(e.dataTransfer.files?.[0]);
  };

  return (
    <Modal
      isOpen={modalIsOpen}
      onRequestClose={close}
      contentLabel="Nailiyyət əlavə et"
      closeTimeoutMS={150}
      style={{
        overlay: {
          backgroundColor: "rgb(0 0 0 / 0.55)",
          backdropFilter: "blur(4px)",
          zIndex: 10000,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "16px",
        },
        content: {
          position: "static",
          inset: "auto",
          border: "none",
          background: "transparent",
          padding: 0,
          overflow: "visible",
          width: "100%",
          maxWidth: "560px",
        },
      }}
    >
      <div className="scrollbar-brand max-h-[90vh] w-full overflow-y-auto overflow-x-hidden rounded-3xl border border-line bg-surface text-text shadow-lift">
        {/* header */}
        <div className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-line bg-surface/95 px-6 py-4 backdrop-blur">
          <div>
            <h3 className="font-display text-lg font-bold">Yeni nailiyyət</h3>
            <p className="text-xs text-muted">Şagird uğurunu qalereyaya əlavə edin.</p>
          </div>
          <button
            type="button"
            onClick={close}
            aria-label="Bağla"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-muted transition-colors hover:bg-surface2 hover:text-text"
          >
            <FiX className="text-lg" />
          </button>
        </div>

        <form onSubmit={addAchivementForm} className="space-y-5 p-6">
          {/* dropzone / preview */}
          <div>
            <label className="mb-2 block text-sm font-semibold text-text">Şəkil</label>
            {imagePreview ? (
              <div className="group relative overflow-hidden rounded-2xl border border-line bg-surface2">
                <img
                  src={imagePreview}
                  alt=""
                  className="mx-auto max-h-72 w-full object-contain"
                />
                <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-gradient-to-t from-black/70 to-transparent p-3">
                  <label
                    htmlFor="imageInput"
                    className="cursor-pointer rounded-lg bg-white/15 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur hover:bg-white/25"
                  >
                    Dəyişdir
                  </label>
                  <button
                    type="button"
                    onClick={clearImage}
                    className="grid h-8 w-8 place-items-center rounded-full bg-danger text-white shadow-soft hover:opacity-90"
                    aria-label="Şəkli sil"
                  >
                    <FiX />
                  </button>
                </div>
              </div>
            ) : (
              <label
                htmlFor="imageInput"
                onDrop={handleDrop}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragActive(true);
                }}
                onDragLeave={() => setDragActive(false)}
                className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-6 py-12 text-center transition-colors ${
                  dragActive
                    ? "border-primary bg-primary/10"
                    : "border-line bg-surface2/50 hover:border-primary/60 hover:bg-surface2"
                }`}
              >
                <span className="grid h-12 w-12 place-items-center rounded-xl bg-primary/12 text-2xl text-primary">
                  {dragActive ? <FiUploadCloud /> : <HiOutlinePhotograph />}
                </span>
                <span className="text-sm font-semibold text-text">
                  Şəkli bura sürüşdürün və ya seçin
                </span>
                <span className="text-xs text-muted">JPG, PNG və ya WEBP</span>
              </label>
            )}
            <input
              type="file"
              className="hidden"
              accept="image/*"
              id="imageInput"
              name="image"
              onChange={(e) => setImage(e.target.files?.[0])}
            />
          </div>

          {/* title */}
          <div>
            <label className="mb-2 block text-sm font-semibold text-text" htmlFor="title">
              Başlıq
            </label>
            <input
              value={title}
              onChange={handleInputChange}
              type="text"
              name="title"
              id="title"
              placeholder="Məsələn: Mətləbxan — 292.5 bal"
              className={inputCls}
            />
          </div>

          {/* about */}
          <div>
            <label className="mb-2 block text-sm font-semibold text-text" htmlFor="about">
              Haqqında
            </label>
            <textarea
              value={about}
              onChange={handleInputChange}
              name="about"
              id="about"
              rows={5}
              placeholder="Uğur haqqında qısa məlumat yazın…"
              className={`${inputCls} resize-y leading-relaxed`}
            />
          </div>

          {/* size */}
          <div>
            <label className="mb-2 block text-sm font-semibold text-text" htmlFor="size">
              Ölçü
            </label>
            <div className="relative">
              <select
                value={size}
                onChange={handleInputChange}
                name="size"
                id="size"
                className={`${inputCls} cursor-pointer appearance-none pr-10`}
              >
                <option value="">Ölçü seçin</option>
                <option value="large">Böyük</option>
                <option value="medium">Orta</option>
                <option value="small">Kiçik</option>
              </select>
              <FiChevronDown className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-muted" />
            </div>
          </div>

          {/* actions */}
          <div className="flex items-center justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" size="md" onClick={close}>
              Ləğv et
            </Button>
            <Button type="submit" variant="primary" size="md" disabled={isLoading}>
              {isLoading ? <Spinner size={18} /> : "Nailiyyət əlavə et"}
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
};

export default AchivementModal;
