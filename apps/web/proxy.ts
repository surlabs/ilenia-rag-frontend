import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const protectedRoutes = ["/chat"];

export function proxy(request: NextRequest) {
	const { pathname } = request.nextUrl;

	const isProtectedRoute = protectedRoutes.some(
		(route) => pathname === route || pathname.startsWith(`${route}/`)
	);

	if (!isProtectedRoute) {
		return NextResponse.next();
	}

	const sessionCookie = request.cookies.get("better-auth.session_token");

	if (!sessionCookie?.value) {
		const homeUrl = new URL("/", request.url);
		homeUrl.searchParams.set("callbackUrl", pathname);
		return NextResponse.redirect(homeUrl);
	}

	return NextResponse.next();
}

export const config = {
	matcher: [
		"/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
	],
};
