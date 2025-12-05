"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MessageSquare } from "lucide-react";
import { useForm } from "@tanstack/react-form";
import { toast } from "sonner";
import z from "zod";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";
import { useTranslation } from "@/providers/i18n-provider";

type AuthMode = "signIn" | "signUp";

interface AuthModalProps {
  trigger?: React.ReactNode;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  required?: boolean;
}

export function AuthModal({ trigger, defaultOpen, onOpenChange, required = false }: AuthModalProps) {
  const [mode, setMode] = useState<AuthMode>("signIn");
  const [open, setOpen] = useState(defaultOpen ?? false);
  const [signInError, setSignInError] = useState<string | null>(null);
  const router = useRouter();
  const { t } = useTranslation();

  const handleOpenChange = (newOpen: boolean) => {
    if (required && !newOpen) return;
    setOpen(newOpen);
    onOpenChange?.(newOpen);
  };

  const signInForm = useForm({
    defaultValues: {
      email: "",
      password: "",
    },
    onSubmit: async ({ value }) => {
      setSignInError(null);
      await authClient.signIn.email(
        {
          email: value.email,
          password: value.password,
        },
        {
          onSuccess: () => {
            handleOpenChange(false);
            router.push("/chat");
            toast.success(t("auth.signInSuccess"));
          },
          onError: () => {
            setSignInError(t("auth.invalidCredentials"));
          },
        }
      );
    },
    validators: {
      onSubmit: z.object({
        email: z.email(t("auth.invalidEmail")),
        password: z.string().min(8, t("auth.minChars8")),
      }),
    },
  });

  const signUpForm = useForm({
    defaultValues: {
      name: "",
      email: "",
      password: "",
    },
    onSubmit: async ({ value }) => {
      await authClient.signUp.email(
        {
          name: value.name,
          email: value.email,
          password: value.password,
        },
        {
          onSuccess: () => {
            handleOpenChange(false);
            router.push("/chat");
            toast.success(t("auth.signUpSuccess"));
          },
          onError: () => {
            toast.error(t("auth.signUpError"));
          },
        }
      );
    },
    validators: {
      onSubmit: z.object({
        name: z.string().min(2, t("auth.minChars2")),
        email: z.email(t("auth.invalidEmail")),
        password: z.string().min(8, t("auth.minChars8")),
      }),
    },
  });

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent
        className="sm:max-w-md"
        showCloseButton={!required}
        onInteractOutside={required ? (e) => e.preventDefault() : undefined}
        onEscapeKeyDown={required ? (e) => e.preventDefault() : undefined}
      >
        <DialogHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-ilenia text-white shadow-lg shadow-ilenia/30">
            <MessageSquare className="h-6 w-6" />
          </div>
          <DialogTitle className="text-2xl">
            {mode === "signIn" ? t("auth.welcomeTitle") : t("auth.createAccount")}
          </DialogTitle>
          <DialogDescription>
            {mode === "signIn"
              ? t("auth.signInDescription")
              : t("auth.signUpDescription")}
          </DialogDescription>
        </DialogHeader>

        {mode === "signIn" ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              signInForm.handleSubmit();
            }}
            className="space-y-4"
          >
            <signInForm.Field name="email">
              {(field) => (
                <div className="space-y-2">
                  <Label htmlFor={field.name}>{t("auth.email")}</Label>
                  <Input
                    id={field.name}
                    type="email"
                    placeholder="usuario@ejemplo.com"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                  />
                  {field.state.meta.errors.map((error) => (
                    <p key={error?.message} className="text-xs text-red-500">
                      {error?.message}
                    </p>
                  ))}
                </div>
              )}
            </signInForm.Field>

            <signInForm.Field name="password">
              {(field) => (
                <div className="space-y-2">
                  <Label htmlFor={field.name}>{t("auth.password")}</Label>
                  <Input
                    id={field.name}
                    type="password"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                  />
                  {field.state.meta.errors.map((error) => (
                    <p key={error?.message} className="text-xs text-red-500">
                      {error?.message}
                    </p>
                  ))}
                </div>
              )}
            </signInForm.Field>

            {signInError && (
              <p className="text-sm text-red-500 text-center">{signInError}</p>
            )}

            <signInForm.Subscribe>
              {(state) => (
                <Button
                  type="submit"
                  className="w-full"
                  disabled={!state.canSubmit || state.isSubmitting}
                >
                  {state.isSubmitting ? t("auth.signingIn") : t("auth.signInButton")}
                </Button>
              )}
            </signInForm.Subscribe>

            <p className="text-center text-sm text-muted-foreground">
              {t("auth.noAccount")}{" "}
              <button
                type="button"
                onClick={() => {
                  setSignInError(null);
                  setMode("signUp");
                }}
                className="text-ilenia hover:underline"
              >
                {t("auth.register")}
              </button>
            </p>
          </form>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              signUpForm.handleSubmit();
            }}
            className="space-y-4"
          >
            <signUpForm.Field name="name">
              {(field) => (
                <div className="space-y-2">
                  <Label htmlFor={field.name}>{t("auth.name")}</Label>
                  <Input
                    id={field.name}
                    placeholder="Tu nombre"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                  />
                  {field.state.meta.errors.map((error) => (
                    <p key={error?.message} className="text-xs text-red-500">
                      {error?.message}
                    </p>
                  ))}
                </div>
              )}
            </signUpForm.Field>

            <signUpForm.Field name="email">
              {(field) => (
                <div className="space-y-2">
                  <Label htmlFor={field.name}>{t("auth.email")}</Label>
                  <Input
                    id={field.name}
                    type="email"
                    placeholder="usuario@ejemplo.com"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                  />
                  {field.state.meta.errors.map((error) => (
                    <p key={error?.message} className="text-xs text-red-500">
                      {error?.message}
                    </p>
                  ))}
                </div>
              )}
            </signUpForm.Field>

            <signUpForm.Field name="password">
              {(field) => (
                <div className="space-y-2">
                  <Label htmlFor={field.name}>{t("auth.password")}</Label>
                  <Input
                    id={field.name}
                    type="password"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                  />
                  {field.state.meta.errors.map((error) => (
                    <p key={error?.message} className="text-xs text-red-500">
                      {error?.message}
                    </p>
                  ))}
                </div>
              )}
            </signUpForm.Field>

            <signUpForm.Subscribe>
              {(state) => (
                <Button
                  type="submit"
                  className="w-full"
                  disabled={!state.canSubmit || state.isSubmitting}
                >
                  {state.isSubmitting ? t("auth.creating") : t("auth.createAccountButton")}
                </Button>
              )}
            </signUpForm.Subscribe>

            <p className="text-center text-sm text-muted-foreground">
              {t("auth.hasAccount")}{" "}
              <button
                type="button"
                onClick={() => setMode("signIn")}
                className="text-ilenia hover:underline"
              >
                {t("auth.signInLink")}
              </button>
            </p>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
