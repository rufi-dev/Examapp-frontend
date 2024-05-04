import React, { useEffect, useState } from 'react';
import PageMenu from '../../components/PageMenu';
import Categories from '../../components/Categories';
import useRedirectLoggedOutUser from '../../customHook/useRedirectLoggedOutUser';
import { useDispatch, useSelector } from 'react-redux';
import { editTag, getTag } from '../../../redux/features/quiz/quizSlice';
import { toast } from 'react-toastify';
import { useNavigate, useParams } from 'react-router-dom';
import Loader from '../../components/Loader';

const TagEdit = () => {
    useRedirectLoggedOutUser('/login');
    const { singleTag, isLoading } = useSelector(state => state.quiz)
    const navigate = useNavigate()
    const { tagId } = useParams()
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
        if (singleTag) {
            setTagForm({
                name: singleTag.name || "",
            });
        }
    }, [singleTag]);

    useEffect(() => {
        dispatch(getTag(tagId))
    }, [dispatch])

    const editTagForm = async (e) => {
        e.preventDefault()

        const tagData = {
            name
        }

        if (name) {
            const editTagData = await dispatch(editTag({ tagId, tagData }))

            if (editTagData.type != "quiz/editTag/rejected") {
                navigate(-1);
            }
        } else {
            toast.error("All fields are required")
        }
    }

    if (isLoading) {
        return <Loader />
    }
    return (
        <div className="bg-gray-50  flex justify-center py-[200px]">
            <div className="w-full max-w-[1240px] bg-white p-8 rounded-md shadow-md">
                <form onSubmit={editTagForm}>
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
                        Edit Tag
                    </button>
                </form>
            </div>
        </div>
    );
};

export default TagEdit;
