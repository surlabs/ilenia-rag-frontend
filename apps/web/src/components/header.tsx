"use client";

import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { ModeToggle } from "./mode-toggle";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { ChevronDown } from "lucide-react";

const LANGUAGES = [
	{ code: "ES", label: "Castellano" },
	{ code: "EU", label: "Euskera" },
	{ code: "GL", label: "Galego" },
	{ code: "VA", label: "Valencià" },
] as const;

export default function Header() {
	return (
		<header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-slate-100 bg-white/90 px-4 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/90">
			<div className="flex items-center gap-2">
				<SidebarTrigger className="-ml-2" />
				<Separator orientation="vertical" className="mr-2 h-4 hidden md:block" />
				<nav className="hidden md:flex items-center text-xs text-slate-500 dark:text-slate-400 gap-2">
					<span className="hover:text-slate-900 dark:hover:text-white cursor-pointer">Chats</span>
					<span className="text-slate-300">/</span>
					<span className="font-medium text-slate-900 dark:text-white">Nuevo Chat</span>
				</nav>
				<span className="md:hidden font-semibold text-sm text-slate-900 dark:text-white">
					ILENIA Chat
				</span>
			</div>

			<div className="flex items-center gap-2">
				<ModeToggle />
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button variant="ghost" size="sm" className="gap-1.5 text-xs font-medium">
							<span className="uppercase">ES</span>
							<ChevronDown className="h-3 w-3 opacity-50" />
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end">
						{LANGUAGES.map((lang) => (
							<DropdownMenuItem key={lang.code} className="text-xs">
								{lang.label}
							</DropdownMenuItem>
						))}
					</DropdownMenuContent>
				</DropdownMenu>
			</div>
		</header>
	);
}
