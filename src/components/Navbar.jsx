import { useEffect, useState } from "react";
import logo2 from "../assets/mathlogo2.png";
import logo from "../assets/logomath.png";
import { Link, NavLink, useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import { TailSpin, Triangle } from "react-loader-spinner";
import { RxHamburgerMenu } from "react-icons/rx"
import { GrClose } from "react-icons/gr"
import { RiArrowDropDownLine } from "react-icons/ri"
import { useDispatch, useSelector } from "react-redux";
import { RESET, logout } from "../../redux/features/auth/authSlice";
import { ShowOnLogin, ShowOnLogout } from "./protect/hiddenLink";
import { UserName } from "../pages/profile/Profile";
import Spinner from "./Spinner";

const Navbar = () => {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { isLoading } = useSelector(state => state.auth);

  const [toggleMenu, setToggleMenu] = useState(false);

  const handleClick = () => {
    setToggleMenu(!toggleMenu);
  };

  const handleLogout = async () => {
    dispatch(RESET())

    await dispatch(logout())
    navigate("/login")
  }

  return (
    <nav className="px-4 max-w-[1440px] mx-auto sticky top-0">
      <div className="flex items-center justify-between">
        <div className="w-[60px]">
          <Link to="/" className="">
            <img src={logo} alt="" className="filter w-full" />
          </Link>
        </div>
        <div className="lg:flex hidden">
          <ul className="flex gap-6 font-semibold text-lg">
            <Link to="/">
              <li>Ana səhifə</li>
            </Link>
            <Link to="/ourSuccess">
              <li>Uğurlarımız</li>
            </Link>
            <Link to="/tags">
              <li>İmtahanlar</li>
            </Link>
            <Link to="/">
              <li>Kitablar</li>
            </Link>
            <Link to="/">
              <li>Əlaqə</li>
            </Link>
          </ul>
        </div>
        <div className="flex gap-5">
          {isLoading ? <TailSpin
            height="40"
            width="40"
            color="#1084da"
            ariaLabel="tail-spin-loading"
            radius="1"
            wrapperStyle={{}}
            wrapperClass=""
            visible={true}
          /> :
            <div className="gap-3 flex">
              <div className="flex items-center gap-5">
                <ShowOnLogin>
                  <div className="font-semibold">
                    <UserName />
                  </div>
                </ShowOnLogin>
              </div>
              <div className="lg:flex gap-3 hidden">
                <ShowOnLogout>
                  <Link
                    to="/login"
                    className="rounded-md text-[#1084da] flex items-center text-[18px] px-4 py-2 border-[#1084da] border-2 font-bold whitespace-nowrap"
                  >
                    Daxil ol
                  </Link>
                  <Link
                    to="/register"
                    className="rounded-md text-white flex items-center text-[18px] px-4 py-2 bg-[#1084da] font-bold whitespace-nowrap"
                  >
                    Qeydiyyat
                  </Link>
                </ShowOnLogout>
                <ShowOnLogin>
                  <button
                    onClick={handleLogout}
                    className="rounded-md text-white flex items-center text-[18px] px-4 py-2 bg-[#1084da] font-bold whitespace-nowrap"
                  >
                    Çıxış et
                  </button>
                </ShowOnLogin>
              </div>
            </div>
          }

          <div className="lg:hidden flex text-[30px] ">
            <button
              onClick={handleClick}
              className="fa-solid fa-bars"
            >
              <RxHamburgerMenu />
            </button>
          </div>
        </div>
        <div
          className={`z-[1000] fixed lg:hidden top-0 ${toggleMenu ? "left-0" : "left-[-100%]"
            } duration-300 drop-shadow bg-white h-screen w-[100%] sm:w-[80%] md:w-[70%] border`}
        >
          <div className="p-4 w-full flex items-center justify-between">
            <Link to="/" className="w-[140px]">
              <img src={logo} alt="" className="w-full" />
            </Link>
            <button
              onClick={handleClick}
              className="fa-solid fa-xmark text-[25px] text-[#6a7695]"
            >
              <GrClose />
            </button>
          </div>
          <ul className="flex select-none flex-col gap-4 p-4 mt-6">
            <li className="text-[16px] sm:text-[18px] border-b-2 border-black-500 py-1">
              <Link onClick={handleClick} to={"/"}>Ana səhifə</Link>
            </li>
            <li className="py-1 text-[16px] sm:text-[18px] border-b-2 border-black-500">
              <Link onClick={handleClick} to={"/ourSuccess"}>Uğurlarımız</Link>
            </li>
            <li className="py-1 text-[16px] sm:text-[18px] border-b-2 border-black-500">
              <Link onClick={handleClick} to={"/tags"}>İmtahanlar</Link>
            </li>
            <li className="py-1 text-[16px] sm:text-[18px] border-b-2 border-black-500">
              <Link onClick={handleClick} to={"/"}>Kitablar</Link>
            </li>
            <li className="py-1 text-[16px] sm:text-[18px] border-b-2 border-black-500">
              <Link onClick={handleClick} to={"/"}>Əlaqə</Link>
            </li>
            <div className="gap-3 flex">

              <>
                <ShowOnLogout>
                  <Link
                    to="/login"
                    className="rounded-md text-[#1084da] flex items-center text-[18px] px-4 py-2 border-[#1084da] border-2 font-bold whitespace-nowrap"
                  >
                    Daxil ol
                  </Link>
                  <Link
                    to="/register"
                    className="rounded-md text-white flex items-center text-[18px] px-4 py-2 bg-[#1084da] font-bold whitespace-nowrap"
                  >
                    Qeydiyyat
                  </Link>
                </ShowOnLogout>
                <ShowOnLogin>
                  <button
                    onClick={handleLogout}
                    className="rounded-md text-white flex items-center text-[18px] px-4 py-2 bg-[#1084da] font-bold whitespace-nowrap"
                  >
                    Çıxış et
                  </button>
                </ShowOnLogin>
              </>
            </div>
          </ul>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
