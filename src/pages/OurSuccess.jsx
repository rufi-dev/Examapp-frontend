import { useEffect, useState } from "react";
import "react-responsive-modal/styles.css";
import { Modal } from "react-responsive-modal";
import { useDispatch, useSelector } from "react-redux";
import {
  deleteAchivement,
  getAchivements,
} from "../../redux/features/achivement/achivementSlice";
import Masonry, { ResponsiveMasonry } from "react-responsive-masonry";
import { AdminTeacherLink } from "../components/protect/hiddenLink";
import AchivementModal from "../components/AchivementModal";
import BluredImage from "../components/BluredImage";
import { AiFillDelete } from "react-icons/ai";
import { TbZoomReset } from "react-icons/tb";
import { FiPlus, FiX, FiZoomIn, FiZoomOut, FiMaximize2, FiArrowRight } from "react-icons/fi";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import Button from "../components/ui/Button";
import Loader from "../components/Loader";

const getImageHeight = (size) => {
  if (size === "large") return "680px";
  if (size === "medium") return "500px";
  if (size === "small") return "380px";
  return "560px";
};

// react-responsive-modal shells, restyled to the design system: transparent,
// padding-less modal (we render our own themed card inside) over a dim, blurred
// overlay. Our own close button lives in the card header (showCloseIcon={false}).
const detailModalStyles = {
  overlay: { background: "rgb(0 0 0 / 0.6)", backdropFilter: "blur(4px)", padding: "16px" },
  modal: {
    padding: 0,
    margin: 0,
    background: "transparent",
    boxShadow: "none",
    maxWidth: "900px",
    width: "100%",
    borderRadius: "24px",
    overflow: "visible",
  },
};
const photoModalStyles = {
  overlay: { background: "rgb(0 0 0 / 0.8)", backdropFilter: "blur(4px)", padding: "12px" },
  modal: {
    padding: 0,
    margin: 0,
    background: "transparent",
    boxShadow: "none",
    maxWidth: "96vw",
    borderRadius: "20px",
    overflow: "visible",
  },
};

