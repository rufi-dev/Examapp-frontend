import { useEffect, useState } from 'react'
import { HiUsers } from "react-icons/hi"
import { BiSolidUserCheck, BiUserMinus, BiUserX } from "react-icons/bi"
import { AiFillDelete } from "react-icons/ai"
import PageMenu from '../components/PageMenu'
import Categories from "../components/Categories"
import ClassList from "../components/ClassList"

import { Link, useParams } from 'react-router-dom'
import { AdminTeacherLink } from '../components/protect/hiddenLink'
import useRedirectLoggedOutUser from '../customHook/useRedirectLoggedOutUser'

const Classes = () => {
    useRedirectLoggedOutUser("/login")

    const { tagId } = useParams()
    return (
        <div className="bg-gray-50">
            <div className="mx-auto max-w-screen-2xl px-2 py-10">
                <div className='w-full'>
                    <AdminTeacherLink>
                        <Link to={`/classAdd/${tagId}`} className='bg-[#1084da] border text-white px-6 py-2 rounded-sm ml-auto flex max-w-[180px] mb-5'>Sinif Əlavə et</Link>
                    </AdminTeacherLink>
                    <div>
                        <ClassList />
                    </div>
                </div>

            </div>
        </div >
    )
}

export default Classes;