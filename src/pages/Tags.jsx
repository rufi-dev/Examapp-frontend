import { useEffect, useState } from 'react'
import { HiUsers } from "react-icons/hi"
import { BiSolidUserCheck, BiUserMinus, BiUserX } from "react-icons/bi"
import { AiFillDelete } from "react-icons/ai"
import PageMenu from '../components/PageMenu'
import Categories from "../components/Categories"


import { Link } from 'react-router-dom'
import { AdminTeacherLink } from '../components/protect/hiddenLink'

const Tags = () => {
    return (
        <div className=" bg-gray-50">
            <div className="mx-auto max-w-screen-2xl px-2 py-10">
                <div className='w-full'>
                    <AdminTeacherLink>
                        <Link to={`/tagAdd`} className='bg-[#1084da] border text-white px-6 py-2 rounded-sm ml-auto flex w-[110px] mb-5'>Add Tag</Link>
                    </AdminTeacherLink>
                    <Categories />
                </div>
            </div>
        </div >
    )
}

export default Tags