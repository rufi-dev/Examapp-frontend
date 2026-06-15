import ReactDOM from "react-dom";
import Spinner from "./Spinner";

const Loader = () => {
  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-[1000] flex flex-col items-center justify-center gap-4 bg-bg/80 backdrop-blur-sm">
      <Spinner size={46} className="text-primary" />
      <p className="text-sm font-medium text-muted">Yüklənir...</p>
    </div>,
    document.getElementById("loader")
  );
};

export default Loader;
