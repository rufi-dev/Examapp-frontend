// src/ExamResult.js
import React, { useEffect } from 'react';
import useRedirectLoggedOutUser from '../../customHook/useRedirectLoggedOutUser';
import { useDispatch, useSelector } from 'react-redux';
import { getResultsByUser } from '../../../redux/features/quiz/resultSlice';
import Loader from '../../components/Loader';
import PageMenu from '../../components/PageMenu';
import { VscPreview } from 'react-icons/vsc';
import { Link } from 'react-router-dom';

const MyResults = () => {
    useRedirectLoggedOutUser("/login")
    const dispatch = useDispatch()

    const { user } = useSelector(state => state.auth)
    const { result, isLoading } = useSelector(state => state.result)

    useEffect(() => {
        dispatch(getResultsByUser())
    }, [dispatch])

    if (isLoading) return <Loader />

    return (
        <div className='max-w-[1640px] px-4 mx-auto py-10'>
            <PageMenu />
            {user && result && (result.length > 0 ? (
                <div className='overflow-x-scroll scrollbar-thumb-[#888888] scrollbar-thin scrollbar-rounded-[20px]'>
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Attempts</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Exam</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Points</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Result</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {result.map((res) => (
                                <tr key={res?._id}>
                                    <td className="px-6 py-4 whitespace-nowrap">{user?.name}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">{res?.attempts}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">{res?.examId?.name}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">{res?.earnPoints}</td>
                                    <td className="px-6 py-4 whitespace-nowrap flex gap-5">
                                        {/* {res?.isPassed ? (
                                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                                Passed
                                            </span>
                                        ) : (
                                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                                                Failed
                                            </span>
                                        )} */}
                                        <Link to={`/result/${res._id}/review`} className="text-[#1084da] text-[20px]"><VscPreview /></Link>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) :
                <div className='text-center font-bold text-[40px]'>No Results Yet</div>
            )}
        </div>
    );
};

export default MyResults;
