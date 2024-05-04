import React, { useEffect, useState } from 'react';
import { HiUsers } from 'react-icons/hi';
import { BiSolidUserCheck, BiUserMinus, BiUserX } from 'react-icons/bi';
import { AiFillDelete } from 'react-icons/ai';
import PageMenu from '../../components/PageMenu';
import Categories from '../../components/Categories';
import useRedirectLoggedOutUser from '../../customHook/useRedirectLoggedOutUser';
import { useDispatch, useSelector } from 'react-redux';
import { getTags, addExam, getTag, getExam, editExam } from '../../../redux/features/quiz/quizSlice';
import { toast } from 'react-toastify';
import { useNavigate, useParams } from 'react-router-dom';
import { BsCheckLg } from 'react-icons/bs';



const ExamEdit = () => {
    useRedirectLoggedOutUser('/login');
    const { tags, isLoading, isSuccess, isError, singleExam } = useSelector(state => state.quiz)
    const navigate = useNavigate()
    const { examId } = useParams()
    const initialState = {
        name: "",
        duration: 0,
        dedline: null,
        price: 0,
        totalMarks: 0,
        passingMarks: 0,
        tag: { id: singleExam?.tags.map((tag) => tag._id) },
    }
    const [examForm, setExamForm] = useState(initialState)
    const { name, duration, price, dedline, passingMarks, totalMarks, tag } = examForm

    const handleInputChange = (e) => {
        const { name, value } = e.target
        setExamForm({ ...examForm, [name]: value })
    }

    const dispatch = useDispatch()

    useEffect(() => {
        if (singleExam) {
            setExamForm({
                name: singleExam.name || "",
                duration: singleExam.duration || 0,
                dedline: singleExam.dedline || null,
                price: singleExam.price || 0,
                totalMarks: singleExam.totalMarks || 0,
                passingMarks: singleExam.passingMarks || 0,
                tag: singleExam?.tags.map((tag) => tag._id)[0] || null,
            });
        }
    }, [singleExam]);

    useEffect(() => {
        dispatch(getExam(examId))
        dispatch(getTags())
    }, [dispatch])
    const editExamForm = async (e) => {
        e.preventDefault()

        const examData = {
            name,
            duration,
            price,
            dedline,
            passingMarks,
            totalMarks,
            tags: [{
                id: tag
            }]
        }

        if (name && duration && passingMarks && totalMarks) {
            console.log(examData);
            const editExamData = await dispatch(editExam({ examData, examId }))

            if (editExamData.type != "quiz/editExam/rejected") {
                navigate(-1);
            }
        } else {
            toast.error("All fields are required")
        }
    }
    return (
        <div className="bg-gray-50  flex justify-center py-[200px]">
            <div className="w-full max-w-[1240px] bg-white p-8 rounded-md shadow-md">
                <form onSubmit={editExamForm}>
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
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700" htmlFor="duration">
                            Duration:
                        </label>
                        <input
                            value={duration}
                            onChange={handleInputChange}
                            type="number"
                            id="duration"
                            name='duration'
                            className="mt-1 block w-full border-gray-300 outline-none border px-2 py-1 shadow-sm"
                        />
                    </div>
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700" htmlFor="price">
                            Price:
                        </label>
                        <input
                            value={price}
                            onChange={handleInputChange}
                            type="number"
                            id="price"
                            name='price'
                            className="mt-1 block w-full border-gray-300 outline-none border px-2 py-1 shadow-sm"
                        />
                    </div>
                    {/* <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700" htmlFor="dedline">
                            Dedline:
                        </label>
                        <input
                            value={dedline}
                            onChange={handleInputChange}
                            type="date"
                            id="dedline"
                            name='dedline'
                            className="mt-1 block w-full border-gray-300 outline-none border px-2 py-1 shadow-sm"
                        />
                    </div> */}
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700" htmlFor="totalMarks">
                            Total Marks:
                        </label>
                        <input
                            value={totalMarks}
                            onChange={handleInputChange}
                            type="number"
                            id="totalMarks"
                            name='totalMarks'
                            className="mt-1 block w-full border-gray-300 outline-none border px-2 py-1 shadow-sm"
                        />
                    </div>
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700" htmlFor="passingMarks">
                            Passing Marks:
                        </label>
                        <input
                            value={passingMarks}
                            onChange={handleInputChange}
                            type="number"
                            name='passingMarks'
                            id="passingMarks"
                            className="mt-1 block w-full border-gray-300 outline-none border px-2 py-1 shadow-sm"
                        />
                    </div>
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700" htmlFor="tags">
                            Tag:
                        </label>
                        <select
                            value={tag || ''}
                            onChange={handleInputChange}
                            name="tag"
                            id="tag"
                            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm px-2 p-1 outline-none"
                        >
                            <option value="">Select a tag</option>
                            {tags?.map((tag) => (
                                <option key={tag._id} value={tag._id}>
                                    {tag.name}
                                </option>
                            ))}
                        </select>
                    </div>
                    <button
                        type="submit"
                        className="bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 focus:outline-none focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                    >
                        Edit Exam
                    </button>
                </form>
            </div>
        </div>
    );
};

export default ExamEdit;
