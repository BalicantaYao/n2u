import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string;
  sub?: string;
  icon?: LucideIcon;
  trend?: "positive" | "negative" | "neutral";
  className?: string;
}

export function StatCard({ title, value, sub, icon: Icon, trend, className }: StatCardProps) {
  return (
    <Card className={cn("", className)}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground font-medium">{title}</p>
            <p
              className={cn(
                "text-2xl font-bold tabular-nums",
                trend === "positive" && "text-green-600 dark:text-green-400",
                trend === "negative" && "text-red-600 dark:text-red-400"
              )}
            >
              {value}
            </p>
            {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
          </div>
          {Icon && (
            <div className="rounded-md bg-muted p-2">
              <Icon className="h-4 w-4 text-muted-foreground" />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
