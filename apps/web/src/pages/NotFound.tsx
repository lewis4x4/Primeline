import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh]">
      <h1 className="value-display text-6xl mb-4">404</h1>
      <p className="text-sm text-muted-foreground mb-6">Page not found</p>
      <Link
        to="/"
        className="bg-foreground text-background px-4 py-2 text-sm font-medium rounded hover:opacity-90 transition-opacity"
      >
        Back to Home
      </Link>
    </div>
  );
}
