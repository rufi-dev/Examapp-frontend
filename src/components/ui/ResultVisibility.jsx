// Exam result-visibility settings: WHAT to reveal (toggles) + WHEN (segmented).
const Toggle = ({ checked, onChange, label }) => (
  <button
    type="button"
    onClick={() => onChange(!checked)}
    className="flex w-full items-center justify-between gap-4 rounded-xl border border-line bg-surface p-3.5 text-left transition-colors hover:bg-surface2/50"
  >
    <span className="text-sm font-semibold text-text">{label}</span>
    <span
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
        checked ? "bg-primary" : "border border-line bg-surface2"
      }`}
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all duration-200 ease-out-quint ${
          checked ? "left-[22px]" : "left-0.5"
        }`}
      />
    </span>
  </button>
);

const ResultVisibility = ({ showScore, showCorrectAnswers, revealAfterEnd, onChange }) => (
  <div className="space-y-4 rounded-2xl border border-line bg-surface2/40 p-5 md:col-span-2">
    <div>
      <p className="font-display text-base font-bold text-text">Nəticə görünüşü</p>
      <p className="mt-0.5 text-xs text-muted">Tələbə öz nəticəsində nəyi və nə vaxt görsün.</p>
    </div>

    <div className="space-y-2.5">
      <Toggle label="Balı göstər" checked={showScore} onChange={(v) => onChange("showScore", v)} />
      <Toggle
        label="Düzgün cavabları göstər"
        checked={showCorrectAnswers}
        onChange={(v) => onChange("showCorrectAnswers", v)}
      />
    </div>

    <div>
      <p className="mb-2 text-sm font-semibold text-text">Nə vaxt göstərilsin?</p>
      <div className="grid grid-cols-2 gap-1 rounded-xl border border-line bg-surface p-1">
        <button
          type="button"
          onClick={() => onChange("revealAfterEnd", true)}
          className={`rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
            revealAfterEnd ? "bg-primary text-primary-fg shadow-soft" : "text-muted hover:text-text"
          }`}
        >
          İmtahan bitdikdən sonra
        </button>
        <button
          type="button"
          onClick={() => onChange("revealAfterEnd", false)}
          className={`rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
            !revealAfterEnd ? "bg-primary text-primary-fg shadow-soft" : "text-muted hover:text-text"
          }`}
        >
          Dərhal
        </button>
      </div>
      <p className="mt-2 text-xs leading-relaxed text-muted">
        {revealAfterEnd
          ? "Yuxarıdakılar yalnız imtahanın bitmə tarixindən sonra açılır — beləcə cavablar imtahan ərzində paylaşıla bilməz."
          : "Yuxarıdakılar cavablar təqdim edildikdən dərhal sonra göstərilir."}
        {" "}Hər ikisi söndürülübsə, tələbə yalnız “cavablar qəbul edildi” mesajını görür.
      </p>
    </div>
  </div>
);

export default ResultVisibility;
