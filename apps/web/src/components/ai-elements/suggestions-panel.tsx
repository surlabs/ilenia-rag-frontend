"use client";

import { cn } from "@/lib/utils";
import { Sparkles } from "lucide-react";
import type { ComponentProps } from "react";
import { SuggestionCard } from "./suggestion-card";
import { useTranslation } from "@/providers/i18n-provider";

export type Suggestion = {
  key: string;
  badgeColor: "ilenia" | "emerald";
  titleKey: string;
  descriptionKey: string;
  language: string;
  domain: string;
  question: string;
};

export const SUGGESTIONS: Suggestion[] = [
  {
    key: "eu-legal",
    badgeColor: "ilenia",
    titleKey: "suggestions.card1.title",
    descriptionKey: "suggestions.card1.description",
    language: "eu",
    domain: "legal",
    question: "Zein dira nire eskubideak lan-kontratu batean?",
  },
  {
    key: "gl-health",
    badgeColor: "emerald",
    titleKey: "suggestions.card2.title",
    descriptionKey: "suggestions.card2.description",
    language: "gl",
    domain: "health",
    question: "Cales son os síntomas da gripe estacional?",
  },
  {
    key: "va-general",
    badgeColor: "ilenia",
    titleKey: "suggestions.card3.title",
    descriptionKey: "suggestions.card3.description",
    language: "va",
    domain: "general",
    question: "Quins requisits necessita una empresa per contractar?",
  },
  {
    key: "gl-health-2",
    badgeColor: "emerald",
    titleKey: "suggestions.card4.title",
    descriptionKey: "suggestions.card4.description",
    language: "gl",
    domain: "health",
    question: "Como solicitar a tarxeta sanitaria en Galicia?",
  },
];

export type SuggestionsPanelProps = ComponentProps<"div"> & {
  onSuggestionClick: (suggestion: Suggestion) => void;
};

export const SuggestionsPanel = ({
  className,
  onSuggestionClick,
  ...props
}: SuggestionsPanelProps) => {
  const { t } = useTranslation();

  return (
    <div
      className={cn(
        "flex size-full flex-col items-center justify-center gap-3 p-8 text-center",
        className
      )}
      {...props}
    >
      <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-2xl flex items-center justify-center mb-6 border border-slate-100 dark:border-slate-700">
        <Sparkles className="w-8 h-8 text-ilenia" />
      </div>
      <h1 className="text-2xl font-semibold text-slate-800 dark:text-slate-100 mb-2">
        {t("suggestions.title")}
      </h1>
      <p className="text-slate-500 dark:text-slate-400 text-sm mb-8">
        {t("suggestions.subtitle")}
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-lg">
        {SUGGESTIONS.map((suggestion) => {
          const domainLabel = t(`suggestions.domains.${suggestion.domain}`);
          const languageLabel = t(`suggestions.languages.${suggestion.language}`);
          const badge = `${domainLabel} · ${languageLabel}`;

          return (
            <SuggestionCard
              key={suggestion.key}
              badge={badge}
              badgeColor={suggestion.badgeColor}
              title={t(suggestion.titleKey)}
              description={t(suggestion.descriptionKey)}
              onClick={() => onSuggestionClick(suggestion)}
            />
          );
        })}
      </div>
    </div>
  );
};
