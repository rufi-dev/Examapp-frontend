// Centred editorial section header for the landing page: a large display title, an
// optional one-line subtitle, and a fading hairline rule under it.
const SectionHeader = ({ title, subtitle, id }) => (
  <div className="mx-auto max-w-2xl text-center">
    <h2 id={id} className="font-display text-3xl font-extrabold tracking-tight text-text sm:text-[2.6rem] sm:leading-[1.08]">
      {title}
    </h2>
    {subtitle && <p className="mx-auto mt-3 max-w-xl text-base leading-relaxed text-muted sm:text-lg">{subtitle}</p>}
    <div className="mx-auto mt-5 h-px w-24 bg-gradient-to-r from-transparent via-primary/45 to-transparent" />
  </div>
);

export default SectionHeader;
