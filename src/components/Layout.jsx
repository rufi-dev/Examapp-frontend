import Footer from "./Footer";
import Navbar from "./Navbar";

const Layout = ({ children }) => {
  return (
    // `blueprint` scopes the BunkerMath "Mathematical Blueprint" palette to the
    // public shell only — the dashboard/auth shells keep their own tokens.
    <div className="blueprint flex min-h-screen flex-col bg-bg text-text">
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
};

export default Layout;
