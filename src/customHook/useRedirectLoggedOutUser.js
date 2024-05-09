import { useEffect } from "react"
import { useNavigate } from "react-router-dom"
import authService from "../../redux/features/auth/authService"
import { toast } from "react-toastify"

const useRedirectLoggedOutUser = (path) => {
    const navigate = useNavigate()

    useEffect(() => {
        let isLoggedIn;

        const redirectLoggedOutUser = async () => {
            try {
                isLoggedIn = await authService.getLoginStatus()
            } catch (error) {
                console.log("useRedirect catch:", error.message)
            }
            console.log("useRedirect", isLoggedIn)
            if (!isLoggedIn) {
                toast.info("Session expired, please login to continue")
                navigate(path)
                // navigate()
                return;
            }
        }

        redirectLoggedOutUser()
    }, [path, navigate])
}



export default useRedirectLoggedOutUser