"use client";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/providers/i18n-provider";
import {
  ArrowRight,
  BrainCircuit,
  Check,
  ChevronDown,
  Sparkles,
} from "lucide-react";
import { useMemo, useState } from "react";

export type RagCapability = {
  language: string | null;
  domain: string | null;
  label: string;
};

export type RagContextValue = {
  mode: "auto" | "manual";
  language?: string;
  domain?: string;
};

export type RagContextSelectorProps = {
  capabilities: RagCapability[];
  value: RagContextValue;
  onChange: (value: RagContextValue) => void;
  disabled?: boolean;
};

type NormalizedCapabilities = Record<
  string,
  { id: string; label: string; code: string }[]
>;

function normalizeCapabilities(capabilities: RagCapability[]): {
  byLanguage: NormalizedCapabilities;
  languages: { id: string; label: string }[];
  totalDomains: number;
} {
  const byLanguage: NormalizedCapabilities = {};
  const domainSet = new Set<string>();

  for (const cap of capabilities) {
    if (!cap.domain || !cap.language) continue;

    const langKey = cap.language.toLowerCase();
    const domainKey = cap.domain.toLowerCase();

    if (!byLanguage[langKey]) {
      byLanguage[langKey] = [];
    }

    const existingDomain = byLanguage[langKey].find(
      (d) => d.code.toLowerCase() === domainKey
    );
    if (!existingDomain) {
      byLanguage[langKey].push({
        id: `${langKey}-${domainKey}`,
        label: cap.domain,
        code: cap.domain,
      });
    }

    domainSet.add(domainKey);
  }

  const languages = Object.keys(byLanguage).map((langKey) => {
    const cap = capabilities.find(
      (c) => c.language?.toLowerCase() === langKey
    );
    return {
      id: langKey,
      label: cap?.language ?? langKey,
    };
  });

  return {
    byLanguage,
    languages,
    totalDomains: domainSet.size,
  };
}

