"use client";

import { MessageCircle, SquarePen, ChevronsUpDown, Settings, LogOut, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { useMemo, useState } from "react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
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
import { orpc, client, queryClient } from "@/utils/orpc";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type Chat = {
  id: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
  lastMessage?: string | null;
};

type GroupedChats = {
  today: Chat[];
  yesterday: Chat[];
  older: Chat[];
};

function isToday(date: Date): boolean {
  const today = new Date();
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
}

function isYesterday(date: Date): boolean {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return (
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear()
  );
}

function groupChatsByDate(chats: Chat[]): GroupedChats {
  const groups: GroupedChats = { today: [], yesterday: [], older: [] };
  
  for (const chat of chats) {
    const date = new Date(chat.createdAt);
    if (isToday(date)) {
      groups.today.push(chat);
    } else if (isYesterday(date)) {
      groups.yesterday.push(chat);
    } else {
      groups.older.push(chat);
    }
  }
  
  return groups;
}

export function AppSidebar() {
  const router = useRouter();
  const params = useParams();
  const { data: session, isPending } = authClient.useSession();
  const { t } = useTranslation();
  
  const currentChatId = params?.id as string | undefined;

  const { data: chats = [] } = useQuery({
    ...orpc.chat.list.queryOptions(),
    enabled: !!session,
  });

  const groupedChats = useMemo(() => groupChatsByDate(chats), [chats]);

  const [chatToDelete, setChatToDelete] = useState<string | null>(null);

  const createChatMutation = useMutation({
    mutationFn: () => client.chat.create({}),
    onSuccess: (newChat) => {
      queryClient.invalidateQueries({ queryKey: ["chat", "list"] });
      router.push(`/chat/${newChat.id}`);
    },
  });

  const deleteChatMutation = useMutation({
    mutationFn: (id: string) => client.chat.delete({ id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chat", "list"] });
      if (currentChatId === chatToDelete) {
        router.push("/chat");
      }
      setChatToDelete(null);
    },
  });

  const handleNewChat = () => {
    createChatMutation.mutate();
  };

  const handleDeleteChat = () => {
    if (chatToDelete) {
      deleteChatMutation.mutate(chatToDelete);
    }
  };

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

  const formatTime = (date: Date) => {
    const d = new Date(date);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const renderChatGroup = (label: string, chatList: Chat[]) => {
    if (chatList.length === 0) return null;
    return (
      <SidebarGroup key={label}>
        <SidebarGroupLabel className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
          {label}
        </SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            {chatList.map((chat) => {
              const isActive = chat.id === currentChatId;
              return (
                <SidebarMenuItem key={chat.id} className="group">
                  <Link
                    href={`/chat/${chat.id}`}
                    className={`
                      w-full text-left relative flex flex-col gap-1 px-2.5 py-2.5 rounded-md transition-all border
                      ${isActive
                        ? "bg-white dark:bg-slate-800 border-sidebar-border dark:border-slate-700 shadow-sm text-sidebar-foreground dark:text-white"
                        : "border-transparent text-slate-600 dark:text-slate-400 hover:bg-sidebar-accent dark:hover:bg-slate-800/50"
                      }
                    `}
                  >
                    <div className="flex items-center justify-between w-full min-w-0">
                      <span className="truncate text-xs font-medium">{chat.title}</span>
                      <span className="text-[10px] text-slate-400 font-normal tabular-nums flex-shrink-0 ml-2">
                        {formatTime(chat.createdAt)}
                      </span>
                    </div>
                    <span className="truncate text-[10px] text-slate-500 dark:text-slate-400 pr-6 block w-full">
                      {chat.lastMessage || t("chat.noMessages")}
                    </span>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setChatToDelete(chat.id);
                      }}
                      className="absolute right-2 bottom-2 p-1 opacity-0 group-hover:opacity-100 hover:bg-red-50 dark:hover:bg-red-900/30 hover:text-red-600 rounded transition-opacity"
                      title={t("common.delete")}
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </Link>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    );
  };

  return (
    <>
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
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              title={t("common.newChat")}
              onClick={handleNewChat}
              disabled={createChatMutation.isPending}
            >
              <SquarePen className="h-4 w-4" />
            </Button>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        {isLoggedIn ? (
          <>
            {renderChatGroup(t("sidebar.today"), groupedChats.today)}
            {renderChatGroup(t("sidebar.yesterday"), groupedChats.yesterday)}
            {renderChatGroup(t("sidebar.older"), groupedChats.older)}
            {chats.length === 0 && (
              <div className="flex-1 flex items-center justify-center p-4">
                <p className="text-xs text-muted-foreground text-center">
                  {t("sidebar.noChats")}
                </p>
              </div>
            )}
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

      <AlertDialog open={!!chatToDelete} onOpenChange={(open) => !open && setChatToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("chat.deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("chat.deleteDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteChat}
              className="bg-red-600 hover:bg-red-700"
            >
              {t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
