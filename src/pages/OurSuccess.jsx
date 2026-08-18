import PropTypes from "prop-types";
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
import { selectUser } from "../../redux/features/auth/authSlice";
import AchivementModal from "../components/AchivementModal";
import BluredImage from "../components/BluredImage";
import { TbZoomReset } from "react-icons/tb";
import { FiPlus, FiX, FiZoomIn, FiZoomOut, FiEdit2 } from "react-icons/fi";
import {
  PiArrowUpRight,
  PiCertificate,
  PiChartLineUp,
  PiImagesSquare,
  PiMagnifyingGlassPlus,
  PiMedal,
  PiQuotes,
  PiSparkle,
  PiTrash,
  PiTrophy,
} from "react-icons/pi";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import Button from "../components/ui/Button";
import Loader from "../components/Loader";

const SHOWCASE_IDEAS = [
  {
    icon: PiChartLineUp,
    title: "Güclü nəticə",
    text: "İrəliləyişi və zəhmətin nəticəsini paylaşın.",
  },
  {
    icon: PiCertificate,
    title: "Sertifikat və qəbul",
    text: "Əlamətdar mərhələləri yadda qalan edin.",
  },
  {
    icon: PiTrophy,
    title: "Yarış və layihə",
    text: "Sinfin qürur duyduğu anları bir araya gətirin.",
  },
];

function RecognitionMark() {
  return (
    <span
      aria-hidden="true"
      className="relative grid h-20 w-20 shrink-0 place-items-center rounded-[1.75rem] border border-amber-300/60 bg-amber-50 text-amber-700 shadow-soft dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-300"
    >
      <span className="absolute inset-2 rounded-[1.25rem] border border-amber-300/50 dark:border-amber-300/20" />
      <PiMedal className="relative text-[38px]" />
      <PiSparkle className="absolute -right-2 -top-2 text-xl text-primary" />
    </span>
  );
}

