import { Link, Outlet } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import Footer from "./Footer";

export default function PublicLayout() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen bg-white text-black font-sans selection:bg-black selection:text-white flex flex-col">
      {/* Sticky Header */}
      <nav className="sticky top-0 z-50 w-full border-b border-gray-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
        <div className="max-w-6xl mx-auto px-4 h-20 flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <img
              src="/primeline-logo.png"
              alt="PRIMELINE"
              className="h-16 w-auto object-contain"
            />
          </Link>

          {/* Navigation */}
          <div className="flex items-center gap-4 sm:gap-6">
            <a
              href="/#services"
              className="text-sm font-medium hover:underline underline-offset-4"
            >
              Services
            </a>
            <Link
              to="/calculator"
              className="text-sm font-medium hover:underline underline-offset-4"
            >
              Calculator
            </Link>

            {isAuthenticated ? (
              <Link
                to="/dashboard"
                className="bg-black text-white hover:bg-gray-800 rounded-none h-9 px-6 font-mono text-xs uppercase inline-flex items-center transition-colors"
              >
                Dashboard
              </Link>
            ) : (
              <Link
                to="/auth"
                className="bg-black text-white hover:bg-gray-800 rounded-none h-9 px-6 font-mono text-xs uppercase inline-flex items-center transition-colors"
              >
                Sign In
              </Link>
            )}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-grow">
        <Outlet />
      </main>

      <Footer />
    </div>
  );
}
