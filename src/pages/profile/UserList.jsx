import { useEffect, useState } from 'react'
import { HiUsers } from "react-icons/hi"
import { BiSolidUserCheck, BiUserMinus, BiUserX } from "react-icons/bi"
import { AiFillDelete } from "react-icons/ai"
import PageMenu from '../../components/PageMenu'
import InfoBox from '../../components/InfoBox'
import SearchUser from '../../components/SearchUser'
import ChangeRole from '../../components/ChangeRole'
import useRedirectLoggedOutUser from '../../customHook/useRedirectLoggedOutUser'
import { useDispatch, useSelector } from 'react-redux'
import { CALC_SUSPENDED_USER, CALC_VERIFIED_USER, deleteUser, getUsers } from '../../../redux/features/auth/authSlice'
import { shortenText } from './Profile'
import Loader from '../../components/Loader'
import { confirmAlert } from 'react-confirm-alert';
import 'react-confirm-alert/src/react-confirm-alert.css';
import { FILTER_USERS, selectUsers } from '../../../redux/features/auth/filterSlice'
import ReactPaginate from 'react-paginate';
import { TailSpin } from 'react-loader-spinner'
import { Link } from 'react-router-dom'
import { AdminTeacherLink } from '../../components/protect/hiddenLink'

const UserList = () => {
    useRedirectLoggedOutUser("/login")
    const dispatch = useDispatch()
    const [search, setSearch] = useState("")
    const { isLoading, users, suspendedUsers, verifiedUsers } = useSelector(state => state.auth)
    const unVerifiedUser = users.length - verifiedUsers
    useEffect(() => {
        dispatch(getUsers())


    }, [dispatch])

    useEffect(() => {
        dispatch(CALC_VERIFIED_USER())
        dispatch(CALC_SUSPENDED_USER())
    }, [dispatch, users])

    const filteredUsers = useSelector(selectUsers)
    const removeUser = async (id) => {
        await dispatch(deleteUser(id))
        dispatch(getUsers())
    }

    const confirmDelete = (id) => {
        confirmAlert({
            title: 'Delete this user',
            message: 'Are you sure to delete this user?',
            buttons: [
                {
                    label: 'Delete',
                    onClick: () => removeUser(id)
                },
                {
                    label: 'Cancel',
                }
            ]
        });
    }

    useEffect(() => {
        dispatch(FILTER_USERS({ users, search }))
    }, [dispatch, users, search])

    // Begin Pagination
    const itemsPerPage = 10
    const [itemOffset, setItemOffset] = useState(0);

    const endOffset = itemOffset + itemsPerPage;
    const currentItems = filteredUsers.slice(itemOffset, endOffset);
    const pageCount = Math.ceil(filteredUsers.length / itemsPerPage);

    const handlePageClick = (event) => {
        const newOffset = (event.selected * itemsPerPage) % filteredUsers.length;
        setItemOffset(newOffset);
    };

    //End Pagination

    return (
        <div class=" bg-gray-50">
            <div class="mx-auto max-w-screen-2xl px-2 py-10">
                <PageMenu />
                {isLoading ?
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
                    </div> :
                    <div>
                        <div>
                            <ul className='text-center-3 justify-center grid md:grid-cols-4 grid-cols-2 gap-4 text-white'>
                                <InfoBox icon={<HiUsers />} title={"Total Users"} count={users.length} bgColor={"bg-pink-700"} />
                                <InfoBox icon={<BiSolidUserCheck />} title={"Verified Users"} count={verifiedUsers} bgColor={"bg-green-700"} />
                                <InfoBox icon={<BiUserMinus />} title={"Unverified Users"} count={unVerifiedUser} bgColor={"bg-blue-700"} />
                                <InfoBox icon={<BiUserX />} title={"Suspended Users"} count={suspendedUsers} bgColor={"bg-red-700"} />
                            </ul>
                        </div>
                        <>
                            {
                                !isLoading && users.length === 0 ?
                                    (
                                        <p>No User Found</p>
                                    ) :

                                    <>
                                        <div className="mt-4 w-full">
                                            <div className="flex w-full flex-col items-center justify-between space-y-2 sm:flex-row sm:space-y-0">
                                                <div></div>
                                                <SearchUser value={search} onChange={(e) => setSearch(e.target.value)} />
                                            </div>
                                        </div>

                                        <div class="mt-6 rounded-xl bg-white px-6 shadow lg:px-4">
                                            <div className="overflow-x-scroll scrollbar-thumb-[#888888] scrollbar-thin scrollbar-rounded-[20px]">
                                                <table className="min-w-full border-collapse border-spacing-y-2 border-spacing-x-2">
                                                    <thead className="hidden border-b lg:table-header-group">
                                                        <tr className="">
                                                            <td className="px-2 whitespace-normal py-4 text-sm font-semibold text-gray-800 sm:px-3">
                                                                s/n
                                                            </td>
                                                            <td className="px-2 whitespace-normal py-4 text-sm font-medium text-gray-500 sm:px-3">Name</td>
                                                            <td className="px-2 whitespace-normal py-4 text-sm font-medium text-gray-500 sm:px-3">Email</td>
                                                            <td className="px-2 whitespace-normal py-4 text-sm font-medium text-gray-500 sm:px-3">Phone</td>
                                                            <td className="px-2 whitespace-normal py-4 text-sm font-medium text-gray-500 sm:px-3">Role</td>
                                                            <td className="px-2 whitespace-normal py-4 text-sm font-medium text-gray-500 sm:px-3">Status</td>
                                                            <AdminTeacherLink>
                                                                <td className="px-2 whitespace-normal py-4 text-sm font-medium text-gray-500 sm:px-3">Change Role</td>
                                                                <td className="px-2 whitespace-normal py-4 text-sm font-medium text-gray-500 sm:px-3">Action</td>
                                                            </AdminTeacherLink>
                                                        </tr>
                                                    </thead>

                                                    <tbody className="bg-white lg:border-gray-300">
                                                        {currentItems?.map((user, index) => (
                                                            <tr key={index}>
                                                                <td className="px-2 whitespace-no-wrap py-4 text-left text-sm text-gray-600 sm:px-3 lg:text-left">
                                                                    <b>{index + 1}</b>
                                                                </td>

                                                                <td className={`px-2 whitespace-no-wrap py-4 text-sm font-normal text-gray-600 sm:px-3 table-cell`}>
                                                                    <Link to={`/user/${user._id}/details`}>
                                                                        {shortenText(user.name, 15)}
                                                                    </Link>
                                                                </td>

                                                                <td className="px-2 whitespace-no-wrap py-4 text-sm font-normal text-gray-600 sm:px-3 table-cell">{user.email}</td>
                                                                <td className="px-2 whitespace-no-wrap py-4 text-sm font-normal text-gray-600 sm:px-3 table-cell">{user.phone}</td>

                                                                <td className="px-2 whitespace-no-wrap py-4 text-left text-sm text-gray-600 sm:px-3 table-cell lg:text-left">{user.role}</td>
                                                                <td className="px-2 whitespace-no-wrap py-4 text-left text-sm text-gray-600 sm:px-3 table-cell lg:text-left">
                                                                    {!user.isVerified ? <p className='text-red-500'>Not Verified</p> : <p className='text-green-500'>Verified</p>}
                                                                </td>
                                                                <AdminTeacherLink>
                                                                    <td className="px-2 whitespace-no-wrap py-4 text-left text-sm text-gray-600 sm:px-3 table-cell lg:text-left">
                                                                        <ChangeRole _id={user._id} email={user.email} />
                                                                    </td>
                                                                    <td className="sm:p-3 text-[25px] gap-8 flex ">
                                                                        <button className='text-[red]' onClick={() => confirmDelete(user._id)}><AiFillDelete /></button>
                                                                    </td>
                                                                </AdminTeacherLink>
                                                            </tr>
                                                        ))}

                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                        <>
                                            <ReactPaginate
                                                breakLabel="..."
                                                nextLabel="Next"
                                                onPageChange={handlePageClick}
                                                pageRangeDisplayed={5}
                                                pageCount={pageCount}
                                                previousLabel="Prev"
                                                renderOnZeroPageCount={null}

                                                activeLinkClassName='text-white bg-blue-500 px-4 py-2 rounded'
                                                containerClassName='flex justify-center gap-4 mt-7'
                                                pageLinkClassName='border text-blue-500 px-4 py-2 rounded'
                                                nextLinkClassName='text-blue-500 px-4 py-2 rounded border'
                                                previousLinkClassName='text-blue-500 px-4 py-2 rounded border'
                                                breakClassName='px-4 py-2'
                                            />
                                        </>
                                    </>
                            }
                        </>
                    </div>
                }
            </div>
        </div >
    )
}

export default UserList