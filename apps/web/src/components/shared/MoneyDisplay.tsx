import { cn } from "@/lib/utils";
import { formatMoney, formatMoneyRange } from "@/lib/formatters";

interface MoneyDisplayProps {
  amount?: number;
  low?: number;
  high?: number;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

const sizeClasses = {
  sm: "text-lg",
  md: "text-2xl",
  lg: "text-4xl",
  xl: "text-6xl",
};

export default function MoneyDisplay({
  amount,
  low,
  high,
  size = "md",
  className,
}: MoneyDisplayProps) {
  if (amount !== undefined) {
    return (
      <span className={cn("value-display", sizeClasses[size], className)}>
        {formatMoney(amount)}
      </span>
    );
  }

  if (low !== undefined && high !== undefined) {
    return (
      <div className={cn("flex flex-col", className)}>
        <span className={cn("value-display", sizeClasses[size])}>
          {formatMoneyRange(low, high)}
        </span>
      </div>
    );
  }

  return <span className="text-muted-foreground">—</span>;
}
