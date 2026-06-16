// Exam result-visibility settings: WHAT to reveal (toggles) + WHEN the correct
// answers are revealed (only relevant when correct answers are shown).
const Toggle = ({ checked, onChange, label }) => (
  <button
    type="button"
    onClick={() => onChange(!checked)}
    className="flex w-full items-center justify-between gap-4 rounded-xl border border-line bg-surface2/50 p-3.5 text-left transition-colors hover:bg-surface2"
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
  <div className="space-y-4 rounded-2xl border border-line bg-surface p-5 shadow-soft sm:p-6">
    <div>
      <p className="font-display text-base font-bold text-text">Nəticə görünüşü</p>
      <p className="mt-0.5 text-sm text-muted">Tələbə öz nəticəsində nəyi və nə vaxt görsün.</p>
    </div>

    <div className="space-y-2.5">
      <Toggle label="Balı göstər" checked={showScore} onChange={(v) => onChange("showScore", v)} />
      <Toggle
        label="Düzgün cavabları göstər"
        checked={showCorrectAnswers}
        onChange={(v) => onChange("showCorrectAnswers", v)}
      />
      <p className="text-xs text-muted">
        Hər ikisi söndürülübsə, tələbə yalnız “cavablar qəbul edildi” mesajını görür.
      </p>
    </div>

    {showCorrectAnswers && (
      <div>
        <p className="mb-2 text-sm font-semibold text-text">
          Düzgün cavablar nə vaxt göstərilsin?
        </p>
        <div className="grid grid-cols-2 gap-1 rounded-xl border border-line bg-surface2/50 p-1">
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
            ? "Düzgün cavablar yalnız imtahanın bitmə tarixindən sonra açılır — beləcə cavablar imtahan ərzində paylaşıla bilməz."
            : "Düzgün cavablar təqdim edildikdən dərhal sonra göstərilir."}
        </p>
      </div>
    )}
  </div>
);

export default ResultVisibility;
