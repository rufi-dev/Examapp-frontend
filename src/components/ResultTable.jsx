const ResultTable = ({ results }) => {
  if (!results || results.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-line bg-surface p-10 text-center text-muted">
        Hələ cəhd yoxdur.
      </div>
    );
  }

  return (
    <div className="scrollbar-thin overflow-x-auto rounded-2xl border border-line bg-surface shadow-soft">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
            <th className="px-6 py-4 font-semibold">Ad Soyad</th>
            <th className="px-6 py-4 font-semibold">Cəhd</th>
            <th className="px-6 py-4 font-semibold">Yığılan bal</th>
          </tr>
        </thead>
        <tbody>
          {results.map((result) => (
            <tr
              key={result._id}
              className="border-b border-line/60 transition-colors last:border-0 hover:bg-surface2/50"
            >
              <td className="whitespace-nowrap px-6 py-4 font-medium text-text">
                {result.userId?.name || "—"}
              </td>
              <td className="px-6 py-4 text-muted">{result.attempts}</td>
              <td className="px-6 py-4">
                <span className="inline-flex items-center rounded-full bg-primary/12 px-2.5 py-1 text-xs font-semibold text-primary">
                  {result.earnPoints != null ? `${result.earnPoints} bal` : "Qəbul edildi"}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ResultTable;
