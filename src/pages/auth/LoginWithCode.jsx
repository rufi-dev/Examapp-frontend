import { AiOutlineUnlock } from "react-icons/ai"
import access from "../../assets/accessCode.png"
import { useEffect, useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { useDispatch, useSelector } from "react-redux"
import { toast } from "react-toastify"
import { RESET, loginWithCode, sendLoginCode } from "../../../redux/features/auth/authSlice"

const LoginWithCode = () => {
    const [loginCode, setLoginCode] = useState("")
    const { email } = useParams()

    const dispatch = useDispatch()
    const navigate = useNavigate()

    const { isLoading, isLoggedIn, isSuccess } = useSelector(state => state.auth)

    const sendUserLoginCode = async () => {
        await dispatch(sendLoginCode(email))
        await dispatch(RESET())
    }

    const handleLogin = async (e) => {
        e.preventDefault();
        if (!loginCode) {
            return toast.error("Please enter a login code")
        }
        if (loginCode.length != 6) {
            return toast.error("Access code must be 6 characters")
        }
        const code = {
            loginCode
        }

        await dispatch(loginWithCode({ code, email }))
    }

    useEffect(() => {
        if (isSuccess && isLoggedIn) {
            navigate("/profile")
        }

        dispatch(RESET())
    }, [isLoggedIn, isSuccess, dispatch, navigate])


    return (
        <div className="bg-[#f8f8f8] h-screen flex items-center">
            <div className="flex items-center gap-14 mx-auto px-[100px] py-[70px] shadow-md rounded-md max-w-[1240px] bg-white p-5">
                <div className="w-[350px]">
                    <img src={access} alt="" className="w-full" />
                </div>
                <div>
                    <h1 className="font-bold text-[30px]">Enter Access Code</h1>
                    <form className="mt-[45px]" onSubmit={(e) => handleLogin(e)}>
                        <div className="pb-1 flex gap-3 items-center border-b border-black">
                            <AiOutlineUnlock />
                            <input value={loginCode} name="loginCode" onChange={(e) => setLoginCode(e.target.value)} className="tracking-wide focus:placeholder:text-black w-[300px] outline-none" type="text" placeholder="Access Code" />
                        </div>
                        <button className="bg-[#6dabe4] mt-6 text-white py-3 px-9 rounded-md text-sm hover:bg-[#1084da]" type="submit">Proceed To Login</button>
                        <p className="text-[13px] my-1">Check your email for login access code</p>
                    </form>
                    <div className="mt-5 flex justify-between">
                        <Link to="/" className=" underline ml-2">Home</Link>
                        <button onClick={sendUserLoginCode} className="font-bold ml-2 text-[18px] text-[#1084da]">Resend Code</button>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default LoginWithCode