"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { AuthModal } from "@/components/auth-modal";
import { useTranslation } from "@/providers/i18n-provider";
import { Loader } from "@/components/ai-elements/loader";
import { MessageSquare } from "lucide-react";

export default function Home() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const { t } = useTranslation();
	const [isLoading, setIsLoading] = useState(true);
	const [showAuthModal, setShowAuthModal] = useState(false);

	const callbackUrl = searchParams.get("callbackUrl");

	useEffect(() => {
		const checkAuth = async () => {
			const { data: session } = await authClient.getSession();

			if (session) {
				router.replace(callbackUrl || "/chat");
			} else {
				setIsLoading(false);
				if (callbackUrl) {
					setShowAuthModal(true);
				}
			}
		};

		checkAuth();
	}, [callbackUrl, router]);

	if (isLoading) {
		return (
			<div className="flex h-full items-center justify-center">
				<Loader size={24} />
			</div>
		);
	}

	return (
		<div className="flex h-full flex-col items-center justify-center gap-6 p-4">
			<div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-sky-600 text-white shadow-lg shadow-sky-500/30">
				<MessageSquare className="h-8 w-8" />
			</div>
			<div className="text-center space-y-2">
				<h1 className="text-2xl font-semibold">{t("auth.welcomeTitle")}</h1>
				<p className="text-muted-foreground text-sm max-w-md">
					{t("auth.signInDescription")}
				</p>
			</div>
			<AuthModal
				defaultOpen={showAuthModal}
				onOpenChange={setShowAuthModal}
				trigger={
					<button className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors cursor-pointer">
						{t("common.signIn")}
					</button>
				}
			/>
		</div>
	);
}
