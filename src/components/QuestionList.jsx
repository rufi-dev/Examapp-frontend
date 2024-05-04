import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { deleteQuestion, editQuestion, getQuestionByExam } from '../../redux/features/quiz/quizSlice';
import { useParams } from 'react-router-dom';
import { AiFillDelete } from 'react-icons/ai';
import Modal from 'react-modal';
import Spinner from './Spinner';
import { MdModeEdit } from 'react-icons/md';
import { TailSpin } from 'react-loader-spinner';

const QuestionList = () => {
    const dispatch = useDispatch();

    const { queue, isLoading } = useSelector(state => state.quiz);
    const [deleteIndex, setDeleteIndex] = useState(null);

    const { examId } = useParams();

    useEffect(() => {
        dispatch(getQuestionByExam(examId));
    }, [dispatch]);

    const questionDelete = async (id, index) => {
        setDeleteIndex(index);
        await dispatch(deleteQuestion(id));
        dispatch(getQuestionByExam(examId));
        setDeleteIndex(null);
    };

    const [editQuestionModalIndex, setEditQuestionModalIndex] = useState(null);

    const initialState = {
        name: "",
        options: [{ text: "", isCorrect: false }],
    };

    const [questionForm, setQuestionForm] = useState(initialState);
    const [selectedCorrectOption, setSelectedCorrectOption] = useState(0);

    const openModal = (index) => {
        const questionData = queue[index];
        setQuestionForm({
            name: questionData.name,
            options: [...questionData.options],
        });
        setSelectedCorrectOption(questionData.options.findIndex(option => option.isCorrect));
        setEditQuestionModalIndex(index);
    };

    const closeModal = () => {
        setEditQuestionModalIndex(null);
    };

    const handleOptionTextChange = (e, optionIndex) => {
        const newOptions = [...questionForm.options];
        newOptions[optionIndex].text = e.target.value;
        setQuestionForm({ ...questionForm, options: newOptions });
    };

    const handleCorrectOptionChange = (optionIndex) => {
        setSelectedCorrectOption(optionIndex);
    };

    const addOption = () => {
        setQuestionForm({
            ...questionForm,
            options: [...questionForm.options, { text: "", isCorrect: false }],
        });
    };

    const deleteOption = (optionIndex) => {
        if (questionForm.options.length > 2) {
            const newOptions = questionForm.options.filter((_, index) => index !== optionIndex);
            setQuestionForm({ ...questionForm, options: newOptions });
        }
    };

    const editExamForm = async (e, questionId, index) => {
        e.preventDefault();

        const questionData = {
            name: questionForm.name,
            options: questionForm.options.map((option, index) => ({
                text: option.text,
                isCorrect: index === selectedCorrectOption,
            })),
        };

        if (questionForm.name && questionForm.options.every(option => option.text !== '')) {
            const editQuestionData = await dispatch(editQuestion({ questionId, questionData }));

            if (editQuestionData.type !== "quiz/editQuestion/rejected") {
                closeModal();
                dispatch(getQuestionByExam(examId));
            }
        } else {
            // Handle error case
        }
    };

    return (
        <div className='px-[20px]'>
            {queue && queue.map((question, index) => (
                <div key={question._id} className="mb-4">
                    <div className='flex gap-2'>
                        <p className="font-medium">Sual {index + 1}:</p>
                        {isLoading && index === deleteIndex ? (
                            <TailSpin
                                height="20"
                                width="20"
                                color="#FF0000"
                                ariaLabel="tail-spin-loading"
                                radius="1"
                                wrapperStyle={{}}
                                wrapperClass=""
                                visible={true}
                            />
                        ) : (
                            <button onClick={() => questionDelete(question._id, index)} className='text-[red] text-[20px]'><AiFillDelete /></button>
                        )}

                        <button onClick={() => openModal(index)} className='text-[orange] text-[20px]'><MdModeEdit /></button>
                    </div>
                    <p className='my-3'>{question.name}</p>
                    <div className="grid md:grid-cols-2 gap-3">
                        {question.options.map((option, optionIndex) => (
                            <div key={optionIndex} className={`flex items-center ${option.isCorrect ? 'border-[#1084da] border' : ''}`}>
                                <input
                                    type="radio"
                                    name={`question_${index}`}
                                    id={`question_${index}_option${optionIndex}`}
                                    className="hidden"
                                />
                                <label
                                    htmlFor={`question_${index}_option${optionIndex}`}
                                    className={`${option.isCorrect ? 'text-[#1084da]' : 'text-gray-700'} border cursor-pointer bg-gray-50 flex w-full p-2 items-center`}
                                >
                                    {option.text}
                                </label>
                            </div>
                        ))}
                    </div>
                </div>
            ))}
            {queue && queue.map((question, index) => (
                <Modal
                    key={`modal_${question._id}`}
                    className={"z-[10000] max-w-[1200px] px-4"}
                    isOpen={editQuestionModalIndex === index}
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
                    <div className="w-full max-w-[1240px] bg-white p-8 rounded-md shadow-md">
                        <form onSubmit={(e) => editExamForm(e, question._id, index)}>
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="name">
                                    Sual:
                                </label>
                                <textarea
                                    value={questionForm.name}
                                    onChange={(e) => setQuestionForm({ ...questionForm, name: e.target.value })}
                                    type="text"
                                    name='name'
                                    id="name"
                                    className="mt-1 block w-full border-gray-300 outline-none border px-2 py-1 shadow-sm"
                                />
                            </div>
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-2" htmlFor="passingMarks">
                                    Seçimlər:
                                </label>
                                <div className='grid md:grid-cols-2 gap-3'>
                                    {questionForm.options.map((option, optionIndex) => (
                                        <div key={optionIndex} className={`flex items-center`}>
                                            <input
                                                checked={selectedCorrectOption === optionIndex}
                                                onChange={() => handleCorrectOptionChange(optionIndex)}
                                                type="radio"
                                                name={`option_${optionIndex}`}
                                                id={`option_${optionIndex}`}
                                                className="hidden mr-2 text-[40px]"
                                            />
                                            <label htmlFor={`option_${optionIndex}`} className={`${selectedCorrectOption === optionIndex ? "text-blue-500" : "text-gray-700"} border cursor-pointer bg-gray-50 flex w-full p-2 items-center`}>
                                                <input
                                                    value={option.text}
                                                    onChange={(e) => handleOptionTextChange(e, optionIndex)}
                                                    type="text"
                                                    name={`option${optionIndex}`}
                                                    id={`option${optionIndex}`}
                                                    className={`${selectedCorrectOption === optionIndex ? "border-[#1084da] border" : ""} block h-[40px] w-full outline-none border px-2 py-1 shadow-sm`}
                                                />
                                                {questionForm.options.length > 2 && (
                                                    <button
                                                        onClick={() => deleteOption(optionIndex)}
                                                        className="ml-2 text-red-500"
                                                    >
                                                        Delete
                                                    </button>
                                                )}
                                            </label>
                                        </div>
                                    ))}
                                </div>
                                <button onClick={addOption} className="mt-2 bg-gray-200 px-2 py-1 rounded-md text-sm">
                                    Add Option
                                </button>
                            </div>
                            {isLoading ? (
                                <button className="bg-[#6dabe4] w-[120px] flex justify-center text-white py-2 px-4 rounded-md text-sm" disabled>
                                    <Spinner />
                                </button>
                            ) : (
                                <button
                                    type="submit"
                                    className="bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 focus:outline-none focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                                >
                                    Edit Question
                                </button>
                            )}
                        </form>
                    </div>
                </Modal>
            ))}
        </div>
    );
};

export default QuestionList;
