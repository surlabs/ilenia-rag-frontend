import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	typedRoutes: true,
	serverExternalPackages: ['pino', 'thread-stream'],
};

export default nextConfig;
