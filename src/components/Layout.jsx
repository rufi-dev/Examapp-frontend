import Footer from "./Footer"
import Navbar from "./Navbar"

const Layout = ({ children }) => {
    return (
        <>
            <header className="w-full sticky top-0 bg-white z-[1000] py-3">
                <Navbar />
            </header>
            <main>
                {children}
            </main>
            <footer className="w-full bg-[#151414]">
                <Footer />
            </footer>
        </>
    )
}

export default Layout