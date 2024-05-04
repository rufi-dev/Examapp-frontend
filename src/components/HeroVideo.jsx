import React, { useState } from 'react'
import video from "../assets/video.png"
import { Blurhash } from 'react-blurhash'
const HeroVideo = () => {
    const [imageLoaded, setImageLoaded] = useState(false);

    const handleImageLoad = () => {
        setImageLoaded(true);
    };

    return (
        <div className='flex justify-center'>
            <div className='pl-[20px] z-40 '>
                <div className='hidden sm:block bg-gradient-to-tr from-[#2084da] to-[#44d8b1] w-[70px] rounded-full mr-[-60px] mt-[220px] md:mt-[300px] h-[70px]'></div>
            </div>
            <div className='cursor-pointer max-w-[760px] max-h-[400px] px-[20px]'>
                <Blurhash
                    hash={"L3Efj9%1#ONK04t5?CNI4Uay_MoL"}
                    width={`100%`}
                    height={`100%`}
                    resolutionX={32}
                    resolutionY={32}
                    punch={1}
                    style={{ display: imageLoaded ? 'none' : 'block' }}
                />
                <img onLoad={handleImageLoad} src={video} className='h-full w-full rounded-lg' alt="" />
            </div>
            <div className='pr-[20px] z-40'>
                <div className='hidden sm:block bg-gradient-to-t from-[#f19a1a] to-[#ffc73c] w-[90px] rounded-full z-40 ml-[-60px] mt-[20px] h-[90px]'></div>
            </div>
        </div>
    )
}

export default HeroVideo