import ReactDOM from 'react-dom'
import { TailSpin } from 'react-loader-spinner'

const Loader = () => {
    return ReactDOM.createPortal(
        <div className="w-full flex justify-center items-center h-screen fixed top-0 bg-[white] z-[100]">
            <TailSpin
                height="130"
                width="130"
                color="#1084da"
                ariaLabel="triangle-loading"
                wrapperStyle={{}}
                wrapperClassName=""
                visible={true}
            />
        </div>,
        document.getElementById("loader")
    )
}

export default Loader