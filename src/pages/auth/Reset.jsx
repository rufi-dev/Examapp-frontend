import { AiTwotoneMail } from "react-icons/ai"
import reset from "../../assets/resetPass.png"
import { useEffect, useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { MdOutlineClose, MdPassword } from "react-icons/md"
import { BsEye, BsEyeSlash } from "react-icons/bs"
import { useDispatch, useSelector } from "react-redux"
import Spinner from "../../components/Spinner"
import { RESET, resetPassword } from "../../../redux/features/auth/authSlice"
import { validatePassword } from "../../../redux/features/auth/authService"
import { LiaCheckDoubleSolid } from "react-icons/lia"
import { toast } from "react-toastify"

const initialState = {
    password: "",
    password2: ""
}

const Reset = () => {
    const dispatch = useDispatch()
    const navigate = useNavigate()

    const [formData, setFormData] = useState(initialState)
    const { password, password2 } = formData

    const {resetToken}=useParams()

    const wrongIcon = <MdOutlineClose className="text-[red] text-[17px]" />
    const correctIcon = <LiaCheckDoubleSolid className="text-[green] text-[17px]" />

    const switchIcon = (condition) => {
        if (condition) {
            return correctIcon
        }
        return wrongIcon
    }

    const [uCase, setUcase] = useState(false)
    const [num, setNum] = useState(false)
    const [sChar, setSChar] = useState(false)
    const [passLength, setPassLength] = useState(false)

    const { isLoading, message, isSuccess } = useSelector(state => state.auth)

    const handleInputChange = (e) => {
        const { name, value } = e.target
        setFormData({ ...formData, [name]: value })
    }
    const [showPassword, setShowPassword] = useState(false)

    const togglePassword = () => {
        setShowPassword(!showPassword)
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

    const handleReset = async (e) => {
        e.preventDefault();

        // Validation
        if (!password || !password2) {
            return toast.error("Please fill all required fields")
        }

        if (!validatePassword(password)) {
            return toast.error("Check the validation below")
        }

        if (password != password2) {
            return toast.error("Passwords do not match")
        }

        const userData = {
            password
        }

        await dispatch(resetPassword({userData, resetToken}))
    }
    useEffect(() => {
        if (isSuccess && message.includes("reset successful")) {
            navigate("/login")
        }

        dispatch(RESET())
    }, [isSuccess, dispatch, navigate, message])

    return (
        <div className="sm:bg-[#f8f8f8] h-screen flex items-center">
            <div className="flex md:flex-row flex-col-reverse items-center gap-14 mx-auto md:px-[100px] sm:px-[50px] px-4 py-[70px] sm:shadow-md sm:rounded-md max-w-[1240px] bg-white p-5">
                <div className="mx-auto">
                    <h1 className="font-bold sm:text-[30px] text-[25px]">Reset Password</h1>
                    <form className="mt-[45px]" onSubmit={handleReset}>
                        <div className="mt-6 pb-1 flex gap-3 items-center border-b border-black sm:w-[300px] w-[290px]">
                            <MdPassword />
                            <input value={password} name="password" onChange={handleInputChange} className="tracking-wide focus:placeholder:text-black w-[300px] outline-none" type={`${showPassword ? "text" : "password"}`} placeholder="New Password" />
                            <div onClick={togglePassword} className="text-[20px] cursor-pointer">
                                {!showPassword
                                    ? <BsEye />
                                    : <BsEyeSlash />
                                }
                            </div>
                        </div>

                        <div className="mt-6 pb-1 flex gap-3 items-center border-b border-black sm:w-[300px] w-[290px]">
                            <MdPassword />
                            <input value={password2} name="password2" onChange={handleInputChange} className="tracking-wide focus:placeholder:text-black w-[300px] outline-none" type={`${showPassword ? "text" : "password"}`} placeholder="Confirm Password" />
                            <div onClick={togglePassword} className="text-[20px] cursor-pointer">
                                {!showPassword
                                    ? <BsEye />
                                    : <BsEyeSlash />
                                }
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
                        {
                            isLoading ?
                                <button className="bg-[#6dabe4] mt-6 flex justify-center text-white py-3 px-9 rounded-md text-sm" disabled><Spinner /></button>
                                :
                                <button className="bg-[#6dabe4] mt-6 text-white py-3 px-9 rounded-md text-sm hover:bg-[#1084da]" type="submit">Reset Password</button>
                        }
                    </form>
                    <div className="mt-3 flex justify-between">
                        <Link to="/" className=" underline ml-2">Home</Link>
                        <Link to="/login" className=" underline ml-2">Login</Link>
                    </div>
                </div>
                <div className="lg:w-[350px] md:w-[300px] w-[200px] sm:block hidden">
                    <img src={reset} alt="" className="w-full" />
                </div>
            </div>
        </div>
    )
}

export default Reset