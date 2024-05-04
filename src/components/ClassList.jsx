import { Link, useParams } from "react-router-dom";
import axios from "axios";
import { useEffect, useState } from "react";
import { LuSchool2 } from "react-icons/lu";
import { useDispatch, useSelector } from "react-redux";
import {
  clearClasses,
  getClassesByTag,
} from "../../redux/features/quiz/quizSlice";
import { AdminTeacherLink } from "./protect/hiddenLink";
import { MdOutlineModeEditOutline } from "react-icons/md";
import { AiFillDelete } from "react-icons/ai";
import { TailSpin, Triangle } from "react-loader-spinner";
import { motion } from "framer-motion";

const ClassList = () => {
  const dispatch = useDispatch();
  const { classes, isLoading, isSuccess, isError } = useSelector(
    (state) => state.quiz
  );
  const { tagId } = useParams();
  useEffect(() => {
    dispatch(clearClasses());
    dispatch(getClassesByTag(tagId));
  }, [dispatch]);
  if (isLoading) {
    return (
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
    );
  }
  const handleDelete = (id) => {};

  
  return (
    <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-2">
      {classes &&
        classes.map((_class, index) => (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: index * 0.2 }}
            key={_class._id}
            className="w-full bg-white border py-2"
          >
            <div className="flex px-3">
              <div className="ml-auto flex gap-4 items-center">
                <AdminTeacherLink>
                  <Link
                    to={`/tag/edit/${_class._id}`}
                    className="text-[orange] text-[20px]"
                  >
                    <MdOutlineModeEditOutline />
                  </Link>
                  <button
                    onClick={() => handleDelete(_class._id)}
                    className="text-[red] text-[20px]"
                  >
                    <AiFillDelete />
                  </button>
                </AdminTeacherLink>
              </div>
            </div>
            <Link
              key={_class._id}
              to={`/exam/${_class._id}`}
              className="py-7 px-2 flex flex-col items-center"
            >
              <div className="flex justify-center items-center w-[50px] h-[50px] bg-gradient-to-tr from-[#2084da] to-[#44d8b1] rounded-full">
                <LuSchool2 className="text-white  fa-solid fa-school text-[24px]" />
              </div>
              <h1 className="font-extrabold text-[17px] mt-2 text-[#373d46] text-center">
                {_class.level === 1 || _class.level === 2
                  ? _class.level + " ci qrup"
                  : _class.level !== 1 || _class.level !== 2
                  ? _class.level + " sinif"
                  : ""}
              </h1>
            </Link>
          </motion.div>
        ))}
    </div>
  );
};

export default ClassList;
