import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useParams } from 'react-router-dom';
import { getUserById } from '../../../redux/features/auth/authSlice';
import { VscPreview } from 'react-icons/vsc';
import { addExamToUserById, getExams } from '../../../redux/features/quiz/quizSlice';
import Spinner from '../../components/Spinner';
import Loader from '../../components/Loader';

const UserDetails = () => {
    const { id } = useParams();
    const dispatch = useDispatch();

    const { isLoading, userById } = useSelector(state => state.auth);
    const { exams } = useSelector(state => state.quiz);
    const quiz = useSelector(state => state.quiz);

    useEffect(() => {
        dispatch(getUserById(id));
        dispatch(getExams());
    }, [dispatch]);

    const addExam = async (e, exam) => {
        e.preventDefault()
        const examData = {
            examId: exam._id
        }
        await dispatch(addExamToUserById({ userId: id, examData }))
        dispatch(getExams());
        dispatch(getUserById(id));
    }

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
            <div className="bg-white rounded-lg shadow-md p-6 w-full max-w-[1200px]">
                {!userById && isLoading ? (
                    <p>Loading user details...</p>
                ) : (
                    <div>
                        <h2 className="text-2xl font-semibold mb-4">{userById?.name}</h2>
                        <img
                            src={userById?.photo}
                            alt={`${userById?.name}'s Profile`}
                            className="w-32 h-32 rounded-full mb-4"
                        />
                        <p className="mb-2"><strong>Email:</strong> {userById?.email}</p>
                        <p className="mb-2"><strong>Phone:</strong> {userById?.phone}</p>
                        <p className="mb-2"><strong>Bio:</strong> {userById?.bio}</p>
                        <p className="mb-2"><strong>Role:</strong> {userById?.role}</p>
                        <p className="mb-2"><strong>Verified:</strong> {userById?.isVerified ? 'Yes' : 'No'}</p>

                        <div className="mt-6">
                            <h3 className="text-lg font-semibold mb-2">Exams Bought</h3>
                            {userById?.exams && userById?.exams.length > 0 ? (
                                <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
                                    {userById?.exams && userById?.exams.map(exam => (
                                        <div key={exam._id} className='bg-white border px-4 py-5 rounded-lg shadow-lg'>
                                            <div className="flex justify-between">
                                                <h1 className='font-bold'>{exam.name}</h1>
                                            </div>
                                            <div className='text-sm font-bold text-[#666] mt-2'>
                                                <i className="fa-solid fa-hourglass"></i>
                                                <span className='ml-2'> {`${Math.floor(exam.duration / 60)} minutes ${exam.duration % 60} seconds`}</span>
                                            </div>
                                            <p className='font-bold text-sm mt-3'>Ətraflı</p>

                                            <ul className='text-sm list-disc px-6'>
                                                <li>{exam.questions.length} sual - Dünyanı gəzirəm</li>
                                            </ul>
                                            <hr className='mt-3' />

                                            <div className='mt-3'>
                                                <ul className='flex gap-2 text-sm flex-wrap text-white'>
                                                    {
                                                        exam.tags?.map((tag) => {
                                                            return (
                                                                <li key={tag._id} className='bg-[#1084da] rounded-full px-2'>{tag.name}</li>
                                                            )
                                                        })
                                                    }
                                                </ul>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className='text-center font-bold text-[40px] mt-8'>No Exams Have Been Bought Yet!</div>
                            )}
                        </div>

                        {quiz.isLoading ? <Loader />
                            :
                            <>
                                <div className="mt-6">
                                    <h3 className="text-lg font-semibold mb-2">Results</h3>
                                    <div className='overflow-x-scroll scrollbar-thumb-[#888888] scrollbar-thin scrollbar-rounded-[20px]'>
                                        <table className="min-w-full divide-y divide-gray-200">
                                            <thead className="bg-gray-50">
                                                <tr>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Attempts</th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Exam</th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Points</th>
                                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Result</th>
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white divide-y divide-gray-200">
                                                {userById?.results?.map((res) => (
                                                    <tr key={res?._id}>
                                                        <td className="px-6 py-4 whitespace-nowrap">{res?.attempts}</td>
                                                        <td className="px-6 py-4 whitespace-nowrap">{res?.examId?.name}</td>
                                                        <td className="px-6 py-4 whitespace-nowrap">{res?.earnPoints}</td>
                                                        <td className="px-6 py-4 whitespace-nowrap flex gap-5">
                                                            {res?.isPassed ? (
                                                                <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                                                    Passed
                                                                </span>
                                                            ) : (
                                                                <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                                                                    Failed
                                                                </span>
                                                            )}
                                                            <Link to={`/result/${res._id}/review`} className="text-[#1084da] text-[20px]"><VscPreview /></Link>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                                <div className="mt-6">
                                    <h3 className="text-lg font-semibold mb-2">All Exams</h3>
                                    {exams && exams.length > 0 ? (
                                        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
                                            {exams && exams.map((exam, index) => (
                                                <div key={exam._id} className='bg-white border px-4 py-5 rounded-lg shadow-lg'>
                                                    <div className="flex justify-between">
                                                        <h1 className='font-bold'>{exam.name}</h1>
                                                    </div>
                                                    <div className='text-sm font-bold text-[#666] mt-2'>
                                                        <i className="fa-solid fa-hourglass"></i>
                                                        <span className='ml-2'> {`${Math.floor(exam.duration / 60)} minutes ${exam.duration % 60} seconds`}</span>
                                                    </div>
                                                    <p className='font-bold text-sm mt-3'>Ətraflı</p>

                                                    <ul className='text-sm list-disc px-6'>
                                                        <li>{exam.questions.length} sual</li>
                                                    </ul>
                                                    <hr className='mt-3' />

                                                    <div className='mt-3'>
                                                        <ul className='flex gap-2 text-sm flex-wrap text-white'>
                                                            {
                                                                exam.tags?.map((tag) => {
                                                                    return (
                                                                        <li key={tag._id} className='bg-[#1084da] rounded-full px-2'>{tag.name}</li>
                                                                    )
                                                                })
                                                            }
                                                        </ul>
                                                    </div>
                                                    {
                                                        userById?.exams?.length > 0 && userById?.exams?.some(myExam => myExam._id === exam._id) ? (
                                                            <Link to={`/exam/details/${exam._id}`} className='flex text-white w-full justify-center bg-[#1084da] rounded-lg py-2 mt-4'>İmtahana Bax</Link>
                                                        ) : (
                                                            <button onClick={(e) => addExam(e, exam)} className="flex text-white w-full justify-center bg-[#1084da] rounded-lg py-2 mt-4">Imtahanı əldə et - {exam.price} AZN</button>
                                                        )
                                                    }
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className='text-center font-bold text-[40px] mt-8'>No Exams Added Yet!</div>
                                    )}
                                </div>
                            </>
                        }
                    </div>
                )}
            </div>
        </div>
    );
};

export default UserDetails;
