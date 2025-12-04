import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "../index.css";
import Providers from "@/components/providers";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import Header from "@/components/header";

const geistSans = Geist({
	variable: "--font-geist-sans",
	subsets: ["latin"],
});

const geistMono = Geist_Mono({
	variable: "--font-geist-mono",
	subsets: ["latin"],
});

export const metadata: Metadata = {
	title: "ILENIA Chat",
	description: "Interfaz de chat RAG multilingüe del proyecto ILENIA",
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="es" suppressHydrationWarning>
			<body
				className={`${geistSans.variable} ${geistMono.variable} antialiased`}
			>
				<Providers>
					<SidebarProvider>
						<AppSidebar />
						<SidebarInset className="flex flex-col h-screen">
							<Header />
							<main className="flex-1 overflow-hidden">
								{children}
							</main>
						</SidebarInset>
					</SidebarProvider>
				</Providers>
			</body>
		</html>
	);
}
