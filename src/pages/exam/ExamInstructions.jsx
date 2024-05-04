import React, { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { getExam } from '../../../redux/features/quiz/quizSlice'
import Loader from '../../components/Loader'
import { toast } from 'react-toastify'
import useRedirectLoggedOutUser from '../../customHook/useRedirectLoggedOutUser'

const ExamInstructions = () => {
    useRedirectLoggedOutUser("login")

    const { singleExam, isLoading } = useSelector(state => state.quiz)
    const { user } = useSelector(state => state.auth)
    const dispatch = useDispatch()
    const navigate = useNavigate()
    const { examId } = useParams()

    useEffect(() => {
        dispatch(getExam(examId));
    }, [dispatch, examId]);

    if (isLoading) {
        return <Loader />;
    }

    const startExam = () => {
        if (!user.isVerified) {
            return toast.error("You are not verified please Verify your Email");
        }
        // if (localStorage.getItem("quizCountdown") != null) {
        //     localStorage.removeItem('quizCountdown');
        // }
        navigate(`/exam/${singleExam?._id}/start`);
    };

    return (
        <div className='container mx-auto max-w-[1240px] py-14 px-5'>
            <div className='bg-white p-10 rounded-lg shadow-md'>
                <h1 className='text-2xl font-bold text-center mb-6'>
                    {singleExam?.name} imtahanı
                </h1>
                <div className='flex justify-center'>
                    <ul className='list-disc pl-6 space-y-2 text-left'>
                        <li>İmtahan {`${Math.floor(singleExam?.duration / 60)} dəqiqə ${singleExam?.duration % 60} saniyə`} ərzində tamamlanmalıdır</li>
                        <li>Ümumi bal: {singleExam?.totalMarks}</li>
                        <li>Keçid balı: {singleExam?.passingMarks}</li>
                        <li>Sual sayı: {singleExam?.questions.length}</li>
                        <li>Hər bir sual {Math.floor(singleExam?.totalMarks / singleExam?.questions.length)} baldır</li>
                        <li>Cavablarınızı təqdim etməzdən əvvəl nəzərdən keçirə bilərsiniz</li>
                        <li>Təqdim edildikdən sonra cavablarınızı nəzərdən keçirə bilərsiniz</li>
                        <li>Təqdim edildikdən sonra yenidən imtahan verə bilərsiniz</li>
                        <li>İmtahan başladıqdan sonra səhifəni yeniləməyin</li>
                    </ul>
                </div>
                <div className='flex justify-center mt-6'>
                    <div onClick={startExam}>
                        <Link className='px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600'>
                            İmtahanı başlat
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ExamInstructions;
