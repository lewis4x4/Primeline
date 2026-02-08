import { useAuth } from "@/hooks/useAuth";
import { LogOut } from "lucide-react";

export default function Header() {
  const { user, signOut } = useAuth();

  return (
    <header className="h-12 border-b border-gray-200 flex items-center justify-end px-6">
      <div className="flex items-center gap-4">
        <span className="font-mono text-xs text-gray-500">
          {user?.email}
        </span>
        <button
          onClick={() => signOut()}
          className="text-gray-400 hover:text-black transition-colors"
          title="Sign out"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}
