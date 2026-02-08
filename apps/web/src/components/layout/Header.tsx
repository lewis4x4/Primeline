import { useAuth } from "@/hooks/useAuth";
import { LogOut } from "lucide-react";

export default function Header() {
  const { user, signOut } = useAuth();

  return (
    <header className="h-12 border-b border-border bg-background flex items-center justify-between px-6">
      <div />
      <div className="flex items-center gap-4">
        <span className="text-sm text-muted-foreground">
          {user?.email}
        </span>
        <button
          onClick={() => signOut()}
          className="text-muted-foreground hover:text-foreground transition-colors"
          title="Sign out"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}
