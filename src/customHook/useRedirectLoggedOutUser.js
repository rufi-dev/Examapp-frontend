import { useEffect } from "react"
import { useNavigate } from "react-router-dom"
import authService from "../../redux/features/auth/authService"
import { toast } from "react-toastify"

const useRedirectLoggedOutUser = (path) => {
    const navigate = useNavigate()

    useEffect(() => {
        let cancelled = false

        const redirectLoggedOutUser = async () => {
            let isLoggedIn
            let resolved = false
            try {
                isLoggedIn = await authService.getLoginStatus()
                resolved = true
            } catch (error) {
                // Network / server hiccup — the login status is UNKNOWN, not "logged
                // out". Do NOT redirect (a transient blip must never kick a student to
                // /login mid-exam-prep). Only a CONFIRMED false redirects.
                console.log("useRedirect catch:", error.message)
            }
            if (cancelled) return
            if (resolved && !isLoggedIn) {
                toast.info("Session expired, please login to continue")
                navigate(path)
            }
        }

        redirectLoggedOutUser()
        return () => { cancelled = true }
    }, [path, navigate])
}



export default useRedirectLoggedOutUser