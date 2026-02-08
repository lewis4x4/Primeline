import { Link, Outlet } from "react-router-dom";

export default function PublicLayout() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="font-sans font-semibold text-lg tracking-tight">
            PRIMELINE
          </Link>
          <nav className="flex items-center gap-6">
            <Link
              to="/calculator"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Calculator
            </Link>
            <Link
              to="/auth"
              className="bg-foreground text-background px-4 py-1.5 text-sm font-medium rounded hover:opacity-90 transition-opacity"
            >
              Sign In
            </Link>
          </nav>
        </div>
      </header>
      <main>
        <Outlet />
      </main>
    </div>
  );
}
