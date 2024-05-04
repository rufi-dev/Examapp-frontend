import React from 'react'
import logo3 from "../assets/logomath.png"
import { PiPhoneCallDuotone } from "react-icons/pi"
import { HiOutlineMailOpen } from "react-icons/hi"
import { BsFacebook, BsInstagram, BsLinkedin, BsYoutube } from "react-icons/bs"
import { FcCustomerSupport } from "react-icons/fc"
import { Link } from 'react-router-dom'

const Footer = () => {
    return (
        <div className='px-4 max-w-[1440px] mx-auto py-10'>
            <div className='grid lg:grid-cols-4 grid-cols-2 text-[#eee] gap-8 justify-center'>
                <div className='col-span-2 lg:col-span-1'>
                    <img src={logo3} alt="math logo" width={"100px"} />
                    <p className='leading-[32px] mt-3'>İmtahan platforması online sınaq imtahanları, yarışlar, müsabiqələr, online test bazası və suallar ilə hər kəs üçün bərabər təhsili hədəfləyir. Təhsil layihəmiz magistr, ibtidai sinif, orta məktəb, abituriyent, müəllim, xaricdə təhsil almaq və bir çox başqa növ sınaq imtahanında iştirak etmək istəyənlər üçündür.</p>
                </div>
                <div>
                    <h1 className='text-[20px] font-bold'>Servislər</h1>
                    <ul className='flex flex-col gap-2 mt-3'>
                        <li>İmtahan sistemi</li>
                        <li>Atalar sözləri</li>
                        <li>Bloq</li>
                        <li>Xəbərlər</li>
                    </ul>
                </div>
                <div>
                    <h1 className='text-[20px] font-bold'>Faydalı linklər</h1>
                    <ul className='flex flex-col gap-2 mt-3'>
                        <li>Haqqımızda</li>
                        <li>Əlaqə</li>
                    </ul>
                </div>
                <div>
                    <h1 className='text-[20px] font-bold'>Dəstək</h1>
                    <ul className='flex flex-col gap-2 mt-3'>
                        <li>İstifadəçi Razılaşması</li>
                        <li>Məxfilik Siyasəti</li>
                        <li>Ödəniş Şərtləri və Qaydaları</li>
                        <li>Partnyorluq Müqaviləsi</li>
                    </ul>
                </div>
            </div>
            <div className='text-white mt-10'>
                <div className='flex flex-wrap justify-evenly mx-auto py-5 bg-[#1e1e1e] px-3 gap-3'>
                    <div className='flex items-center'>
                        <div className='lg:text-[55px] text-[35px] text-[#28e688]'><PiPhoneCallDuotone /></div>
                        <div className='ml-4'>
                            <h1 className='font-bold lg:text-[20px] text-sm'>Əlaqə Nömrəmiz</h1>
                            <Link to="tel:+994702305859" className='text-[#6a7695] text-sm sm:text-base'>+994 77 399 99 66</Link>
                        </div>
                    </div>
                    <div className='flex items-center'>
                        <div className='lg:text-[55px] text-[35px] text-[#dac900]'><HiOutlineMailOpen /></div>
                        <div className='ml-4'>
                            <h1 className='font-bold lg:text-[20px] text-sm'>ELEKTRON ÜNVAN</h1>
                            <Link to="mailto:Rufi.Aliyev@edu.rtu.lv" className='text-[#6a7695]'>nuriyev.eliyar@mail.ru</Link>
                        </div>
                    </div>

                    <div className='flex items-center'>
                        <div className='lg:text-[55px] text-[35px] text-[#dac900]'><FcCustomerSupport /></div>
                        <div className='ml-4'>
                            <h1 className='font-bold lg:text-[20px] text-sm'>ADMİN SUPPORT</h1>
                            <h1 to="mailto:rufi.aliyev.tech@gmail.com" className='text-[white] mt-1'>Rufi Əliyev</h1>
                            <Link to="mailto:rufi.aliyev.tech@gmail.com" className='text-[#6a7695]'>rufi.aliyev.tech@gmail.com</Link>
                        </div>
                    </div>
                </div>
                <div className='mt-5 flex md:flex-row flex-col gap-3 justify-between items-center'>
                    <div className='text-[#8d8f94]'>
                        <h1 className='flex gap-2 items-center'>
                            <span className='font-bold'>İmtahan</span>
                            <span>© 2023 Bütün hüquqlar qorunur</span>
                        </h1>
                    </div>
                    <ul className='flex gap-5 text-[20px]'>
                        <li>
                            <Link target='_blank' to="https://www.instagram.com/riyaziyyat.99">{<BsInstagram />}</Link>
                        </li>
                        <li><Link target='_blank' to="https://www.facebook.com/nuriyev.eliyar">{<BsFacebook />}</Link></li>
                    </ul>
                </div>
            </div>
        </div>
    )
}

export default Footer
