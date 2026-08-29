import { Card, CardHeader, CardContent, CardFooter } from "@/components/molecules/Card";
import { cn } from "@/lib/utils";

export interface CardSkeletonProps {
  count?: number;
  className?: string;
}

function SkeletonCard() {
  return (
    <Card className="flex flex-col justify-between animate-pulse">
      <CardHeader className="pb-3 space-y-2">
        <div className="flex items-center justify-between">
          <div className="h-4 w-32 rounded bg-muted/60" />
          <div className="h-4 w-16 rounded bg-muted/40" />
        </div>
        <div className="h-3 w-48 rounded bg-muted/40" />
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        <div className="h-8 w-full rounded bg-muted/40" />
        <div className="flex justify-between items-center pt-2 border-t border-border">
          <div className="h-3 w-20 rounded bg-muted/40" />
          <div className="h-3 w-16 rounded bg-muted/40" />
        </div>
      </CardContent>
      <CardFooter className="pt-3 border-t border-border flex justify-between">
        <div className="h-7 w-20 rounded bg-muted/50" />
        <div className="h-7 w-16 rounded bg-muted/50" />
      </CardFooter>
    </Card>
  );
}

export function CardSkeletonGrid({ count = 3, className }: CardSkeletonProps) {
  return (
    <div
      className={cn(
        "grid gap-6 md:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3",
        className,
      )}
    >
      {Array.from({ length: Math.max(0, count) }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}
