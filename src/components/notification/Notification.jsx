import { useDispatch } from "react-redux"
import { RESET, sendVerificationEmail } from "../../../redux/features/auth/authSlice"

const Notification = () => {
    const dispatch = useDispatch()
    const sendVerEmail = async () => {
        await dispatch(sendVerificationEmail())
    }

    return (
        <div className="px-8 mx-auto max-w-[1440px]">
            <div className="flex gap-2 w-full bg-[#fac3c3] p-2 border-[red] border rounded-md">
                <p>
                    <b>Message:</b>
                </p>
                <p>
                    To verify your account, check your email for a verification link.
                </p>
                <p onClick={sendVerEmail} className=" text-[#1084da] cursor-pointer">
                    <b>Resend Link</b>
                </p>
            </div>
        </div>
    )
}

export default Notification