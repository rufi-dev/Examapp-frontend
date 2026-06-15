const tones = {
  primary: "bg-primary/12 text-primary",
  success: "bg-success/15 text-success",
  muted: "bg-surface2 text-muted",
  danger: "bg-danger/12 text-danger",
};

const InfoBox = ({ tone = "primary", title, count, icon }) => {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-line bg-surface p-5 shadow-soft">
      <span
        className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl text-[22px] ${
          tones[tone] || tones.primary
        }`}
      >
        {icon}
      </span>
      <div>
        <p className="text-sm text-muted">{title}</p>
        <p className="font-display text-2xl font-bold text-text">{count}</p>
      </div>
    </div>
  );
};

export default InfoBox;
