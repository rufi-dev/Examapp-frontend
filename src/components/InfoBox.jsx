import { Link } from "react-router-dom"

const InfoBox = ({ bgColor, title, count, icon }) => {
    return (
        
                <Link to="" className={`flex text-center md:text-left md:gap-5 flex-col items-center px-4 ${bgColor} py-4 border border-gray-200 rounded-lg shadow md:flex-row max-w-[400px]  dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700`}>
                    <div className='text-[30px]'>
                        {icon}
                    </div>
                    <div class="flex flex-col justify-between py-2 leading-normal">
                        <h5 class="text-xl  dark:text-white">{title}</h5>
                        <p class="font-bold text-[20px]  dark:text-gray-400">{count}</p>
                    </div>
                </Link>

    )
}

export default InfoBox