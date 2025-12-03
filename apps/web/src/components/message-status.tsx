"use client";

import { AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/providers/i18n-provider";

type MessageStatusProps = {
  code: string | null;
  params?: {
    attempt?: number;
  };
};

export function MessageStatus({ code, params }: MessageStatusProps) {
  const { t } = useTranslation();

  if (!code) return null;

  const isError = code === "STATUS_ERROR";

  return (
    <div
      className={cn(
        "flex items-center gap-2",
        isError ? "text-destructive" : "text-muted-foreground animate-pulse"
      )}
    >
      {isError && <AlertCircle className="h-4 w-4" />}
      <span>
        {t(isError ? "status.error" : "status.retrying", params)}
      </span>
    </div>
  );
}
