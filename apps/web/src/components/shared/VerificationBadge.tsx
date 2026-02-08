import { cn } from "@/lib/utils";

interface VerificationBadgeProps {
  verified: boolean;
  className?: string;
}

export default function VerificationBadge({ verified, className }: VerificationBadgeProps) {
  if (verified) {
    return (
      <span className={cn("inline-flex items-center gap-1 text-xs font-medium text-info", className)}>
        <span>&#10003;</span> Verified
      </span>
    );
  }

  return (
    <span className={cn("text-xs text-muted-foreground", className)}>
      Estimated
    </span>
  );
}