export function RagContextSelector({
  capabilities,
  value,
  onChange,
  disabled = false,
}: RagContextSelectorProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState<string | null>(null);

  const { byLanguage, languages, totalDomains } = useMemo(
    () => normalizeCapabilities(capabilities),
    [capabilities]
  );

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen && value.mode === "manual" && value.language) {
      setSelectedLanguage(value.language.toLowerCase());
    } else if (!isOpen) {
      setSelectedLanguage(null);
    }
  };

  const handleAutoSelect = () => {
    onChange({ mode: "auto" });
    setOpen(false);
    setSelectedLanguage(null);
  };

  const handleLanguageSelect = (langId: string) => {
    setSelectedLanguage(langId);
  };

  const handleDomainSelect = (domain: string, language: string) => {
    const langCap = capabilities.find(
      (c) => c.language?.toLowerCase() === language
    );
    onChange({
      mode: "manual",
      language: langCap?.language ?? language,
      domain,
    });
    setOpen(false);
    setSelectedLanguage(null);
  };

  const displayLabel = useMemo(() => {
    if (value.mode === "auto") {
      return t("rag.selector.auto");
    }
    if (value.domain && value.language) {
      return `${value.domain} · ${value.language}`;
    }
    return t("rag.selector.auto");
  }, [value, t]);

  const isAuto = value.mode === "auto";
  const domains = selectedLanguage ? byLanguage[selectedLanguage] ?? [] : [];

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={disabled}
          className="h-auto gap-2 px-2.5 py-1.5 shadow-sm"
          aria-label={t("rag.selector.label")}
        >
          <div
            className={cn(
              "flex h-6 w-6 shrink-0 items-center justify-center rounded-md",
              isAuto
                ? "bg-primary/10 text-primary"
                : "bg-secondary text-secondary-foreground"
            )}
          >
            {isAuto ? (
              <Sparkles className="h-3.5 w-3.5" />
            ) : (
              <BrainCircuit className="h-3.5 w-3.5" />
            )}
          </div>
          <div className="hidden text-left leading-tight sm:block">
            <div className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
              {t("rag.selector.label")}
            </div>
            <div className="max-w-24 truncate text-xs font-medium">
              {displayLabel}
            </div>
          </div>
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        side="top"
        sideOffset={8}
        className="w-80 overflow-hidden p-0"
      >
        {/* Auto Mode Option */}
        <div className="border-b bg-muted/30 p-2">
          <button
            type="button"
            onClick={handleAutoSelect}
            className="group flex w-full items-center gap-3 rounded-lg border border-transparent px-3 py-2 text-left transition-all hover:border-border hover:bg-background hover:shadow-sm"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-indigo-600 text-white shadow-sm transition-transform group-hover:scale-110">
              <Sparkles className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold">
                {t("rag.selector.autoTitle")}
              </div>
              <div className="text-xs text-muted-foreground">
                {t("rag.selector.autoDescription")}
              </div>
            </div>
            {isAuto && <Check className="h-4 w-4 shrink-0 text-primary" />}
          </button>
        </div>

        {/* Two-Column Selector: Languages (left) | Domains (right) */}
        <div className="grid h-[200px] grid-cols-[130px_1fr]">
          {/* Language List (left) */}
          <ScrollArea className="border-r bg-muted/20">
            <div className="space-y-1 p-2">
              {languages.map((lang) => {
                const isSelected = selectedLanguage === lang.id;
                const isCurrentValue =
                  value.mode === "manual" &&
                  value.language?.toLowerCase() === lang.id;

                return (
                  <button
                    key={lang.id}
                    type="button"
                    onClick={() => handleLanguageSelect(lang.id)}
                    className={cn(
                      "group flex w-full items-center justify-between gap-1 rounded-md px-2.5 py-1.5 text-left text-sm transition-colors",
                      isSelected
                        ? "bg-ilenia text-ilenia-foreground"
                        : isCurrentValue
                          ? "bg-ilenia/20 text-ilenia"
                          : "hover:bg-ilenia/10 hover:text-ilenia"
                    )}
                  >
                    <span className="truncate">{lang.label}</span>
                    <ChevronDown
                      className={cn(
                        "h-3.5 w-3.5 shrink-0 rotate-[-90deg] transition-opacity",
                        isSelected
                          ? "text-ilenia-foreground opacity-100"
                          : isCurrentValue
                            ? "text-ilenia opacity-100"
                            : "text-ilenia opacity-0 group-hover:opacity-100"
                      )}
                    />
                  </button>
                );
              })}
            </div>
          </ScrollArea>

          {/* Domain List (right) */}
          <ScrollArea className="relative">
            {!selectedLanguage ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center text-xs text-muted-foreground">
                <ArrowRight className="mb-2 h-4 w-4 rotate-180 opacity-50" />
                {t("rag.selector.selectLanguage")}
              </div>
            ) : (
              <div className="space-y-1 p-2">
                {domains.map((domain) => {
                  const isCurrentValue =
                    value.mode === "manual" &&
                    value.domain?.toLowerCase() === domain.code.toLowerCase() &&
                    value.language?.toLowerCase() === selectedLanguage;

                  return (
                    <button
                      key={domain.id}
                      type="button"
                      onClick={() =>
                        handleDomainSelect(domain.code, selectedLanguage)
                      }
                      className={cn(
                        "group flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-left text-sm transition-colors",
                        isCurrentValue
                          ? "bg-ilenia text-ilenia-foreground"
                          : "hover:bg-ilenia/10 hover:text-ilenia"
                      )}
                    >
                      <span>{domain.label}</span>
                      <Check
                        className={cn(
                          "h-4 w-4 shrink-0 transition-opacity",
                          isCurrentValue
                            ? "text-ilenia-foreground opacity-100"
                            : "text-ilenia opacity-0 group-hover:opacity-100"
                        )}
                      />
                    </button>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end border-t bg-muted/30 px-3 py-2 text-[10px] font-medium text-muted-foreground">
          {t("rag.selector.footer", {
            domains: totalDomains,
            languages: languages.length,
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
