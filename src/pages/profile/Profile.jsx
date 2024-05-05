import { useEffect, useLayoutEffect, useState } from 'react'
import profile from '../../assets/profile.jpg'
import PageMenu from '../../components/PageMenu'
import useRedirectLoggedOutUser from '../../customHook/useRedirectLoggedOutUser'
import { useDispatch, useSelector } from 'react-redux'
import { getUser, selectUser, updateUser } from '../../../redux/features/auth/authSlice'
import Loader from '../../components/Loader'
import { toast } from 'react-toastify'
import { Link, NavLink } from 'react-router-dom'
import Notification from '../../components/notification/Notification'
import { TailSpin } from 'react-loader-spinner'
import { RiArrowDropDownLine } from 'react-icons/ri'
import Spinner from '../../components/Spinner'

const cloud_name = import.meta.env.VITE_CLOUD_NAME
const upload_preset = import.meta.env.VITE_UPLAD_PRESET

export const shortenText = (text, n) => {
  if (text.length > n) {
    const shortenedText = text.substring(0, n).concat("...")
    return shortenedText
  }
  return text
}

const Profile = () => {
  const dispatch = useDispatch()

  useRedirectLoggedOutUser("/login")

  const { isLoading, isLoggedIn, isSuccess, message, user } = useSelector(state => state.auth)

  const initialState = {
    name: user?.name || "",
    email: user?.email || "",
    phone: user?.phone || "",
    bio: user?.bio || "",
    role: user?.role || "",
    photo: user?.photo || "",
    isVerified: user?.isVerified || false,
  }
  const [profileData, setProfileData] = useState(initialState)
  const [profileImage, setProfileImage] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)

  const { name, email, phone, bio, role, isVerified } = profileData

  const handleImageChange = (e) => {
    setProfileImage(e.target.files[0])
    setImagePreview(URL.createObjectURL(e.target.files[0]))
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setProfileData({ ...profileData, [name]: value })
  }

  const handleUpdate = async (e) => {
    e.preventDefault()
    let imageUrl;
    try {
      if (profileImage !== null && (
        profileImage.type === "image/jpeg" ||
        profileImage.type === "image/jpg" ||
        profileImage.type === "image/png"
      )) {
        const image = new FormData()
        image.append("file", profileImage)
        image.append("cloud_name", cloud_name)
        image.append("upload_preset", upload_preset)

        // Save image to cloudinary
        const response = await fetch(
          `https://api.cloudinary.com/v1_1/${cloud_name}/image/upload`,
          { method: "post", body: image }
        )

        const imgData = await response.json()
        imageUrl = imgData.url.toString()
      }

      // Save profile to MongoDB
      const userData = {
        name: profileData.name,
        phone: profileData.phone,
        bio: profileData.bio,
        photo: profileImage ? imageUrl : profileData.photo
      }
      await dispatch(updateUser(userData))
    } catch (error) {
      toast.error(error.message)
    }
  }


  useLayoutEffect(() => {
    if (user) {
      setProfileData({
        ...profileData,
        name: user.name,
        email: user.email,
        phone: user.phone,
        bio: user.bio,
        role: user.role,
        photo: user.photo,
        isVerified: user.isVerified,
      });
    }
  }, [user]);

  useEffect(() => {
    dispatch(getUser())
  }, [dispatch])

  return (
    <>

      {/* {!profileData.isVerified && <Notification />} */}
      <section className='px-8 mx-auto max-w-[1440px] my-14'>
        <PageMenu />
        {!isLoading && user && isSuccess && (
          <>
            <div className='flex items-center gap-5'>
              <div className='w-[130px]'>
                <label htmlFor="image" className='cursor-pointer'>
                  <img src={imagePreview === null ? user.photo : imagePreview} alt="" className='w-full h-[130px] bg-cover rounded-full shadow-2xl bg-center' />
                </label>
                <input type="file" className='mt-3 hidden' accept='image/*' id='image' name='image' onChange={handleImageChange} />
              </div>
              <div>
                <h3 className='font-bold text-[25px]'>{profileData?.name}</h3>
                <p className='font-semibold'>Role: {profileData?.role}</p>
              </div>
            </div>
            <form action="" className='grid md:grid-cols-2 mt-5 md:gap-10 gap-4' onSubmit={handleUpdate}>
              <div className='flex flex-col col-span-2 md:col-span-1'>
                <label htmlFor="name">Ad və Soyad</label>
                <input type="text" id='name' value={name} onChange={handleInputChange} name='name' className='w-full border px-3 py-1 outline-none' />
              </div>
              <div className='flex flex-col col-span-2 md:col-span-1'>
                <label htmlFor="email">Email</label>
                <input type="email" id='email' disabled value={email} onChange={handleInputChange} name='email' className='border px-3 py-1 outline-none w-full' />
              </div>
              <div className='flex flex-col col-span-2 md:col-span-1'>
                <label htmlFor="phone">Telefon</label>
                <input type="text" id='phone' value={phone} onChange={handleInputChange} name='phone' className='border px-3 py-1 outline-none w-full' />
              </div>
              <div className='flex flex-col col-span-2 md:col-span-1'>
                <label htmlFor="bio">Haqqımda</label>
                <textarea id='bio' value={bio} name='bio' onChange={handleInputChange} className='border px-3 py-1 outline-none w-full' />
              </div>
              <div className='flex justify-between items-center w-full col-span-2'>
                {
                  isLoading ?
                    <button type='submit' className='border-[#1084da] border-2 font-semibold text-[#1084da] w-[150px] h-[40px]'><Spinner /></button>
                    :
                    <button type='submit' className='border-[#1084da] border-2 font-semibold text-[#1084da] w-[150px] h-[40px]'>Yadda Saxla</button>
                }
                <Link to="/tags" className='bg-[#1084da] border-2 font-semibold text-[white] px-4 py-2'>İmtahanlar</Link>
              </div>
            </form>
          </>
        )}
        {isLoading &&
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
          </div>
        }

      </section>
    </>
  )
}

export const UserName = () => {
  const user = useSelector(selectUser)
  const username = user?.name || "..."
  const activeLink = ({ isActive }) => (isActive) ? "text-[#1084da] flex items-center" : "flex items-center"

  return <NavLink to={"/profile"} className={activeLink}>
    Salam, {shortenText(username, 15)}
    <span className="text-[30px]">
      <RiArrowDropDownLine />
    </span>
  </NavLink>
}

export default Profile