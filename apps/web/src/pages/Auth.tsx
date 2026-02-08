import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

export default function Auth() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { error: authError } = isSignUp
      ? await signUp(email, password)
      : await signIn(email, password);

    setLoading(false);

    if (authError) {
      setError(authError.message);
      return;
    }

    if (isSignUp) {
      setError("Check your email to confirm your account.");
      return;
    }

    navigate("/dashboard");
  }

  return (
    <div className="max-w-sm mx-auto mt-24 px-4">
      <h1 className="page-title mb-8">
        {isSignUp ? "Create Account" : "Sign In"}
      </h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full border border-border rounded px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-foreground"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            className="w-full border border-border rounded px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-foreground"
          />
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-foreground text-background py-2 text-sm font-medium rounded hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {loading ? "..." : isSignUp ? "Create Account" : "Sign In"}
        </button>
      </form>
      <button
        onClick={() => {
          setIsSignUp(!isSignUp);
          setError("");
        }}
        className="mt-4 text-sm text-muted-foreground hover:text-foreground underline"
      >
        {isSignUp ? "Already have an account? Sign in" : "Need an account? Sign up"}
      </button>
    </div>
  );
}
