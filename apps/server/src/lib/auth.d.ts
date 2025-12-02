export declare const auth: import("better-auth").Auth<{
    database: (options: import("better-auth").BetterAuthOptions) => import("better-auth").DBAdapter<import("better-auth").BetterAuthOptions>;
    trustedOrigins: string[];
    emailAndPassword: {
        enabled: true;
    };
    advanced: {
        defaultCookieAttributes: {
            sameSite: "none";
            secure: true;
            httpOnly: true;
        };
    };
}>;
//# sourceMappingURL=auth.d.ts.map