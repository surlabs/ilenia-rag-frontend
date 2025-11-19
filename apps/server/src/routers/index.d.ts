import type { RouterClient } from "@orpc/server";
export declare const appRouter: {
    healthCheck: import("@orpc/server").DecoratedProcedure<{
        session: {
            session: {
                id: string;
                userId: string;
                expiresAt: Date;
                createdAt: Date;
                updatedAt: Date;
                token: string;
                ipAddress?: string | null | undefined | undefined;
                userAgent?: string | null | undefined | undefined;
            };
            user: {
                id: string;
                email: string;
                emailVerified: boolean;
                name: string;
                createdAt: Date;
                updatedAt: Date;
                image?: string | null | undefined | undefined;
            };
        } | null;
    } & Record<never, never>, {
        session: {
            session: {
                id: string;
                userId: string;
                expiresAt: Date;
                createdAt: Date;
                updatedAt: Date;
                token: string;
                ipAddress?: string | null | undefined | undefined;
                userAgent?: string | null | undefined | undefined;
            };
            user: {
                id: string;
                email: string;
                emailVerified: boolean;
                name: string;
                createdAt: Date;
                updatedAt: Date;
                image?: string | null | undefined | undefined;
            };
        } | null;
    }, import("@orpc/contract").Schema<unknown, unknown>, import("@orpc/contract").Schema<string, string>, Record<never, never>, Record<never, never>>;
    privateData: import("@orpc/server").DecoratedProcedure<import("@orpc/server").MergedInitialContext<{
        session: {
            session: {
                id: string;
                userId: string;
                expiresAt: Date;
                createdAt: Date;
                updatedAt: Date;
                token: string;
                ipAddress?: string | null | undefined | undefined;
                userAgent?: string | null | undefined | undefined;
            };
            user: {
                id: string;
                email: string;
                emailVerified: boolean;
                name: string;
                createdAt: Date;
                updatedAt: Date;
                image?: string | null | undefined | undefined;
            };
        } | null;
    } & Record<never, never>, {
        session: {
            session: {
                id: string;
                userId: string;
                expiresAt: Date;
                createdAt: Date;
                updatedAt: Date;
                token: string;
                ipAddress?: string | null | undefined | undefined;
                userAgent?: string | null | undefined | undefined;
            };
            user: {
                id: string;
                email: string;
                emailVerified: boolean;
                name: string;
                createdAt: Date;
                updatedAt: Date;
                image?: string | null | undefined | undefined;
            };
        } | null;
    } & Record<never, never>, {
        session: {
            session: {
                id: string;
                userId: string;
                expiresAt: Date;
                createdAt: Date;
                updatedAt: Date;
                token: string;
                ipAddress?: string | null | undefined | undefined;
                userAgent?: string | null | undefined | undefined;
            };
            user: {
                id: string;
                email: string;
                emailVerified: boolean;
                name: string;
                createdAt: Date;
                updatedAt: Date;
                image?: string | null | undefined | undefined;
            };
        } | null;
    }>, import("@orpc/server").MergedCurrentContext<{
        session: {
            session: {
                id: string;
                userId: string;
                expiresAt: Date;
                createdAt: Date;
                updatedAt: Date;
                token: string;
                ipAddress?: string | null | undefined | undefined;
                userAgent?: string | null | undefined | undefined;
            };
            user: {
                id: string;
                email: string;
                emailVerified: boolean;
                name: string;
                createdAt: Date;
                updatedAt: Date;
                image?: string | null | undefined | undefined;
            };
        } | null;
    }, {
        session: {
            session: {
                id: string;
                userId: string;
                expiresAt: Date;
                createdAt: Date;
                updatedAt: Date;
                token: string;
                ipAddress?: string | null | undefined | undefined;
                userAgent?: string | null | undefined | undefined;
            };
            user: {
                id: string;
                email: string;
                emailVerified: boolean;
                name: string;
                createdAt: Date;
                updatedAt: Date;
                image?: string | null | undefined | undefined;
            };
        };
    }>, import("@orpc/contract").Schema<unknown, unknown>, import("@orpc/contract").Schema<{
        message: string;
        user: {
            id: string;
            email: string;
            emailVerified: boolean;
            name: string;
            createdAt: Date;
            updatedAt: Date;
            image?: string | null | undefined | undefined;
        };
    }, {
        message: string;
        user: {
            id: string;
            email: string;
            emailVerified: boolean;
            name: string;
            createdAt: Date;
            updatedAt: Date;
            image?: string | null | undefined | undefined;
        };
    }>, Record<never, never>, Record<never, never>>;
};
export type AppRouter = typeof appRouter;
export type AppRouterClient = RouterClient<typeof appRouter>;
//# sourceMappingURL=index.d.ts.map