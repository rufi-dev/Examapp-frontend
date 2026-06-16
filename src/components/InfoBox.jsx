const tones = {
  primary: "bg-primary/12 text-primary",
  success: "bg-success/15 text-success",
  muted: "bg-surface2 text-muted",
  danger: "bg-danger/12 text-danger",
};

const InfoBox = ({ tone = "primary", title, count, icon }) => {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-4 shadow-soft sm:gap-4 sm:p-5">
      <span
        className={`hidden h-11 w-11 shrink-0 place-items-center rounded-xl text-[20px] sm:grid sm:h-12 sm:w-12 sm:text-[22px] ${
          tones[tone] || tones.primary
        }`}
      >
        {icon}
      </span>
      <div className="min-w-0">
        <p className="break-words text-sm leading-tight text-muted">{title}</p>
        <p className="font-display text-2xl font-bold text-text">{count}</p>
      </div>
    </div>
  );
};

export default InfoBox;
