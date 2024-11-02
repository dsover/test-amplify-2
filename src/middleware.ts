import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "next-auth/middleware";
import { getToken } from "next-auth/jwt";

const transformRequestHeaders = (request: Request) => {
    // get the URL from request header
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-url", request.url);
    if (request.headers.has("token")) {
        // If request headers has token (used in API requests), then set it in Cookie before passing it to the handler
        let cookie_name = "next-auth.session-token";
        if (request.url.startsWith("https"))
            cookie_name = "__Secure-next-auth.session-token";
        requestHeaders.set(
            "Cookie",
            `${cookie_name}=${request.headers.get("token")}`
        );
    }
    return requestHeaders;
};

export default withAuth(
    function middleware(request: Request) {
        // pass the header to the layout
        return NextResponse.next({
            request: {
                headers: transformRequestHeaders(request),
            },
        });
    },
    {
        callbacks: {
            authorized: ({ req, token }) => {
                if (
                    req.nextUrl.pathname != "/login" &&
                    !req.nextUrl.pathname.startsWith("/assets/") &&
                    token === null
                ) {
                    return false;
                }
                return true;
            },
        },
    }
);

export async function middleware(request: NextRequest) {
    const pathname = request.nextUrl.pathname;

    const session = await getToken({
        req: request,
        secret: process.env.NEXTAUTH_SECRET,
    });

    const currentHost = request.headers.get("host");
    const protocol = request.nextUrl.protocol;
    // redirect user in ui that's not logged in to login page
    if (!session) {
        const callbackUrl = `${protocol}//${currentHost}${pathname}`;
        const newPathName = `/login?callbackUrl=${encodeURIComponent(callbackUrl)}`;
        return NextResponse.redirect(new URL(newPathName, request.url));
    }

    // pass the header to the layout
    return NextResponse.next({
        request: {
            headers: transformRequestHeaders(request),
        },
    });
}

export const config = {
    matcher: [
        // Match all routes except the ones in parentheses
        "/((?!login|_next|favicon.ico|api/auth).*)",
    ],
};