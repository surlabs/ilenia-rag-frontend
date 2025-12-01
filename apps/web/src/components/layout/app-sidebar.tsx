"use client";

import { MessageCircle, SquarePen, ChevronsUpDown, Settings, LogOut } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { authClient } from "@/lib/auth-client";
import { AuthModal } from "@/components/auth-modal";
import { useTranslation } from "@/providers/i18n-provider";

export function AppSidebar() {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();
  const { t } = useTranslation();

  const handleSignOut = () => {
    authClient.signOut({
      fetchOptions: {
        onSuccess: () => {
          router.refresh();
        },
      },
    });
  };

  const isLoggedIn = !isPending && !!session;

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center justify-between px-2 py-1">
          <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-sky-600 text-white shadow-sm">
              <MessageCircle className="h-4 w-4" />
            </div>
            <span className="text-sm">
              ILENIA<span className="text-sky-600">Chat</span>
            </span>
          </Link>
          {isLoggedIn && (
            <Button variant="ghost" size="icon" className="h-8 w-8" title={t("common.newChat")} asChild>
              <Link href="/chat">
                <SquarePen className="h-4 w-4" />
              </Link>
            </Button>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        {isLoggedIn ? (
          <>
            <SidebarGroup>
              <SidebarGroupLabel className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                {t("sidebar.today")}
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton isActive>
                      <span className="truncate text-xs font-medium">Estado del Euskera en IA</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton>
                      <span className="truncate text-xs">Resumen Proyecto ILENIA</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            <SidebarGroup>
              <SidebarGroupLabel className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                {t("sidebar.yesterday")}
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton>
                      <span className="truncate text-xs">Traducción Jurídica GL</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center p-4">
            <p className="text-xs text-muted-foreground text-center">
              {t("sidebar.loginToSeeHistory")}
            </p>
          </div>
        )}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        {isPending ? (
          <div className="flex items-center gap-3 p-2">
            <Skeleton className="h-8 w-8 rounded-md" />
            <div className="flex-1">
              <Skeleton className="h-3 w-20 mb-1" />
              <Skeleton className="h-2 w-24" />
            </div>
          </div>
        ) : session ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex w-full items-center gap-3 rounded-lg p-2 hover:bg-sidebar-accent transition-colors group">
                <div className="flex h-8 w-8 items-center justify-center rounded-md border border-sky-200 bg-sky-100 text-xs font-semibold text-sky-700 group-hover:border-sky-300 dark:border-sky-800 dark:bg-sky-900 dark:text-sky-300">
                  {session.user.name?.slice(0, 2).toUpperCase() || "U"}
                </div>
                <div className="flex-1 text-left min-w-0">
                  <div className="truncate text-xs font-semibold text-slate-800 dark:text-slate-200">
                    {session.user.name}
                  </div>
                  <div className="truncate text-[10px] text-slate-500 dark:text-slate-400">
                    {session.user.email}
                  </div>
                </div>
                <ChevronsUpDown className="h-3 w-3 text-slate-400" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="top" align="start" className="w-56">
              <DropdownMenuItem>
                <Settings className="mr-2 h-4 w-4" />
                {t("common.settings")}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut} className="text-red-600 focus:text-red-600">
                <LogOut className="mr-2 h-4 w-4" />
                {t("common.signOut")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <div className="p-2">
            <AuthModal
              defaultOpen={true}
              trigger={
                <Button variant="outline" className="w-full">
                  {t("common.signIn")}
                </Button>
              }
            />
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
