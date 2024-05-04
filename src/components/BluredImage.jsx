import React, { useEffect, useState } from 'react';
import { Blurhash } from "react-blurhash";
import { AiFillDelete } from 'react-icons/ai';
const BluredImage = ({ src }) => {
    const [imageLoaded, setImageLoaded] = useState(false);

    const handleImageLoad = () => {
        setImageLoaded(true);
    };


    return (
        <>
            <Blurhash
                hash={"L0Jb25-;fQ-;_3fQfQfQfQfQfQfQ"}
                width={`100%`}
                height={`100%`}
                resolutionX={32}
                resolutionY={32}
                punch={1}
                style={{ display: imageLoaded ? 'none' : 'block' }}
            />
            <img
                onLoad={handleImageLoad}
                src={src}
                className={`w-full rounded-md h-full object-cover ${!imageLoaded && "hidden"}`}
                alt=""
            />
        </>
    );
};

export default BluredImage;
