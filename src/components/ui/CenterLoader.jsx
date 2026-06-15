import Spinner from "../Spinner";

// Simple centered spinner for first-load states (replaces skeleton boxes).
const CenterLoader = ({ className = "" }) => (
  <div className={`flex justify-center py-24 ${className}`}>
    <Spinner size={40} className="text-primary" />
  </div>
);

export default CenterLoader;