const OurSuccess = ({ embedded = false }) => {
  const dispatch = useDispatch();
  const { isLoading, achivements } = useSelector((state) => state.achivement);
  const [open, setOpen] = useState(null);
  const [openPhoto, setOpenPhoto] = useState(false);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(null);
  const [modalIsOpen, setIsOpen] = useState(false);

  const onOpenModal = (index) => setOpen(index);
  const onCloseModal = () => setOpen(null);
  const onOpenPhotoModal = (index) => {
    setOpenPhoto(true);
    setSelectedPhotoIndex(index);
  };
  const onClosePhotoModal = () => {
    setOpenPhoto(false);
    setSelectedPhotoIndex(null);
  };

  useEffect(() => {
    dispatch(getAchivements());
  }, [dispatch]);

  const achivementDelete = async (id) => {
    onCloseModal();
    await dispatch(deleteAchivement(id));
    await dispatch(getAchivements());
  };

  if (isLoading) {
    return <Loader />;
  }

  const addControl = (
    <AdminTeacherLink>
      <Button onClick={() => setIsOpen(true)} variant="primary" size="sm">
        <FiPlus /> Nailiyyət əlavə et
      </Button>
      <AchivementModal modalIsOpen={modalIsOpen} closeModal={() => setIsOpen(false)} />
    </AdminTeacherLink>
  );

  const Wrapper = embedded ? "div" : "section";
  return (
    <Wrapper className={embedded ? "w-full" : "py-12"}>
      <div className={embedded ? "w-full" : "mx-auto w-full max-w-[1200px] px-5 sm:px-8"}>
        {embedded ? (
          <div className="mb-6 flex justify-end">{addControl}</div>
        ) : (
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-[0.18em] text-primary">
                Uğurlarımız
              </span>
              <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-text sm:text-4xl">
                Nailiyyətlərimiz
              </h1>
              <p className="mt-2 text-muted">Tələbələrimizin qazandığı uğurlar.</p>
            </div>
            {addControl}
          </div>
        )}

        {achivements && achivements.length > 0 ? (
          <ResponsiveMasonry columnsCountBreakPoints={{ 350: 1, 750: 2, 900: 3 }}>
            <Masonry gutter="16px">
              {achivements.map((achivement, index) => (
                <div
                  className="animate-fade-in"
                  style={{ height: getImageHeight(achivement.size) }}
                  key={index}
                >
                  {/* ── Card ── */}
                  <div
                    onClick={() => onOpenModal(index)}
                    className="group relative h-full cursor-pointer overflow-hidden rounded-2xl border border-line bg-surface shadow-soft transition-all duration-300 hover:-translate-y-1 hover:shadow-lift"
                  >
                    <BluredImage src={achivement.photo} />
                    {/* permanent readable gradient + title, richer on hover */}
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/35 to-transparent p-5 pt-16">
                      {achivement.title && (
                        <h2 className="font-display text-lg font-bold leading-snug text-white drop-shadow">
                          {achivement.title}
                        </h2>
                      )}
                      <span className="mt-1 flex items-center gap-1 text-sm font-semibold text-white/0 transition-colors duration-300 group-hover:text-white/90">
                        Ətraflı bax <FiArrowRight />
                      </span>
                    </div>
                    <span className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-black/40 text-white opacity-0 backdrop-blur transition-opacity duration-300 group-hover:opacity-100">
                      <FiMaximize2 />
                    </span>
                  </div>

                  {/* ── Detail popup ── */}
                  <Modal
                    open={open === index}
                    onClose={onCloseModal}
                    center
                    showCloseIcon={false}
                    styles={detailModalStyles}
                  >
                    <div className="overflow-hidden rounded-3xl border border-line bg-surface text-text shadow-lift">
                      {/* header */}
                      <div className="flex items-start justify-between gap-4 border-b border-line px-6 py-5">
                        <div className="min-w-0">
                          <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-primary">
                            Uğur hekayəsi
                          </span>
                          <h2 className="mt-1 break-words font-display text-xl font-bold leading-snug sm:text-2xl">
                            {achivement.title}
                          </h2>
                        </div>
                        <button
                          type="button"
                          onClick={onCloseModal}
                          aria-label="Bağla"
                          className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-muted transition-colors hover:bg-surface2 hover:text-text"
                        >
                          <FiX className="text-lg" />
                        </button>
                      </div>

                      {/* body */}
                      <div className="grid gap-0 md:grid-cols-2">
                        {/* image */}
                        <button
                          type="button"
                          onClick={() => onOpenPhotoModal(index)}
                          className="group relative flex items-center justify-center bg-surface2/60 p-4"
                        >
                          <img
                            src={achivement.photo}
                            alt={achivement.title || ""}
                            className="max-h-[58vh] w-auto max-w-full rounded-xl object-contain shadow-soft"
                          />
                          <span className="pointer-events-none absolute bottom-4 right-4 flex items-center gap-1.5 rounded-full bg-black/55 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur transition-opacity duration-300 group-hover:bg-black/70">
                            <FiZoomIn /> Yaxınlaşdır
                          </span>
                        </button>

                        {/* content */}
                        <div className="scrollbar-brand flex max-h-[58vh] min-h-[220px] flex-col overflow-y-auto p-6">
                          <div className="flex items-center justify-between gap-3">
                            <h4 className="font-display text-base font-bold">Haqqında</h4>
                            <AdminTeacherLink>
                              <button
                                onClick={() => achivementDelete(achivement._id)}
                                aria-label="Sil"
                                className="grid h-9 w-9 place-items-center rounded-lg text-danger transition-colors hover:bg-danger/10"
                              >
                                <AiFillDelete className="text-lg" />
                              </button>
                            </AdminTeacherLink>
                          </div>
                          {achivement.about ? (
                            <p className="mt-3 whitespace-pre-line break-words text-[15px] leading-7 text-text/85">
                              {achivement.about}
                            </p>
                          ) : (
                            <p className="mt-3 text-sm italic text-muted">
                              Təsvir əlavə olunmayıb.
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </Modal>

                  {/* ── Fullscreen zoom ── */}
                  <Modal
                    open={openPhoto && selectedPhotoIndex === index}
                    onClose={onClosePhotoModal}
                    center
                    showCloseIcon={false}
                    styles={photoModalStyles}
                  >
                    <TransformWrapper>
                      {({ zoomIn, zoomOut, resetTransform }) => (
                        <div className="relative">
                          <button
                            type="button"
                            onClick={onClosePhotoModal}
                            aria-label="Bağla"
                            className="absolute right-2 top-2 z-10 grid h-10 w-10 place-items-center rounded-full bg-black/50 text-white backdrop-blur transition-colors hover:bg-black/70"
                          >
                            <FiX className="text-lg" />
                          </button>
                          <TransformComponent
                            wrapperClass="!w-full !max-h-[82vh] rounded-2xl"
                            contentClass="!w-full"
                          >
                            <img
                              src={achivement.photo}
                              className="max-h-[82vh] w-auto max-w-[92vw] rounded-2xl object-contain"
                              alt={achivement.title || ""}
                            />
                          </TransformComponent>
                          <div className="mt-3 flex items-center justify-center gap-2">
                            {[
                              { icon: <FiZoomIn />, fn: () => zoomIn(0.2), label: "Böyüt" },
                              { icon: <FiZoomOut />, fn: () => zoomOut(0.2), label: "Kiçilt" },
                              { icon: <TbZoomReset />, fn: () => resetTransform(), label: "Sıfırla" },
                            ].map((b, i) => (
                              <button
                                key={i}
                                type="button"
                                onClick={b.fn}
                                aria-label={b.label}
                                className="grid h-11 w-11 place-items-center rounded-full bg-white/12 text-lg text-white backdrop-blur transition-colors hover:bg-white/25"
                              >
                                {b.icon}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </TransformWrapper>
                  </Modal>
                </div>
              ))}
            </Masonry>
          </ResponsiveMasonry>
        ) : (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-line bg-surface p-16 text-center">
            <span className="grid h-14 w-14 place-items-center rounded-2xl bg-primary/12 text-2xl text-primary">
              <FiMaximize2 />
            </span>
            <p className="font-display text-lg font-bold text-text">Hələlik nailiyyət yoxdur</p>
            <p className="max-w-sm text-sm text-muted">
              Şagird uğurları əlavə olunduqca burada gözəl bir qalereya kimi görünəcək.
            </p>
          </div>
        )}
      </div>
    </Wrapper>
  );
};

export default OurSuccess;
