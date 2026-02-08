import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: string;
  className?: string;
}

const statusStyles: Record<string, string> = {
  new: "border-foreground text-foreground",
  active: "bg-foreground text-background",
  completed: "bg-foreground text-background",
  signed: "bg-foreground text-background",
  paused: "border-muted-foreground text-muted-foreground",
  archived: "border-muted-foreground text-muted-foreground",
  lost: "border-destructive text-destructive",
  blacklisted: "border-destructive text-destructive",
  declined: "border-destructive text-destructive",
  expired: "border-muted-foreground text-muted-foreground",
};

export default function StatusBadge({ status, className }: StatusBadgeProps) {
  const style = statusStyles[status] || "border-foreground text-foreground";
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 text-xs font-medium border rounded",
        style,
        className
      )}
    >
      {status.replace(/_/g, " ")}
    </span>
  );
}
