"use client";

import { cn } from "@/lib/utils";
import type { ComponentProps } from "react";

export type SuggestionCardProps = Omit<ComponentProps<"button">, "onClick"> & {
  badge: string;
  badgeColor: "ilenia" | "emerald";
  title: string;
  description: string;
  onClick: () => void;
};

export const SuggestionCard = ({
  className,
  badge,
  badgeColor,
  title,
  description,
  onClick,
  ...props
}: SuggestionCardProps) => {
  const badgeStyles = {
    ilenia:
      "text-ilenia-600 dark:text-ilenia-400 bg-ilenia-50 dark:bg-ilenia-900/30",
    emerald:
      "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "text-left p-4 rounded-xl border border-slate-200 dark:border-slate-800",
        "hover:border-ilenia-300 dark:hover:border-ilenia-500",
        "hover:bg-slate-50 dark:hover:bg-slate-800/50",
        "transition-all group bg-white dark:bg-slate-900 shadow-sm",
        "focus:outline-none focus:ring-2 focus:ring-ilenia-500 focus:ring-offset-2",
        className
      )}
      {...props}
    >
      <div className="flex items-center gap-2 mb-1">
        <span
          className={cn(
            "text-[10px] font-medium px-1.5 py-0.5 rounded",
            badgeStyles[badgeColor]
          )}
        >
          {badge}
        </span>
      </div>
      <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1 block group-hover:text-ilenia-600 dark:group-hover:text-ilenia-400">
        {title}
      </span>
      <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
        {description}
      </span>
    </button>
  );
};
