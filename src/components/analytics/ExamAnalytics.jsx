import { examStats, itemAnalysis, fmt } from "../../helper/analytics";
import FormSection from "../ui/FormSection";
import ItemAnalysis from "./ItemAnalysis";

const toneText = {
  primary: "text-primary",
  success: "text-success",
  warning: "text-warning",
  danger: "text-danger",
  muted: "text-text",
};

const StatTile = ({ label, value, sub, tone = "muted" }) => (
  <div className="rounded-2xl border border-line bg-surface p-4 shadow-soft">
    <p className="text-[11px] font-medium uppercase tracking-wide text-muted">{label}</p>
    <p className={`mt-1 font-display text-2xl font-bold ${toneText[tone] || "text-text"}`}>{value}</p>
    {sub && <p className="mt-0.5 text-xs text-muted">{sub}</p>}
  </div>
);

const BARS = [
  { label: "0–20", cls: "bg-danger" },
  { label: "20–40", cls: "bg-danger/70" },
  { label: "40–60", cls: "bg-warning" },
  { label: "60–80", cls: "bg-success/70" },
  { label: "80–100", cls: "bg-success" },
];

const ScoreHistogram = ({ buckets }) => {
  const max = Math.max(1, ...buckets);
  return (
    <div>
      <div className="flex h-44 items-end gap-3">
        {buckets.map((c, i) => (
          <div key={i} className="flex flex-1 flex-col items-center justify-end gap-2">
            <span className="text-xs font-bold text-text">{c}</span>
            <div
              className={`w-full rounded-t-lg ${BARS[i].cls} transition-all duration-300`}
              style={{ height: `${(c / max) * 100}%`, minHeight: c > 0 ? 6 : 0 }}
            />
          </div>
        ))}
      </div>
      <div className="mt-2 flex gap-3">
        {BARS.map((b, i) => (
          <span key={i} className="flex-1 text-center text-[11px] text-muted">
            {b.label}
          </span>
        ))}
      </div>
    </div>
  );
};

// Full per-exam analytics from its results array.
const ExamAnalytics = ({ results = [], passingMarks }) => {
  const stats = examStats(results, passingMarks);
  const items = itemAnalysis(results);

  if (stats.scoredCount === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-line bg-surface p-12 text-center text-muted">
        Hələ qiymətləndirilmiş nəticə yoxdur. Analitika ilk nəticələrdən sonra görünəcək.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <StatTile label="İştirakçı" value={stats.participants} tone="primary" />
        <StatTile label="Orta bal" value={fmt(stats.average)} />
        <StatTile label="Median" value={fmt(stats.median)} />
        <StatTile label="Ən yüksək" value={fmt(stats.max)} tone="success" />
        <StatTile label="Ən aşağı" value={fmt(stats.min)} tone="danger" />
        <StatTile
          label="Keçid"
          value={stats.passRate != null ? `${stats.passRate}%` : "—"}
          sub={stats.passingMarks ? `≥ ${stats.passingMarks} bal` : "keçid balı yoxdur"}
          tone="warning"
        />
      </div>

      <FormSection title="Bal paylanması" description="Neçə şagird hansı bal aralığında topladı.">
        <ScoreHistogram buckets={stats.buckets} />
      </FormSection>

      {items.length > 0 && (
        <FormSection
          title="Sualların təhlili"
          description="Ən çətin suallar (ən az düzgün cavablanan) yuxarıda."
        >
          <ItemAnalysis items={items} />
        </FormSection>
      )}
    </div>
  );
};

export default ExamAnalytics;
