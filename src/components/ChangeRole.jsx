import { useState } from "react"
import { BsCheck2 } from "react-icons/bs"
import { useDispatch, useSelector } from 'react-redux'
import { toast } from 'react-toastify'
import { getUsers, upgradeUser } from '../../redux/features/auth/authSlice'
import { EMAIL_RESET, sendAutomatedEmail } from '../../redux/features/mail/emailSlice'

const ChangeRole = ({ _id, email }) => {
  const dispatch = useDispatch()
  const [userRole, setUserRole] = useState("")
  // Upgrade User
  const changeRole = async (e) => {
    e.preventDefault()
    if (!userRole) {
      return toast.error("Please select a role")
    }
    const userData = {
      role: userRole,
      id: _id
    }
    const emailData = {
      subject: "Account Role Changed - MATH",
      send_to: email,
      reply_to: "noreply@rufi.com",
      template: "changeRole",
      url: "/login",
    };

    // Change password
    const updateUser = await dispatch(upgradeUser(userData))

    if (updateUser.type != "auth/upgradeUser/rejected") {
      await dispatch(sendAutomatedEmail(emailData));
      await dispatch(getUsers());
      await dispatch(EMAIL_RESET());
    }
  }
  return (
    <form onSubmit={(e) => changeRole(e, _id, userRole)}>
      <select value={userRole} onChange={(e) => setUserRole(e.target.value)} name="role" id="role" className='outline-none'>
        <option value="" >-- select --</option>
        <option value="admin" >Admin</option>
        <option value="teacher" >Teacher</option>
        <option value="student" >Student</option>
        <option value="suspended" >Suspended</option>
      </select>
      <button type="submit" className="bg-[#1084da] text-white text-[20px] ml-2 rounded-sm font-bold"><BsCheck2 /></button>
    </form>
  )
}

export default ChangeRole