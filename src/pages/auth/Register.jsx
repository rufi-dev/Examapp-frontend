import { AiTwotoneMail } from "react-icons/ai"
import { RiLockPasswordFill, RiLockPasswordLine } from "react-icons/ri"
import { LiaCheckDoubleSolid } from "react-icons/lia"
import { BsEye, BsEyeSlash } from "react-icons/bs"
import { MdOutlineClose } from "react-icons/md"
import { FaUserAlt } from "react-icons/fa"

import registerImg from "../../assets/signup.png"
import { Link, useNavigate } from 'react-router-dom'
import { useEffect, useState } from "react"
import { toast } from "react-toastify"
import { validateEmail, validatePassword } from "../../../redux/features/auth/authService"
import { useDispatch, useSelector } from "react-redux"
import { RESET, register, sendVerificationEmail } from "../../../redux/features/auth/authSlice"
import Loader from "../../components/Loader"
import Spinner from "../../components/Spinner"

const initialState = {
    name: "",
    email: "",
    password: "",
    //password2: ""
}

const Register = () => {
    const dispatch = useDispatch()
    const navigate = useNavigate()

    const { isLoading, isLoggedIn, isSuccess, message } = useSelector(state => state.auth)

    const [userData, setUserData] = useState(initialState)
    const { name,
         email,
          password,
           //password2
         } = userData

    const handleInputChange = (e) => {
        const { name, value } = e.target
        setUserData({ ...userData, [name]: value })
    }

    // const [uCase, setUcase] = useState(false)
    const [num, setNum] = useState(false)
    // const [sChar, setSChar] = useState(false)
    // const [passLength, setPassLength] = useState(false)


    const wrongIcon = <MdOutlineClose className="text-[red] text-[17px]" />
    const correctIcon = <LiaCheckDoubleSolid className="text-[green] text-[17px]" />

    const switchIcon = (condition) => {
        if (condition) {
            return correctIcon
        }
        return wrongIcon
    }

    const [showPassword, setShowPassword] = useState(false)

    const togglePassword = () => {
        setShowPassword(!showPassword)
    }

    useEffect(() => {
        // if (password.match(/^(?=.*[a-z])(?=.*[A-Z]).*$/)) {
        //     setUcase(true)
        // } else {
        //     setUcase(false)
        // }

        // if (password.match(/([0-9])/)) {
        //     setNum(true)
        // } else {
        //     setNum(false)
        // }

        // if (password.match(/([!@#$%^&*.?,<>/])/)) {
        //     setSChar(true)
        // } else {
        //     setSChar(false)
        // }

        // if (password.length > 5) {
        //     setPassLength(true)
        // } else {
        //     setPassLength(false)
        // }
    }, [password])

    const handleRegister = async (e) => {
        e.preventDefault()

        // Validation
        if (!name || !password || !email) {
            return toast.error("Bütün xanaları doldurun!")
        }
        if (!validatePassword(password)) {
            return toast.error("şifrə ən azı bir rəqəmdən ibarət olmalıdı.")
        }
        if (!validateEmail(email)) {
            return toast.error("Email Hesabı yanlış formatdadır")
        }

        // if (password != password2) {
        //     return toast.error("Passwords do not match")
        // }

        const userData = {
            name, email, password
        }

        await dispatch(register(userData))
        await dispatch(sendVerificationEmail())
    }

    useEffect(() => {
        if (isSuccess && isLoggedIn) {
            navigate("/profile")
        }

        dispatch(RESET())
    }, [isLoggedIn, isSuccess, dispatch, navigate])

    return (
        <div className="md:bg-[#f8f8f8] m-0 h-screen flex items-center justify-center px-5">
            <div className="flex items-center gap-14 mx-auto px-[20px] py-[70px] md:shadow-md md:rounded-md max-w-[1240px] bg-white p-5">
                <div>
                    <h1 className="font-bold text-[30px]">Qeydiyyatdan keç</h1>
                    <form className="mt-[55px]" onSubmit={handleRegister}>
                        <div className="pb-1 flex gap-3 items-center border-b border-black max-w-[300px] sm:max-w-[400px]">
                            <FaUserAlt />
                            <input name="name" value={name} onChange={handleInputChange} required className="tracking-wide focus:placeholder:text-black w-[300px] outline-none" type="text" placeholder="Ad Soyad" />
                        </div>
                        <div className="mt-6 pb-1 flex gap-3 items-center border-b border-black max-w-[300px] sm:max-w-[400px]">
                            <AiTwotoneMail />
                            <input name="email" value={email} onChange={handleInputChange} required className="tracking-wide focus:placeholder:text-black w-[300px] outline-none" type="email" placeholder="Email" />
                        </div>
                        <div className="mt-6 pb-1 flex gap-3 items-center border-b border-black max-w-[300px] sm:max-w-[400px]">
                            <RiLockPasswordFill />
                            <input value={password} name="password"
                                onChange={handleInputChange} className="tracking-wide focus:placeholder:text-black w-[300px] outline-none" type={`${showPassword ? "text" : "password"}`} placeholder="Şifrə" />
                            <div onClick={togglePassword} className="text-[20px] cursor-pointer">
                                {!showPassword
                                    ? <BsEye />
                                    : <BsEyeSlash />
                                }
                            </div>
                        </div>
                        {/* <div className="mt-6 pb-1 flex gap-3 items-center border-b border-black max-w-[300px] sm:max-w-[400px]">
                            <RiLockPasswordLine />
                            <input value={password2} name="password2"
                                onPaste={(e) => {
                                    e.preventDefault()
                                    toast.error("Can't paste into confirm password field")
                                    return false
                                }}
                                onChange={handleInputChange} className="tracking-wide focus:placeholder:text-black w-[300px] outline-none" type={`${showPassword ? "text" : "password"}`} placeholder="Confirm Password" />
                            <div onClick={togglePassword} className="text-[20px] cursor-pointer">
                                {!showPassword
                                    ? <BsEye />
                                    : <BsEyeSlash />
                                }
                            </div>
                        </div> */}
                        {/* <ul className="mt-4 border border-[#96c6f3] p-2 rounded-md text-sm">
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
                        </ul> */}
                        {
                            isLoading ?
                                <button className="bg-[#6dabe4] mt-6 w-[200px] flex justify-center text-white py-3 px-9 rounded-md text-sm" disabled><Spinner /></button>
                                :
                                <button className="bg-[#6dabe4] mt-6 w-[200px] text-center text-white py-3 px-9 rounded-md text-sm hover:bg-[#1084da]" type="submit">Qeydiyyatdan keç</button>
                        }
                    </form>
                    <div className="mt-3">
                        <span>Hesabın var?</span>
                        <Link to="/login" className=" underline ml-2">Giriş et</Link>
                    </div>
                </div>
                <div className="hidden md:block max-w-[500px]">
                    <img loading="lazy" src={registerImg} alt="" className="w-full"/>
                </div>
            </div>
        </div>
    )
}

export default Register