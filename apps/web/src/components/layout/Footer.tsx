import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer className="border-t border-black">
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <img
                src="/primeline-logo.png"
                alt="PRIMELINE"
                className="h-10 w-auto object-contain"
              />
            </div>
            <p className="text-xs text-gray-500 leading-relaxed">
              ATHLETE BRANDING AND NIL MANAGEMENT
            </p>
          </div>

          {/* Links */}
          <div>
            <p className="font-mono text-xs uppercase tracking-wider text-gray-500 mb-3">
              Navigate
            </p>
            <div className="flex flex-col gap-2">
              <Link
                to="/"
                className="text-sm hover:underline underline-offset-4"
              >
                Home
              </Link>
              <a
                href="/#services"
                className="text-sm hover:underline underline-offset-4"
              >
                Services
              </a>
              <Link
                to="/calculator"
                className="text-sm hover:underline underline-offset-4"
              >
                Calculator
              </Link>
              <Link
                to="/auth"
                className="text-sm hover:underline underline-offset-4"
              >
                Sign In
              </Link>
            </div>
          </div>

          {/* Contact */}
          <div>
            <p className="font-mono text-xs uppercase tracking-wider text-gray-500 mb-3">
              Contact
            </p>
            <p className="text-sm text-gray-600">info@primeline.ai</p>
          </div>
        </div>

        <div className="border-t border-gray-200 mt-8 pt-6">
          <p className="text-xs text-gray-400 font-mono">
            &copy; {new Date().getFullYear()} Primeline. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
