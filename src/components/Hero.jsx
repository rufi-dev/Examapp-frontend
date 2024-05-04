import { Link } from "react-router-dom"

const Hero = () => {
    return (
        <div className="">
            <div className="text-[black] px-4 max-w-[1440px] mx-auto">
                <div className="text-center max-w-[640px] mx-auto">
                    <p className="font-[600] tex-[12px] md:text-[16px] uppercase">Oxuyan Onlayn İmtahan Platforması</p>
                    <h1 className="text-[40px] md:text-[60px]">İstər <span className="font-extrabold">İmtahan</span> Yarat, İstərsə də İştirak Et!</h1>
                    <p className="text-[15px] md:text-[17px] mt-4 tracking-wider px-[20px]">İstənilən növ onlayn sınaq imtahanında iştirak et və ya öz yarış, texniki müsahibə və onlayn sınaq imtahanlarını keçir!</p>
                </div>
            </div>
            <div className="py-[30px] text-center justify-center flex">
                <Link to="/tags" className="text-[#373737] rounded-md px-6 py-2 bg-gradient-to-t from-[#f19a1a] to-[#ffc73c]">
                    <p className="font-bold text-2xl">
                        İmtahanda iştirak et
                    </p>
                    <p className="text-[13px] font-semibold">Sınaqlara qatılmaq istəyənlər üçün</p>
                </Link>
            </div>
        </div>
    )
}

export default Hero