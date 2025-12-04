"use client";

import { cn } from "@/lib/utils";

type TypingCursorProps = {
  className?: string;
};

export function TypingCursor({ className }: TypingCursorProps) {
  return (
    <span
      className={cn(
        "inline-block ml-0.5 text-ilenia animate-blink",
        className
      )}
      aria-hidden="true"
    >
      ▋
    </span>
  );
}
