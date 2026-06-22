import { Link } from "react-router-dom";
import { FiArrowUpRight } from "react-icons/fi";
import { MathText } from "../Math";

// Marketing topic card: SVG diagram up top, title + sample equation + a
// "N sınaq" tag below. Border turns cobalt and the diagram animates on hover.
const TopicCard = ({ title, example, count, diagram, accent = "text-primary", to = "/register" }) => (
  <Link
    to={to}
    className="group relative flex flex-col overflow-hidden rounded-2xl border border-line bg-surface p-6 shadow-soft transition-all duration-300 ease-out-quint hover:-translate-y-1 hover:border-primary/50 hover:shadow-lift"
  >
    {/* diagram */}
    <div className="mb-5 flex items-start justify-between">
      <span className={`block h-20 w-28 ${accent}`}>{diagram}</span>
      <FiArrowUpRight className="text-xl text-muted transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary" />
    </div>

    {/* text */}
    <h3 className="font-display text-lg font-bold text-text">{title}</h3>
    {example && (
      <div className="mt-1.5 text-[15px] text-muted">
        <MathText text={example} />
      </div>
    )}
    <span className="mt-4 inline-flex w-fit items-center rounded-md bg-surface2 px-2.5 py-1 text-xs font-semibold text-muted transition-colors group-hover:bg-primary/10 group-hover:text-primary">
      {count} sınaq
    </span>
  </Link>
);

export default TopicCard;
