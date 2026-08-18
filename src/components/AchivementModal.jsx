import PropTypes from "prop-types";
import { useState, useEffect } from "react";
import Modal from "react-modal";
import { useDispatch, useSelector } from "react-redux";
import Spinner from "./Spinner";
import Button from "./ui/Button";
import {
  addAchivement,
  getAchivements,
  updateAchivement,
} from "../../redux/features/achivement/achivementSlice";
import { toast } from "react-toastify";
import { FiX } from "react-icons/fi";
import {
  PiCheck,
  PiImageSquare,
  PiMedal,
  PiSparkle,
  PiUploadSimple,
} from "react-icons/pi";

const cloud_name = import.meta.env.VITE_CLOUD_NAME;
const upload_preset = import.meta.env.VITE_UPLAD_PRESET;

const isImage = (f) =>
  f && ["image/jpeg", "image/jpg", "image/png", "image/webp"].includes(f.type);

const inputCls =
  "w-full rounded-xl border border-line bg-surface px-4 py-3 text-sm text-text placeholder:text-muted outline-none transition focus:border-primary focus:ring-4 focus:ring-ring/25";

const SIZE_OPTIONS = [
  { value: "small", label: "Yığcam", hint: "Kiçik kart" },
  { value: "medium", label: "Standart", hint: "Ən uyğun seçim" },
  { value: "large", label: "Vurğulu", hint: "Böyük kart" },
];