function AchievementSkeleton() {
  return (
    <div className="w-full animate-pulse" data-testid="achievement-skeleton">
      <div className="h-48 rounded-3xl border border-line bg-surface sm:h-40" />
      <div className="mt-6 grid overflow-hidden rounded-3xl border border-line bg-surface lg:grid-cols-[0.78fr_1.22fr]">
        <div className="h-64 bg-surface2/70" />
        <div className="space-y-4 p-7">
          <div className="h-4 w-28 rounded bg-surface2" />
          <div className="h-8 w-2/3 rounded bg-surface2" />
          <div className="h-4 w-full rounded bg-surface2" />
          <div className="h-4 w-4/5 rounded bg-surface2" />
        </div>
      </div>
    </div>
  );
}

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
  overlay: { background: "rgb(15 23 42 / 0.62)", backdropFilter: "blur(8px)", padding: "16px" },
  modal: {
    padding: 0,
    margin: 0,
    background: "transparent",
    boxShadow: "none",
    maxWidth: "1040px",
    width: "100%",
    borderRadius: "32px",
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
  const currentUser = useSelector(selectUser);
  const isAdmin = currentUser?.role === "admin";
  const myId = String(currentUser?._id || "");
  // Any admin/teacher may edit or remove (matches the teacherOnly backend routes).
  const isStaff = isAdmin || currentUser?.role === "teacher";
  const canRemove = (achivement) =>
    isStaff || (achivement?.owner && String(achivement.owner) === myId);
  const [open, setOpen] = useState(null);
  const [openPhoto, setOpenPhoto] = useState(false);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(null);
  const [modalIsOpen, setIsOpen] = useState(false);
  const [editing, setEditing] = useState(null); // achievement being edited (or null = create)

  const openCreate = () => {
    setEditing(null);
    setIsOpen(true);
  };
  const openEdit = (achivement) => {
    onCloseModal();
    setEditing(achivement);
    setIsOpen(true);
  };
  const closeAchModal = () => {
    setIsOpen(false);
    setEditing(null);
  };

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

  // BunkerMath uses static SEO tags in index.html (no per-page Seo component).
  const seoTag = null;

  if (isLoading) {
    // Inside the authenticated account shell, never use the portal-based
    // full-screen loader: it covers the persistent sidebar and makes it appear
    // to unmount. Keep loading feedback inside this page's content region.
    if (embedded) return <AchievementSkeleton />;

    return (
      <>
        {seoTag}
        <Loader />
      </>
    );
  }

  // Approved teachers and admins may share a success story (it appears instantly
  // as a public testimonial); a teacher can later remove only their own, while
  // an admin can remove any. Students/pending teachers get the read-only gallery.
  const addControl = (
    <AdminTeacherLink>
      <Button onClick={openCreate} variant="primary" size="md">
        <FiPlus /> Nailiyyət əlavə et
      </Button>
    </AdminTeacherLink>
  );

  const hasAchievements = Array.isArray(achivements) && achivements.length > 0;
  const Wrapper = embedded ? "div" : "section";
  const HeroHeading = embedded ? "h2" : "h1";
  return (
    <Wrapper className={embedded ? "w-full" : "py-10 sm:py-14"}>
      <div className={embedded ? "w-full" : "mx-auto w-full max-w-[1240px] px-5 sm:px-8"}>
        {seoTag}

        <section className="relative mb-7 overflow-hidden rounded-3xl border border-line bg-surface shadow-soft">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-20 -top-28 h-72 w-72 rounded-full border border-primary/10 bg-primary/6"
          />
          <div className="relative flex flex-col gap-7 p-6 sm:p-8 lg:flex-row lg:items-center lg:justify-between lg:gap-12">
            <div className="flex min-w-0 items-start gap-5 sm:items-center">
              <RecognitionMark />
              <div className="min-w-0">
                <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-amber-700 dark:text-amber-300">
                  Uğur vitrini
                </span>
                <HeroHeading className="mt-1 max-w-2xl font-display text-2xl font-bold leading-tight tracking-tight text-text sm:text-3xl">
                  Əməyi görünən, uğuru yadda qalan edin
                </HeroHeading>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-muted sm:text-base">
                  Şagirdlərin nəticələrini, sertifikatlarını və qürurverici anlarını
                  məktəb icması ilə paylaşın.
                </p>
              </div>
            </div>

            {hasAchievements && <div className="shrink-0">{addControl}</div>}
          </div>

          <div className="relative grid border-t border-line sm:grid-cols-3">
            {[
              ["01", "Nəticəni qeyd edin"],
              ["02", "Hekayəni paylaşın"],
              ["03", "Əməyi tanıdın"],
            ].map(([number, label], index) => (
              <div
                key={number}
                className={`flex items-center gap-3 px-6 py-3.5 text-sm font-semibold text-text ${
                  index ? "border-t border-line sm:border-l sm:border-t-0" : ""
                }`}
              >
                <span className="text-xs font-bold tabular-nums text-primary">{number}</span>
                {label}
              </div>
            ))}
          </div>
        </section>

        {hasAchievements ? (
          <>
            <div className="mb-4 flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">
                  Paylaşılan hekayələr
                </p>
                <p className="mt-1 text-sm text-muted">
                  {achivements.length} nailiyyət vitrindədir
                </p>
              </div>
              <PiImagesSquare className="text-2xl text-primary" aria-hidden="true" />
            </div>
          <ResponsiveMasonry columnsCountBreakPoints={{ 350: 1, 750: 2, 900: 3 }}>
            <Masonry gutter="16px">
              {achivements.map((achivement, index) => (
                <div
                  className="animate-fade-in"
                  style={{ height: getImageHeight(achivement.size) }}
                  key={index}
                >
                  {/* ── Card ── */}
                  <div role="button" tabIndex={0} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); event.currentTarget.click(); } }}
                    onClick={() => onOpenModal(index)}
                    className="group relative h-full cursor-pointer overflow-hidden rounded-3xl border border-line bg-surface shadow-soft transition-all duration-200 ease-out-quint hover:-translate-y-1 hover:shadow-lift focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/30"
                  >
                    <BluredImage src={achivement.photo} />
                    <span className="absolute left-4 top-4 flex items-center gap-2 rounded-full bg-black/55 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-white backdrop-blur">
                      <PiMedal className="text-base" /> Uğur hekayəsi
                    </span>
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent p-5 pt-20">
                      {achivement.title && (
                        <h2 className="font-display text-xl font-bold leading-snug text-white drop-shadow">
                          {achivement.title}
                        </h2>
                      )}
                      <span className="mt-2 flex items-center gap-1.5 text-sm font-semibold text-white/90">
                        Hekayəni oxu <PiArrowUpRight className="text-base" />
                      </span>
                    </div>
                  </div>

                  {/* ── Detail popup — ONLY the active card mounts a modal, so N
                       cards no longer mount N modal portals (that froze the page). ── */}
                  {open === index && (
                  <Modal
                    open
                    onClose={onCloseModal}
                    center
                    showCloseIcon={false}
                    styles={detailModalStyles}
                    classNames={{
                      root: "achievement-detail-root",
                      overlay: "achievement-detail-overlay",
                      modal: "achievement-detail-modal",
                    }}
                  >
                    <article className="achievement-detail-page relative h-[100dvh] max-h-none overflow-y-auto bg-surface text-text md:h-auto md:max-h-[92vh] md:overflow-hidden md:rounded-[2rem] md:border md:border-line md:shadow-lift">
                      <header className="sticky top-0 z-30 flex h-[72px] items-center justify-between border-b border-line bg-surface/95 px-5 backdrop-blur md:hidden">
                        <div className="flex items-center gap-3">
                          <span
                            aria-hidden="true"
                            className="grid h-10 w-10 place-items-center rounded-2xl border border-amber-300/60 bg-amber-50 text-xl text-amber-800"
                          >
                            <PiMedal />
                          </span>
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-amber-800">
                              Uğur vitrini
                            </p>
                            <p className="mt-0.5 font-display text-sm font-bold">Uğur hekayəsi</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={onCloseModal}
                          aria-label="Bağla"
                          className="grid h-11 w-11 place-items-center rounded-full border border-line bg-surface text-muted transition-colors hover:bg-surface2 hover:text-text focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/30"
                        >
                          <FiX className="text-xl" />
                        </button>
                      </header>

                      <button
                        type="button"
                        onClick={onCloseModal}
                        aria-label="Bağla"
                        className="absolute right-5 top-5 z-20 hidden h-11 w-11 place-items-center rounded-full border border-line bg-surface/95 text-muted shadow-soft transition-colors hover:bg-surface2 hover:text-text focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/30 md:grid"
                      >
                        <FiX className="text-xl" />
                      </button>

                      <div className="grid md:min-h-[580px] md:grid-cols-[0.94fr_1.06fr]">
                        <button
                          type="button"
                          onClick={() => onOpenPhotoModal(index)}
                          aria-label="Şəkli böyüt"
                          className="group relative flex min-h-[330px] items-center justify-center overflow-hidden border-b border-line bg-surface2 px-5 pb-[76px] pt-6 text-left focus-visible:z-10 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-ring/30 sm:min-h-[390px] sm:px-8 md:min-h-[580px] md:border-b-0 md:border-r md:px-10 md:pb-24 md:pt-24"
                        >
                          <span
                            aria-hidden="true"
                            className="absolute -left-20 -top-16 h-64 w-64 rounded-full border border-primary/10"
                          />
                          <span
                            aria-hidden="true"
                            className="absolute -bottom-24 -right-16 h-72 w-72 rounded-full border border-amber-400/15"
                          />
                          <span className="absolute left-8 top-7 hidden items-center gap-2 rounded-full border border-amber-300/60 bg-amber-50 px-3 py-2 text-[11px] font-bold uppercase tracking-[0.14em] text-amber-800 shadow-soft md:flex">
                            <PiMedal className="text-lg" aria-hidden="true" />
                            Seçilmiş uğur
                          </span>
                          <img
                            src={achivement.photo}
                            alt={achivement.title || ""}
                            className="relative max-h-[245px] w-auto max-w-full rounded-[1.4rem] border border-line/80 object-contain shadow-lift transition-transform duration-300 ease-out-quint group-hover:scale-[1.015] sm:max-h-[300px] md:max-h-[430px]"
                          />
                          <span className="absolute bottom-4 left-5 right-5 flex items-center justify-between rounded-2xl border border-line bg-surface px-4 py-3 text-sm font-semibold text-text shadow-soft transition-colors group-hover:border-primary/35 group-hover:text-primary sm:bottom-7 sm:left-8 sm:right-8">
                            Şəkli tam ölçüdə aç
                            <PiMagnifyingGlassPlus className="text-xl" aria-hidden="true" />
                          </span>
                        </button>

                        <div className="flex min-h-0 flex-col px-5 py-8 sm:px-9 sm:py-10 md:max-h-[580px] md:px-10 md:pb-9 md:pt-24">
                          <div className="shrink-0">
                            <div className="mb-4 flex items-center gap-3 sm:mb-5">
                              <span
                                aria-hidden="true"
                                className="grid h-12 w-12 place-items-center rounded-2xl border border-primary/15 bg-primary/8 text-primary"
                              >
                                <PiQuotes className="text-2xl" />
                              </span>
                              <div>
                                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary">
                                  Uğur hekayəsi
                                </p>
                                <p className="mt-0.5 text-xs text-muted">Əməyi görünən edən an</p>
                              </div>
                            </div>
                            <h2 className="break-words font-display text-2xl font-bold leading-tight tracking-tight sm:text-3xl">
                              {achivement.title}
                            </h2>
                            <div className="my-5 h-px bg-line sm:my-6" />
                            <h3 className="font-display text-sm font-bold uppercase tracking-[0.12em] text-muted">
                              Bu uğurun hekayəsi
                            </h3>
                          </div>

                          <div className="mt-3 min-h-0 flex-1 overflow-visible pr-1 md:scrollbar-brand md:overflow-y-auto">
                            {achivement.about ? (
                              <p className="max-w-[68ch] whitespace-pre-line break-words text-[15px] leading-7 text-text/85 sm:text-base sm:leading-8">
                                {achivement.about}
                              </p>
                            ) : (
                              <p className="text-sm italic text-muted">Təsvir əlavə olunmayıb.</p>
                            )}
                          </div>

                          {achivement.ownerName && (
                            <div className="mt-6 flex items-center gap-3 border-t border-line pt-5">
                              <span
                                aria-hidden="true"
                                className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-primary/20 bg-primary/10 text-xs font-bold text-primary"
                              >
                                {String(achivement.ownerName).trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase()}
                              </span>
                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-text">
                                  {achivement.ownerName}
                                </p>
                                <p className="text-xs text-muted">Uğuru paylaşdı</p>
                              </div>
                            </div>
                          )}

                          {canRemove(achivement) && (
                            <div className="mt-4 flex items-center gap-2 border-t border-line pt-4">
                              <button
                                type="button"
                                onClick={() => openEdit(achivement)}
                                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-line px-3 text-[13px] font-semibold text-text transition-colors hover:border-primary/50 hover:bg-primary/5 hover:text-primary"
                              >
                                <FiEdit2 className="text-[15px]" aria-hidden="true" /> Düzəliş
                              </button>
                              <button
                                type="button"
                                onClick={() => achivementDelete(achivement._id)}
                                className="inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-[13px] font-semibold text-muted transition-colors hover:bg-danger/8 hover:text-danger"
                              >
                                <PiTrash className="text-base" aria-hidden="true" /> Sil
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </article>
                  </Modal>
                  )}

                  {/* ── Fullscreen zoom — likewise only the active photo mounts. ── */}
                  {openPhoto && selectedPhotoIndex === index && (
                  <Modal
                    open
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
                  )}
                </div>
              ))}
            </Masonry>
          </ResponsiveMasonry>
          </>
        ) : (
          <section className="grid overflow-hidden rounded-3xl border border-line bg-surface shadow-soft lg:grid-cols-[0.8fr_1.2fr]">
            <div className="relative grid min-h-[280px] place-items-center overflow-hidden bg-primary/6 p-8 sm:min-h-[340px]">
              <span
                aria-hidden="true"
                className="absolute h-64 w-64 rounded-full border border-primary/15"
              />
              <span
                aria-hidden="true"
                className="absolute h-44 w-44 rounded-full border border-primary/20"
              />
              <div className="relative text-center">
                <span className="mx-auto grid h-28 w-28 place-items-center rounded-[2.25rem] border border-primary/25 bg-surface text-primary shadow-lift">
                  <PiTrophy className="text-[58px]" />
                </span>
                <p className="mt-5 text-xs font-bold uppercase tracking-[0.16em] text-primary">
                  Vitrin hazırdır
                </p>
              </div>
            </div>

            <div className="flex flex-col justify-center p-6 sm:p-9 lg:p-10">
              <span className="text-xs font-bold uppercase tracking-[0.16em] text-amber-700 dark:text-amber-300">
                İlk hekayəni paylaşın
              </span>
              <h3 className="mt-2 max-w-xl font-display text-2xl font-bold leading-tight text-text sm:text-3xl">
                Şagirdlərin uğuru burada yaşayacaq
              </h3>
              <p className="mt-3 max-w-xl text-sm leading-6 text-muted sm:text-base">
                Bir nəticə, sertifikat və ya layihə fotosu əlavə edin. Vitrin böyüdükcə
                şagirdlər öz əməyinin dəyərini daha aydın görəcək.
              </p>

              <div className="mt-6 divide-y divide-line border-y border-line">
                {SHOWCASE_IDEAS.map(({ icon: Icon, title, text }) => (
                  <div key={title} className="flex items-start gap-3 py-3.5">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-xl text-primary">
                      <Icon />
                    </span>
                    <div>
                      <p className="text-sm font-bold text-text">{title}</p>
                      <p className="mt-0.5 text-sm leading-5 text-muted">{text}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6">{addControl}</div>
            </div>
          </section>
        )}

        {/* One shared create/edit modal (mounted for staff only). */}
        <AdminTeacherLink>
          <AchivementModal
            modalIsOpen={modalIsOpen}
            closeModal={closeAchModal}
            editing={editing}
          />
        </AdminTeacherLink>
      </div>
    </Wrapper>
  );
};
OurSuccess.propTypes = {
  "embedded": PropTypes.bool,
};

export default OurSuccess;
