import { useDispatch } from "react-redux"
import verify from "../../assets/verifyAccount.jpg"
import { useNavigate, useParams } from "react-router-dom"
import { verifyUser } from "../../../redux/features/auth/authSlice"


const Verify = () => {
    const dispatch = useDispatch()
    const navigate = useNavigate()
    const { verificationToken } = useParams()
    console.log(verificationToken)
    const verifyAccount = async () => {
        await dispatch(verifyUser(verificationToken))
    }
    return (
        <section className='h-screen bg-[#f7f8fc] w-full'>
            <div className='bg-[#1084da] h-[50%]'></div>
            <div className='w-full flex justify-center px-8'>
                <div className="bg-white max-w-[760px] mt-[-220px] px-8 py-8 rounded-md shadow-md">
                    <h1 className="text-center tracking-[10px] text-[40px]">Welcome!</h1>
                    <div className="flex md:flex-row flex-col items-center gap-8">
                        <img src={verify} loading="lazy" alt="Cofirm image" className="md:max-w-[300px] max-w-[220px] sm:block hidden mx-auto" />
                        <div className="flex flex-col gap-4">
                            <p>We're excited to have you get started. First, you need to verify your account. Just press the button below.</p>
                            <button className="bg-[#1084da] text-white px-7 py-3" onClick={verifyAccount}>Verify Account</button>
                            <p>If that doesn't work, copy and paste the following link in your browser:</p>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}

export default Verify