import React, { useEffect, useState } from 'react';
import { HiUsers } from 'react-icons/hi';
import { BiSolidUserCheck, BiUserMinus, BiUserX } from 'react-icons/bi';
import { AiFillDelete } from 'react-icons/ai';
import PageMenu from '../../components/PageMenu';
import Categories from '../../components/Categories';
import useRedirectLoggedOutUser from '../../customHook/useRedirectLoggedOutUser';
import { useDispatch, useSelector } from 'react-redux';
import { getTags, addExam, getTag, addTag } from '../../../redux/features/quiz/quizSlice';
import { toast } from 'react-toastify';
import { useNavigate, useParams } from 'react-router-dom';

const TagAdd = () => {
    useRedirectLoggedOutUser('/login');
    const navigate = useNavigate()

    const initialState = {
        name: "",
    }
    const [tagForm, setTagForm] = useState(initialState)
    const { name } = tagForm

    const handleInputChange = (e) => {
        const { name, value } = e.target
        setTagForm({ ...tagForm, [name]: value })
    }

    const dispatch = useDispatch()

    useEffect(() => {
        dispatch(getTags())
    }, [dispatch])

    const addTagForm = async (e) => {
        e.preventDefault()

        const tagData = {
            name
        }
        if (name) {
            const addTagData = await dispatch(addTag(tagData))

            if (addTagData.type != "quiz/addTag/rejected") {
                navigate("/tags");
            }
        } else {
            toast.error("All fields are required")
        }
    }
    return (
        <div className="bg-gray-50  flex justify-center py-[200px]">
            <div className="w-full max-w-[1240px] bg-white p-8 rounded-md shadow-md">
                <form onSubmit={addTagForm}>
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700" htmlFor="name">
                            Name:
                        </label>
                        <input
                            value={name}
                            onChange={handleInputChange}
                            type="text"  
                            name='name'
                            id="name"
                            className="mt-1 block w-full border-gray-300 outline-none border px-2 py-1 shadow-sm"
                        />
                    </div>

                    <button
                        type="submit"
                        className="bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 focus:outline-none focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                    >
                        Add Tag
                    </button>
                </form>
            </div>
        </div>
    );
};

export default TagAdd;
