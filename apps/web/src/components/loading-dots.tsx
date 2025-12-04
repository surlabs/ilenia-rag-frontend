"use client";

import { cn } from "@/lib/utils";

type LoadingDotsProps = {
  className?: string;
};

export function LoadingDots({ className }: LoadingDotsProps) {
  return (
    <div className={cn("flex items-center gap-1 h-8", className)}>
      <div className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" />
      <div
        className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce"
        style={{ animationDelay: "0.1s" }}
      />
      <div
        className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce"
        style={{ animationDelay: "0.2s" }}
      />
    </div>
  );
}
