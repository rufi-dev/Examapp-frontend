import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useParams } from 'react-router-dom';
import { getQuestionByExam } from '../../redux/features/quiz/quizSlice';
import Loader from './Loader';
import { updateResultAction } from '../../redux/features/quiz/resultSlice';
import { TailSpin } from 'react-loader-spinner';

const Questions = ({ onChecked }) => {
    const dispatch = useDispatch();
    const [checkedOption, setCheckedOption] = useState(null);
    const [checked, setChecked] = useState(undefined)
    const { queue, isLoading, isError, trace } = useSelector((state) => state.quiz);
    const { result } = useSelector((state) => state.result);
    const { examId } = useParams()

    useEffect(() => {
        dispatch(getQuestionByExam(examId))
    }, [dispatch])

    useEffect(() => {
        dispatch(updateResultAction({ trace, checked }))
    }, [checked])

    useEffect(() => {
        // Convert previousAnswer to a number
        const previousAnswer = result[trace] !== undefined ? Number(result[trace]) : -1;

        setCheckedOption(previousAnswer);
        onChecked(previousAnswer);
        setChecked(previousAnswer);
    }, [trace, result]);

    const question = useSelector(
        (state) => state.quiz.queue[state.quiz.trace]
    );

    const onSelect = (optionIndex) => {
        setCheckedOption(optionIndex);
        onChecked(optionIndex);
        setChecked(Number(optionIndex));
    }

    return (
        <div className="flex flex-col items-center">
            <h2 className="text-2xl font-semibold mb-4">{question?.name}</h2>

            <ul className="bg-white shadow rounded-lg w-full p-4">
                {question?.options?.map((option, i) => (
                    <label
                        key={i}
                        htmlFor={`q${i}-option`}
                        className={`border w-full flex mb-4 cursor-pointer  ${checkedOption === i ? 'bg-[#1084da]' : 'hover:bg-[#a2d0f3]'
                            }`}
                    >
                        <li className="flex items-center gap-4 py-2">
                            <input
                                type="radio"
                                checked={checkedOption === i}
                                name="options"
                                id={`q${i}-option`}
                                onChange={() => onSelect(i)}
                                className='hidden'
                            />
                            <span
                                className={`text-gray-800 cursor-pointer ml-3 ${checkedOption === i ? 'text-white' : 'text-gray-800'
                                    }`}
                            >
                                {option.text}
                            </span>
                        </li>
                    </label>
                ))}
            </ul>
        </div>
    );
};

export default Questions;
