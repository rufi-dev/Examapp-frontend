import React, { useState } from 'react'
import Modal from 'react-modal';
import { useDispatch, useSelector } from 'react-redux';
import Spinner from './Spinner';
import { addAchivement, getAchivements } from '../../redux/features/achivement/achivementSlice';
import { toast } from 'react-toastify';

import { HiOutlinePhotograph } from "react-icons/hi"

const cloud_name = import.meta.env.VITE_CLOUD_NAME
const upload_preset = import.meta.env.VITE_UPLAD_PRESET

const AchivementModal = ({ modalIsOpen, closeModal }) => {
    const { isLoading } = useSelector(state => state.achivement)
    const [imagePreview, setImagePreview] = useState(null)
    const [achivementImage, setAchivementImage] = useState(null)
    const dispatch = useDispatch()

    const initialState = {
        title: "",
        photo: "",
        about: "",
        size: ""
    }
    const [achivementForm, setAchivementForm] = useState(initialState)
    const { title, photo, about, size } = achivementForm

    const addAchivementForm = async (e) => {
        e.preventDefault();
        let imageUrl;
        try {
            if (achivementImage !== null && (
                achivementImage.type === "image/jpeg" ||
                achivementImage.type === "image/jpg" ||
                achivementImage.type === "image/png"
            )) {
                const image = new FormData();
                image.append("file", achivementImage); // Use achivementImage here
                image.append("cloud_name", cloud_name);
                image.append("upload_preset", upload_preset);


                // Save image to cloudinary
                const response = await fetch(
                    `https://api.cloudinary.com/v1_1/${cloud_name}/image/upload`,
                    { method: "post", body: image }
                );

                const imgData = await response.json();
                imageUrl = imgData.url.toString();
            }

            // Save profile to MongoDB
            const achivementData = {
                title: achivementForm.title,
                about: achivementForm.about,
                photo: achivementImage ? imageUrl : achivementForm.photo,
                size: achivementForm.size
            }
            await dispatch(addAchivement(achivementData))
            await dispatch(getAchivements())
            closeModal()
        } catch (error) {
            toast.error(error.message)
        }
    }


    const handleImageChange = (e) => {
        setAchivementImage(e.target.files[0])
        setImagePreview(URL.createObjectURL(e.target.files[0]))
    }

    const handleInputChange = (e) => {
        const { name, value } = e.target
        setAchivementForm({ ...achivementForm, [name]: value })
    }

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();

        const imageFile = e.dataTransfer.files[0];
        if (
            imageFile &&
            (imageFile.type === 'image/jpeg' || imageFile.type === 'image/jpg' || imageFile.type === 'image/png')
        ) {
            setAchivementImage(imageFile);
            setImagePreview(URL.createObjectURL(imageFile));
        }
    };

    return (
        <Modal
            className={"z-[10000] max-w-[1200px] px-6 py-6 overflow-y-auto max-h-[80%]"}
            isOpen={modalIsOpen}
            onRequestClose={closeModal}
            contentLabel="Example Modal"
            style={{
                content: {
                    position: "relative",
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                },
            }}
        >
            <div className="w-full max-w-[1240px] bg-white p-8 shadow-md h-full">
                <form onSubmit={addAchivementForm}>
                    <div
                        className="rounded-lg max-h-[600px] cursor-pointer relative overflow-y-auto"
                        onDrop={handleDrop}
                        onDragOver={(e) => e.preventDefault()}
                    >
                        <label
                            htmlFor="imageInput"
                            className="my-8 p-6   w-full h-full flex items-center justify-center rounded-lg border-2 border-dashed border-gray-400 hover:border-blue-500 cursor-pointer"
                        >
                            {imagePreview ? (
                                <img
                                    src={imagePreview}
                                    alt=""
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <div className="flex items-center justify-center h-full flex-col">
                                    <div className="text-[40px] flex items-center justify-center text-gray-400">
                                        <HiOutlinePhotograph />
                                    </div>
                                    <p className="flex items-center justify-center text-gray-400 font-semibold">
                                        Click or drag and drop an image here
                                    </p>
                                </div>
                            )}
                        </label>
                        <input
                            type="file"
                            className="hidden"
                            accept="image/*"
                            id="imageInput"
                            name="image"
                            onChange={handleImageChange}
                        />
                    </div>
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="title">
                            Title:
                        </label>
                        <input
                            value={title}
                            onChange={handleInputChange}
                            type="text"
                            name='title'
                            id="title"
                            className="mt-1 block w-full border-gray-300 outline-none border px-2 py-1 shadow-sm"
                        />
                    </div>
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="about">
                            About:
                        </label>
                        <textarea
                            value={about}
                            onChange={handleInputChange}
                            type="text"
                            name='about'
                            id="about"
                            className="mt-1 block w-full border-gray-300 outline-none border px-2 py-1 shadow-sm"
                        />
                    </div>
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="size">
                            Size:
                        </label>
                        <select
                            value={size}
                            onChange={handleInputChange}
                            name="size"
                            id="size"
                            className="mt-1 block w-full border-gray-300 outline-none border px-2 py-1 shadow-sm"
                        >
                            <option value="">Select size</option>
                            <option value="large">Large</option>
                            <option value="medium">Medium</option>
                            <option value="small">Small</option>
                        </select>
                    </div>
                    {
                        isLoading ?
                            <button className="bg-[#6dabe4] w-[120px] flex justify-center text-white py-2 px-4 rounded-md text-sm" disabled><Spinner /></button>
                            :
                            <button
                                type="submit"
                                className="bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 focus:outline-none focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                            >
                                Add Achivement
                            </button>
                    }

                </form>
            </div>
        </Modal>
    )
}

export default AchivementModal