const AchivementModal = ({ modalIsOpen, closeModal, editing = null }) => {
  const { isLoading } = useSelector((state) => state.achivement);
  const [imagePreview, setImagePreview] = useState(null);
  const [achivementImage, setAchivementImage] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const dispatch = useDispatch();
  const isEditing = !!editing;

  const initialState = { title: "", photo: "", about: "", size: "medium" };
  const [achivementForm, setAchivementForm] = useState(initialState);
  const { title, about, size } = achivementForm;

  // Pre-fill the form when the modal opens in edit mode (existing image shown
  // as the preview; it's a remote URL, not a File, so it isn't re-uploaded
  // unless the user picks a new one).
  useEffect(() => {
    if (modalIsOpen && editing) {
      setAchivementForm({
        title: editing.title || "",
        photo: editing.photo || "",
        about: editing.about || "",
        size: editing.size || "medium",
      });
      setAchivementImage(null);
      setImagePreview(editing.photo || null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modalIsOpen, editing]);

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

  const submitForm = async (e) => {
    e.preventDefault();
    // Creating requires an image; editing keeps the existing one unless replaced.
    if (!isEditing && !achivementImage) {
      toast.error("Zəhmət olmasa şəkil əlavə edin.");
      return;
    }
    if (!title.trim()) {
      toast.error("Başlıq boş ola bilməz.");
      return;
    }
    try {
      let imageUrl = isEditing ? editing.photo || "" : "";
      if (achivementImage) {
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
      }

      const data = { title: title.trim(), about, photo: imageUrl, size: size || "medium" };
      if (isEditing) {
        await dispatch(updateAchivement({ achivementId: editing._id, achivementData: data }));
      } else {
        await dispatch(addAchivement(data));
      }
      await dispatch(getAchivements());
      reset();
      closeModal();
    } catch (error) {
      toast.error(error?.message || "Nailiyyət yadda saxlanmadı");
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

  const openFilePicker = () => document.getElementById("imageInput")?.click();

  return (
    <Modal
      isOpen={modalIsOpen}
      onRequestClose={close}
      contentLabel="Nailiyyət əlavə et"
      closeTimeoutMS={150}
      portalClassName="achievement-create-portal"
      overlayClassName="achievement-create-overlay"
      className="achievement-create-dialog"
      style={{
        overlay: {
          backgroundColor: "rgb(0 0 0 / 0.55)",
          backdropFilter: "blur(4px)",
          zIndex: 10000,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "12px",
        },
        content: {
          position: "static",
          inset: "auto",
          border: "none",
          background: "transparent",
          padding: 0,
          overflow: "visible",
          width: "100%",
          maxWidth: "900px",
        },
      }}
    >
      <div className="achievement-create-page h-[100dvh] w-full overflow-y-auto overflow-x-hidden bg-surface text-text md:scrollbar-brand md:h-auto md:max-h-[94vh] md:rounded-3xl md:border md:border-line md:shadow-lift">
        <div className="sticky top-0 z-20 flex min-h-[72px] items-center justify-between gap-4 border-b border-line bg-surface/95 px-5 py-3 backdrop-blur sm:px-7 sm:py-4">
          <div className="flex min-w-0 items-center gap-3.5">
            <span className="relative grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-amber-300/60 bg-amber-50 text-2xl text-amber-700 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-300">
              <PiMedal />
              <PiSparkle className="absolute -right-1.5 -top-1.5 text-sm text-primary" />
            </span>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-amber-700 dark:text-amber-300">
                Uğur vitrini
              </p>
              <h3 className="mt-0.5 truncate font-display text-xl font-bold">
                {isEditing ? "Uğuru düzəlt" : "Yeni uğur hekayəsi"}
              </h3>
              <p className="hidden text-xs text-muted sm:block">
                Şagirdin əməyini görünən və yadda qalan edin.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={close}
            aria-label="Bağla"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-muted transition-colors hover:bg-surface2 hover:text-text focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/30"
          >
            <FiX className="text-lg" />
          </button>
        </div>

        <form onSubmit={submitForm}>
          <div className="grid lg:grid-cols-[0.9fr_1.1fr]">
            <section className="border-b border-line bg-surface2/45 px-5 py-6 sm:p-7 lg:border-b-0 lg:border-r">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-text">Uğur şəkli</p>
                  <p className="mt-0.5 text-xs text-muted">Aydın və keyfiyyətli foto seçin.</p>
                </div>
                {achivementImage && (
                  <span className="flex items-center gap-1 text-xs font-semibold text-success">
                    <PiCheck /> Hazırdır
                  </span>
                )}
              </div>

              {imagePreview ? (
                <div className="group relative min-h-[260px] overflow-hidden rounded-3xl border border-line bg-surface shadow-soft sm:min-h-[300px]">
                  <img
                    src={imagePreview}
                    alt="Seçilmiş uğur şəkli"
                    className="h-[260px] w-full object-cover sm:h-[300px] lg:h-[390px]"
                  />
                  <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-gradient-to-t from-black/80 via-black/35 to-transparent p-4 pt-16">
                    <button
                      type="button"
                      onClick={openFilePicker}
                      className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-xl bg-white/15 px-3.5 text-sm font-semibold text-white backdrop-blur transition-colors hover:bg-white/25 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/35"
                    >
                      <PiUploadSimple className="text-lg" /> Şəkli dəyiş
                    </button>
                    <button
                      type="button"
                      onClick={clearImage}
                      className="grid h-10 w-10 place-items-center rounded-xl bg-black/45 text-white backdrop-blur transition-colors hover:bg-danger"
                      aria-label="Şəkli sil"
                    >
                      <FiX />
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  onDrop={handleDrop}
                  onDragOver={(event) => {
                    event.preventDefault();
                    setDragActive(true);
                  }}
                  onDragLeave={() => setDragActive(false)}
                  className={`group flex min-h-[260px] flex-col items-center justify-center rounded-3xl border-2 border-dashed px-6 py-7 text-center transition-all duration-200 sm:min-h-[300px] lg:min-h-[390px] ${
                    dragActive
                      ? "border-primary bg-primary/10"
                      : "border-line bg-surface hover:border-primary/50 hover:bg-primary/6"
                  }`}
                >
                  <span className="relative grid h-20 w-20 place-items-center rounded-[1.75rem] border border-primary/20 bg-primary/10 text-[36px] text-primary transition-transform duration-200 group-hover:-translate-y-1">
                    {dragActive ? <PiUploadSimple /> : <PiImageSquare />}
                    <PiSparkle className="absolute -right-2 -top-2 text-lg" />
                  </span>
                  <span className="mt-5 text-base font-bold text-text">
                    Şəkli seçin və ya bura sürüşdürün
                  </span>
                  <span className="mt-2 max-w-[28ch] text-sm leading-5 text-muted">
                    JPG, PNG və WEBP. Üfüqi və aydın fotolar vitrində daha yaxşı görünür.
                  </span>
                  <button
                    type="button"
                    onClick={openFilePicker}
                    className="mt-5 inline-flex h-10 items-center gap-2 rounded-xl border border-line bg-surface px-4 text-sm font-semibold text-text shadow-soft transition-colors hover:bg-surface2 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/30"
                  >
                    <PiUploadSimple className="text-lg text-primary" /> Fayl seç
                  </button>
                </div>
              )}
              <input
                type="file"
                className="hidden"
                accept="image/jpeg,image/png,image/webp"
                id="imageInput"
                name="image"
                onChange={(event) => setImage(event.target.files?.[0])}
              />
            </section>

            <section className="flex flex-col px-5 py-7 sm:p-7">
              <div className="space-y-6">
                <div>
                  <label className="mb-2 block text-sm font-bold text-text" htmlFor="title">
                    Başlıq
                  </label>
                  <input
                    value={title}
                    onChange={handleInputChange}
                    type="text"
                    name="title"
                    id="title"
                    placeholder="Məsələn: Respublika olimpiadasında uğur"
                    className={inputCls}
                  />
                  <p className="mt-1.5 text-xs text-muted">
                    Qısa və konkret başlıq hekayəni daha yaddaqalan edir.
                  </p>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold text-text" htmlFor="about">
                    Uğur hekayəsi
                  </label>
                  <textarea
                    value={about}
                    onChange={handleInputChange}
                    name="about"
                    id="about"
                    rows={5}
                    placeholder="Şagirdin nə əldə etdiyini və bu nəticənin niyə vacib olduğunu yazın…"
                    className={`${inputCls} min-h-[132px] resize-y leading-relaxed`}
                  />
                </div>

                <fieldset>
                  <legend className="text-sm font-bold text-text">Vitrində görünüş</legend>
                  <p className="mt-1 text-xs text-muted">
                    Kartın qalereyada nə qədər yer tutacağını seçin.
                  </p>
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    {SIZE_OPTIONS.map((option) => {
                      const selected = size === option.value;
                      return (
                        <label
                          key={option.value}
                          className={`relative cursor-pointer rounded-2xl border p-3 text-left transition-colors focus-within:ring-4 focus-within:ring-ring/25 ${
                            selected
                              ? "border-primary bg-primary/10"
                              : "border-line bg-surface hover:bg-surface2"
                          }`}
                        >
                          <input
                            type="radio"
                            name="size"
                            value={option.value}
                            checked={selected}
                            onChange={handleInputChange}
                            className="sr-only"
                          />
                          <span
                            aria-hidden="true"
                            className={`mb-3 block rounded-md bg-primary/20 ${
                              option.value === "small"
                                ? "h-4 w-6"
                                : option.value === "large"
                                  ? "h-8 w-8"
                                  : "h-6 w-7"
                            }`}
                          />
                          <span className="block text-xs font-bold text-text sm:text-sm">
                            {option.label}
                          </span>
                          <span className="mt-0.5 hidden text-[11px] text-muted sm:block">
                            {option.hint}
                          </span>
                          {selected && (
                            <span className="absolute right-2 top-2 grid h-5 w-5 place-items-center rounded-full bg-primary text-xs text-primary-fg">
                              <PiCheck />
                            </span>
                          )}
                        </label>
                      );
                    })}
                  </div>
                </fieldset>
              </div>

              <div className="mt-8 flex flex-col-reverse gap-2 border-t border-line pb-[calc(1rem+env(safe-area-inset-bottom))] pt-5 sm:flex-row sm:justify-end sm:pb-0">
                <Button
                  type="button"
                  variant="ghost"
                  size="md"
                  onClick={close}
                  className="w-full sm:w-auto"
                >
                  Ləğv et
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  disabled={isLoading}
                  className="w-full sm:w-auto"
                >
                  {isLoading ? <Spinner size={18} /> : isEditing ? "Dəyişiklikləri saxla" : "Hekayəni yayımla"}
                </Button>
              </div>
            </section>
          </div>
        </form>
      </div>
    </Modal>
  );
};
AchivementModal.propTypes = {
  "closeModal": PropTypes.any,
  "modalIsOpen": PropTypes.any,
};

export default AchivementModal;
