const ResultTable = ({ results }) => {
    return (
        <div className="mx-auto w-full text-center">
            <table className="w-full">
                <thead>
                    <tr>
                        <td className="border px-2">Ad Soyad</td>
                        <td className="border px-2">Attempt</td>
                        <td className="border px-2">Yığılan bal</td>
                        {/* <td className="border px-2">Result</td> */}
                    </tr>
                </thead>
                <tbody>
                    {results && results?.map((result) => (
                        <tr key={result._id}>
                            <td className="border px-2">{result.userId.name}</td>
                            <td className="border px-2">{result.attempts}</td>
                            <td className="border px-2">{result.earnPoints}</td>
                            {/* <td className="border px-2">{result?.isPassed ? (
                                <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                    Passed
                                </span>
                            ) : (
                                <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                                    Failed
                                </span>
                            )}</td> */}
                        </tr>
                    ))}

                </tbody>
            </table>
        </div>
    )
}

export default ResultTable