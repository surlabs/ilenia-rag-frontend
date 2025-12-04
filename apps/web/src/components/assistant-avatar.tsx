"use client";

import { Bot } from "lucide-react";
import { cn } from "@/lib/utils";

type AssistantAvatarProps = {
  className?: string;
};

export function AssistantAvatar({ className }: AssistantAvatarProps) {
  return (
    <div
      className={cn(
        "w-8 h-8 bg-background border border-border rounded-full flex items-center justify-center shrink-0",
        className
      )}
    >
      <Bot className="w-4 h-4 text-ilenia" />
    </div>
  );
}
