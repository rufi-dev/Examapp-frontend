import React, { useEffect } from 'react';
import PageMenu from '../../components/PageMenu';
import { useDispatch, useSelector } from 'react-redux';
import { addExamToUser, deleteMyExam, getExamsByUser } from '../../../redux/features/quiz/quizSlice';
import { AiFillDelete } from 'react-icons/ai';
import { Link, useLocation } from 'react-router-dom';
import Loader from '../../components/Loader';
import { TailSpin } from 'react-loader-spinner';
import { toast } from 'react-toastify';

const MyExams = () => {
    const dispatch = useDispatch();
    const { myExams, isLoading } = useSelector(state => state.quiz);
    const location = useLocation();
    const searchParams = new URLSearchParams(location.search);
    const token = searchParams.get('token');
    const examId = searchParams.get('examId');
    const success = searchParams.get('success');
    useEffect(() => {
        if (token && success) {
            dispatch(addExamToUser({ examId, token }))
        }
        dispatch(getExamsByUser());
    }, [success, token]);

    const deleteExam = async (e, examId) => {
        e.preventDefault()
        await dispatch(deleteMyExam(examId))
        await dispatch(getExamsByUser());
    }

    return (
        <div className='max-w-[1640px] px-4 mx-auto py-10'>
            <PageMenu />
            <div className='text-center font-bold text-3xl mb-6'>My Exams</div>
            {!isLoading &&
                <>
                    {myExams && myExams.length > 0 ? (
                        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
                            {myExams && myExams.map(exam => (
                                <div key={exam._id} className='bg-white border px-4 py-5 rounded-lg shadow-lg'>
                                    <div className="flex justify-between">
                                        <h1 className='font-bold'>{exam.name}</h1>
                                        <div className="flex gap-4 items-center">
                                            <button onClick={(e) => deleteExam(e, exam._id)} className="text-[red] text-[20px]"><AiFillDelete /></button>
                                        </div>
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
                                    <Link to={`/exam/details/${exam._id}`} className='flex text-white w-full justify-center bg-[#1084da] rounded-lg py-2 mt-4'>İmtahana Bax</Link>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className='text-center font-bold text-[40px] mt-8'>No Exams Have Been Added Yet!</div>
                    )}
                </>
            }
            {isLoading &&
                <div className="flex w-full justify-center">
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
        </div>
    );
}

export default MyExams;
