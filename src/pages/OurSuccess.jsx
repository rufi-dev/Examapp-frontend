import React, { useEffect, useState } from 'react'
import project2 from "../assets/project-2.jpg"
import 'react-responsive-modal/styles.css';
import { Modal } from 'react-responsive-modal';
import { useDispatch, useSelector } from 'react-redux';
import { deleteAchivement, getAchivements } from '../../redux/features/achivement/achivementSlice';
import Masonry, { ResponsiveMasonry } from "react-responsive-masonry"
import { AdminTeacherLink } from '../components/protect/hiddenLink';
import AchivementModal from '../components/AchivementModal';
import { TailSpin } from 'react-loader-spinner';
import { motion } from "framer-motion"
import BluredImage from '../components/BluredImage';
import { AiFillDelete, AiOutlineMinus, AiOutlinePlus } from 'react-icons/ai';
import { TbZoomReset } from 'react-icons/tb';
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";

const OurSuccess = () => {
  const dispatch = useDispatch()
  const { isLoading } = useSelector(state => state.achivement)
  const [open, setOpen] = useState(null);
  const [openPhoto, setOpenPhoto] = useState(null);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(null); // State to track the selected photo index

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

  const { achivements } = useSelector(state => state.achivement)


  useEffect(() => {
    dispatch(getAchivements())
  }, [dispatch])

  const getImageHeight = (size) => {
    if (size === 'large') return '700px';
    if (size === 'medium') return '500px';
    if (size === 'small') return '400px';
    return '600px';
  };

  const [modalIsOpen, setIsOpen] = useState(false);

  function openModal() {
    setIsOpen(true);
  }

  function closeModal() {
    setIsOpen(false);
  }

  const achivementDelete = async (id) => {
    await dispatch(deleteAchivement(id))
    await dispatch(getAchivements())
  }


  if (isLoading) {
    return <div className="flex w-full justify-center py-10">
      <TailSpin
        height="130"
        width="130"
        color="#1084da"
        ariaLabel="triangle-loading"
        wrapperStyle={{}}
        wrapperClassName=""
        visible={true}
      />
    </div>
  }

  return (
    <div className='max-w-[1640px] px-4 mx-auto py-6'>
      <div className='text-center font-semibold text-[40px] py-5'>
        <h1>Naliyyətlərimiz</h1>
      </div>
      <AdminTeacherLink>
        <div className='flex justify-end my-2'>
          <button onClick={openModal} className='bg-[#1084da] text-white px-4 py-2 rounded-sm'>Add Achivement</button>
        </div>

        <AchivementModal modalIsOpen={modalIsOpen} closeModal={closeModal} />
      </AdminTeacherLink>
      {achivements &&
        <ResponsiveMasonry
          columnsCountBreakPoints={{ 350: 1, 750: 2, 900: 3 }}
        >
          <Masonry gutter="10px">
            {achivements.map((achivement, index) => (
              <motion.div initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.2 }}
                style={{ height: getImageHeight(achivement.size) }} key={index}>
                <div onClick={() => onOpenModal(index)} className={`cursor-pointer relative group h-full`}>
                  <BluredImage src={achivement.photo} />
                  <div className='absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-black bg-opacity-50 w-full h-full opacity-0 group-hover:opacity-100 flex justify-center items-center transition-opacity duration-300 ease-in-out'>
                    <h1 className='text-white'>{achivement.title}</h1>
                  </div>
                </div>
                <div className='w-[200px]'>
                  <Modal open={open === index} onClose={onCloseModal} center>
                    <div className="flex flex-col items-center ">
                      <div className="gap-10">
                        <h1 className='font-bold text-[20px] break-words max-w-[610px] pb-2'>{achivement.title}</h1>

                      </div>
                      <div className="modal-body">
                        <div className="flex flex-col gap-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div className="col-span-1">
                              <div className="modal_image cursor-pointer" onClick={() => onOpenPhotoModal(index)}>
                                <img src={achivement.photo} alt="" className='max-w-[300px]' />
                              </div>

                            </div>
                            <div className="col-span-1">
                              <div className="max-w-[300px]">
                                <div className='flex justify-between'>
                                  <h4 className='font-semibold text-[20px]'>Haqqında:</h4>
                                  <AdminTeacherLink>
                                    <button onClick={() => achivementDelete(achivement._id)} className='text-[20px] text-[red] flex justify-end'><AiFillDelete /></button>
                                  </AdminTeacherLink>
                                </div>
                                <p className=" break-words">{achivement.about}</p>
                              </div>
                            </div>

                          </div>
                        </div>
                      </div>
                    </div>
                  </Modal>
                  <Modal open={openPhoto && selectedPhotoIndex === index} onClose={onClosePhotoModal} center>
                    <div className="flex justify-center mt-2">
                      <TransformWrapper>
                        {({ zoomIn, zoomOut, resetTransform }) => (
                          <div>
                            <TransformComponent>
                              <img
                                src={achivement.photo}
                                className="w-full rounded-md h-full object-cover"
                                alt=""
                              />
                            </TransformComponent>
                            <div className="flex justify-center mt-2 gap-8">
                              <button onClick={() => zoomIn(0.2)} className="text-[20px]">
                                <AiOutlinePlus />
                              </button>
                              <button onClick={() => zoomOut(0.2)} className="text-[20px]">
                                <AiOutlineMinus />
                              </button>
                              <button onClick={() => resetTransform()} className="text-[20px]">
                                <TbZoomReset />
                              </button>
                            </div>
                          </div>
                        )}
                      </TransformWrapper>
                    </div>
                  </Modal>
                </div>
              </motion.div>
            ))}
          </Masonry>
        </ResponsiveMasonry>
      }
    </div>
  )
}

export default OurSuccess