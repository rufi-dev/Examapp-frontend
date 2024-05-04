import { useEffect, useState } from "react";
import { HiUsers } from "react-icons/hi";
import { BiSolidUserCheck, BiUserMinus, BiUserX } from "react-icons/bi";
import { AiFillDelete } from "react-icons/ai";
import PageMenu from "../components/PageMenu";
import Categories from "../components/Categories";
import ExamList from "../components/ExamList";

import { Link, useParams } from "react-router-dom";
import { AdminTeacherLink } from "../components/protect/hiddenLink";
import useRedirectLoggedOutUser from "../customHook/useRedirectLoggedOutUser";

const Exams = () => {
  useRedirectLoggedOutUser("/login");

  const { classId } = useParams();
  return (
    <div className="bg-gray-50">
      <div className="mx-auto max-w-screen-2xl px-2 py-10">
        <div className="w-full">
          <AdminTeacherLink>
            <Link
              to={`/examAdd/${classId}`}
              className="bg-[#1084da] border text-white px-6 py-2 rounded-sm ml-auto flex max-w-[180px] mb-5"
            >
              Imtahan Əlavə et
            </Link>
          </AdminTeacherLink>
          <div>
            <ExamList classId={classId} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Exams;
