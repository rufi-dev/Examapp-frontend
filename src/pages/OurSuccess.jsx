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
import { AiFillDelete, AiOutlineMinus, AiOutlinePlus } from "react-icons/ai";
import { TbZoomReset } from "react-icons/tb";
import { FiPlus } from "react-icons/fi";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import Button from "../components/ui/Button";
import Loader from "../components/Loader";

const getImageHeight = (size) => {
  if (size === "large") return "700px";
  if (size === "medium") return "500px";
  if (size === "small") return "400px";
  return "600px";
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
    await dispatch(deleteAchivement(id));
    await dispatch(getAchivements());
  };

  if (isLoading) {
    return <Loader />;
  }

  const Wrapper = embedded ? "div" : "section";
  return (
    <Wrapper className={embedded ? "w-full" : "py-12"}>
      <div className={embedded ? "w-full" : "mx-auto w-full max-w-[1200px] px-5 sm:px-8"}>
        {embedded ? (
          // In the dashboard the AccountLayout supplies the title, so only the
          // admin "add" control shows here.
          <AdminTeacherLink>
            <div className="mb-6 flex justify-end">
              <Button onClick={() => setIsOpen(true)} variant="secondary" size="sm">
                <FiPlus /> Nailiyyət əlavə et
              </Button>
              <AchivementModal modalIsOpen={modalIsOpen} closeModal={() => setIsOpen(false)} />
            </div>
          </AdminTeacherLink>
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
            <AdminTeacherLink>
              <Button onClick={() => setIsOpen(true)} variant="secondary" size="sm">
                <FiPlus /> Nailiyyət əlavə et
              </Button>
              <AchivementModal modalIsOpen={modalIsOpen} closeModal={() => setIsOpen(false)} />
            </AdminTeacherLink>
          </div>
        )}

        {achivements && achivements.length > 0 ? (
          <ResponsiveMasonry columnsCountBreakPoints={{ 350: 1, 750: 2, 900: 3 }}>
            <Masonry gutter="14px">
              {achivements.map((achivement, index) => (
                <div
                  className="animate-fade-in"
                  style={{ height: getImageHeight(achivement.size) }}
                  key={index}
                >
                  <div
                    onClick={() => onOpenModal(index)}
                    className="group relative h-full cursor-pointer overflow-hidden rounded-2xl border border-line"
                  >
                    <BluredImage src={achivement.photo} />
                    <div className="absolute inset-0 flex items-end bg-gradient-to-t from-black/70 via-black/10 to-transparent p-5 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                      <h2 className="font-display text-lg font-bold text-white">
                        {achivement.title}
                      </h2>
                    </div>
                  </div>

                  <Modal open={open === index} onClose={onCloseModal} center>
                    <div className="flex flex-col items-center p-2">
                      <h2 className="max-w-[610px] break-words pb-3 font-display text-xl font-bold">
                        {achivement.title}
                      </h2>
                      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                        <div
                          className="cursor-pointer"
                          onClick={() => onOpenPhotoModal(index)}
                        >
                          <img src={achivement.photo} alt="" className="max-w-[300px] rounded-lg" />
                        </div>
                        <div className="max-w-[300px]">
                          <div className="flex items-center justify-between">
                            <h4 className="text-lg font-semibold">Haqqında</h4>
                            <AdminTeacherLink>
                              <button
                                onClick={() => achivementDelete(achivement._id)}
                                className="text-[20px] text-danger"
                              >
                                <AiFillDelete />
                              </button>
                            </AdminTeacherLink>
                          </div>
                          <p className="break-words text-muted">{achivement.about}</p>
                        </div>
                      </div>
                    </div>
                  </Modal>

                  <Modal
                    open={openPhoto && selectedPhotoIndex === index}
                    onClose={onClosePhotoModal}
                    center
                  >
                    <div className="mt-2 flex justify-center">
                      <TransformWrapper>
                        {({ zoomIn, zoomOut, resetTransform }) => (
                          <div>
                            <TransformComponent>
                              <img
                                src={achivement.photo}
                                className="h-full w-full rounded-md object-cover"
                                alt=""
                              />
                            </TransformComponent>
                            <div className="mt-3 flex justify-center gap-8 text-[20px]">
                              <button onClick={() => zoomIn(0.2)}>
                                <AiOutlinePlus />
                              </button>
                              <button onClick={() => zoomOut(0.2)}>
                                <AiOutlineMinus />
                              </button>
                              <button onClick={() => resetTransform()}>
                                <TbZoomReset />
                              </button>
                            </div>
                          </div>
                        )}
                      </TransformWrapper>
                    </div>
                  </Modal>
                </div>
              ))}
            </Masonry>
          </ResponsiveMasonry>
        ) : (
          <div className="rounded-2xl border border-dashed border-line bg-surface p-16 text-center text-muted">
            Hələlik nailiyyət yoxdur.
          </div>
        )}
      </div>
    </Wrapper>
  );
};

export default OurSuccess;
