import { useEffect, useState } from 'react'
import changePass from '../../assets/changePass.jpg'
import PageMenu from '../../components/PageMenu'
import { RiLockPasswordFill, RiLockPasswordLine } from 'react-icons/ri'
import { BsEye, BsEyeSlash } from 'react-icons/bs'
import useRedirectLoggedOutUser from '../../customHook/useRedirectLoggedOutUser'
import { useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { RESET, changePassword, logout } from '../../../redux/features/auth/authSlice'
import { validatePassword } from '../../../redux/features/auth/authService'
import { MdOutlineClose } from 'react-icons/md'
import { LiaCheckDoubleSolid } from 'react-icons/lia'
import { toast } from 'react-toastify'
import Spinner from '../../components/Spinner'
import { sendAutomatedEmail } from '../../../redux/features/mail/emailSlice'

const initialState = {
    oldPassword: "",
    password: "",
    password2: "",
}

const ChangePassword = () => {
    useRedirectLoggedOutUser("/login")
    const dispatch = useDispatch()
    const navigate = useNavigate()

    const wrongIcon = <MdOutlineClose className="text-[red] text-[17px]" />
    const correctIcon = <LiaCheckDoubleSolid className="text-[green] text-[17px]" />

    const switchIcon = (condition) => {
        if (condition) {
            return correctIcon
        }
        return wrongIcon
    }

    const [formData, setFormData] = useState(initialState)
    const { oldPassword, password, password2 } = formData

    const { isLoading, user, isSuccess, isError } = useSelector(state => state.auth)

    const [uCase, setUcase] = useState(false)
    const [num, setNum] = useState(false)
    const [sChar, setSChar] = useState(false)
    const [passLength, setPassLength] = useState(false)

    const handleInputChange = (e) => {
        const { name, value } = e.target
        setFormData({ ...formData, [name]: value })
    }

    const [showPassword, setShowPassword] = useState(false)

    const togglePassword = () => {
        setShowPassword(!showPassword)
    }

    const updatePassword = async (e) => {
        e.preventDefault()

        if (!oldPassword || !password || !password2) {
            return toast.error("All fields are required")
        }
        if (!validatePassword(password)) {
            return toast.error("Check the validation below")
        }

        if (password != password2) {
            return toast.error("Passwords do not match")
        }
        const userData = {
            oldPassword,
            password,
        };
        const emailData = {
            subject: "Password changed - MATH",
            send_to: user.email,
            reply_to: "noreply@rufi.com",
            template: "changePassword",
            url: "/forgot",
        };

        // Change password
        const changePasswordResult = await dispatch(changePassword(userData))

        if (changePasswordResult.type!="auth/changePassword/rejected") {
            await dispatch(sendAutomatedEmail(emailData));
            await dispatch(logout());
            await dispatch(RESET());
            navigate("/login");
        }
    }
     
    useEffect(() => {
        if (password.match(/^(?=.*[a-z])(?=.*[A-Z]).*$/)) {
            setUcase(true)
        } else {
            setUcase(false)
        }

        if (password.match(/([0-9])/)) {
            setNum(true)
        } else {
            setNum(false)
        }

        if (password.match(/([!@#$%^&*.?,<>/])/)) {
            setSChar(true)
        } else {
            setSChar(false)
        }

        if (password.length > 5) {
            setPassLength(true)
        } else {
            setPassLength(false)
        }
    }, [password])

    return (
        <section className='px-8 mx-auto max-w-[1440px] my-14'>
            <PageMenu />
            <div className='flex gap-5 lg:flex-row flex-col'>
                <div className='max-w-[500px] mx-auto'>
                    <img src={changePass} alt="" className='w-full' />
                </div>
                <form action="" onSubmit={updatePassword} className='w-full'>
                    <div className='flex flex-col mt-2'>
                        <label htmlFor="name">Current Password</label>
                        <div className='border px-3 py-1 flex items-center mt-2'>
                            <input value={oldPassword} name="oldPassword" onChange={handleInputChange} className="w-full outline-none" type={`${showPassword ? "text" : "password"}`} placeholder="Current Password" />
                            <div onClick={togglePassword} className="text-[20px] cursor-pointer">
                                {!showPassword
                                    ? <BsEye />
                                    : <BsEyeSlash />
                                }
                            </div>
                        </div>
                    </div>
                    <div className='flex flex-col mt-2'>
                        <label htmlFor="name">New Password</label>
                        <div className='border px-3 py-1 flex items-center mt-2'>
                            <input value={password} name="password" onChange={handleInputChange} className="w-full outline-none" type={`${showPassword ? "text" : "password"}`} placeholder="New Password" />
                            <div onClick={togglePassword} className="text-[20px] cursor-pointer">
                                {!showPassword
                                    ? <BsEye />
                                    : <BsEyeSlash />
                                }
                            </div>
                        </div>
                    </div>
                    <ul className="mt-4 border border-[#96c6f3] p-2 rounded-md text-sm">
                        <li className="flex gap-2 items-center">
                            {switchIcon(uCase)}
                            Lowercase & Uppercase
                        </li>
                        <li className="flex gap-2 items-center">
                            {switchIcon(num)}
                            Number (0-9)
                        </li>
                        <li className="flex gap-2 items-center">
                            {switchIcon(sChar)}
                            Special Character (!@#$%^&*)
                        </li>
                        <li className="flex gap-2 items-center">
                            {switchIcon(passLength)}
                            At least 6 Characters
                        </li>
                    </ul>
                    <div className='flex flex-col mt-2'>
                        <label htmlFor="name">Confirm New Password</label>
                        <div className='border px-3 py-1 flex items-center mt-2'>
                            <input value={password2} name="password2" onChange={handleInputChange} className="w-full outline-none" type={`${showPassword ? "text" : "password"}`} placeholder="Confirm New Password" />
                            <div onClick={togglePassword} className="text-[20px] cursor-pointer">
                                {!showPassword
                                    ? <BsEye />
                                    : <BsEyeSlash />
                                }
                            </div>
                        </div>
                    </div>
                    {
                        isLoading ?
                            <button className="bg-[#6dabe4] mt-8 w-[150px] h-[40px] flex justify-center text-white py-3 px-9 rounded-md text-sm" disabled><Spinner /></button>
                            :
                            <button type='submit' className='border-[#1084da] mt-8 border-2 font-semibold text-[#1084da] w-[150px] h-[40px]'>Change Password</button>
                    }
                </form>
            </div>
        </section>
    )
}

export default ChangePassword
