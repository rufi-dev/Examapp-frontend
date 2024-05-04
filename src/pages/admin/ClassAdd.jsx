import React, { useEffect, useState } from 'react';
import { HiUsers } from 'react-icons/hi';
import { BiSolidUserCheck, BiUserMinus, BiUserX } from 'react-icons/bi';
import { AiFillDelete } from 'react-icons/ai';
import PageMenu from '../../components/PageMenu';
import Categories from '../../components/Categories';
import useRedirectLoggedOutUser from '../../customHook/useRedirectLoggedOutUser';
import { useDispatch, useSelector } from 'react-redux';
import { getTags, addExam, getTag, addTag, addClass } from '../../../redux/features/quiz/quizSlice';
import { toast } from 'react-toastify';
import { useNavigate, useParams } from 'react-router-dom';

const ClassAdd = () => {
    useRedirectLoggedOutUser('/login');
    const navigate = useNavigate()
    const { tagId } = useParams();

    const initialState = {
        level: 0,
    }
    const [classForm, setClassForm] = useState(initialState)
    const { level } = classForm

    const handleInputChange = (e) => {
        const { name, value } = e.target
        setClassForm({ ...classForm, [name]: value })
    }

    const dispatch = useDispatch()

    useEffect(() => {
        dispatch(getTags())
    }, [dispatch])

    const addClassForm = async (e) => {
        e.preventDefault()
        const classData = {
            level
        }
        if (level) {
            
            const addClassData = await dispatch(addClass({classData, tagId}))

            if (addClassData.type != "quiz/addClass/rejected") {
                navigate("/class/"+ tagId);
            }
        } else {
            toast.error("All fields are required")
        }
    }
    return (
        <div className="bg-gray-50  flex justify-center py-[200px]">
            <div className="w-full max-w-[1240px] bg-white p-8 rounded-md shadow-md">
                <form onSubmit={addClassForm}>
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700" htmlFor="level">
                            Sinif:
                        </label>
                        <input
                            value={level}
                            onChange={handleInputChange}
                            type="text"  
                            name='level'
                            id="level"
                            className="mt-1 block w-full border-gray-300 outline-none border px-2 py-1 shadow-sm"
                        />
                    </div>

                    <button
                        type="submit"
                        className="bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 focus:outline-none focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                    >
                        Add Class
                    </button>
                </form>
            </div>
        </div>
    );
};

export default ClassAdd;
