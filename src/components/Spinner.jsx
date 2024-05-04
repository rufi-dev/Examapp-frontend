import React from 'react'
import { TailSpin } from 'react-loader-spinner'

const Spinner = () => {
    return (
        <TailSpin
            height="20"
            width="20"
            color="#fff"
            ariaLabel="tail-spin-loading"
            radius="1"
            wrapperStyle={{}}
            wrapperClass=""
            visible={true}
        />
    )
}

export default Spinner