import { clerkMiddleware } from "@clerk/nextjs/server";
import { requiresAuthentication } from "@/lib/auth/paths";

export default clerkMiddleware(async (auth, req) => {
  // Early signed-out redirect only. Pages, layouts, API routes, and
  // Server Actions still enforce auth with requireAuthenticatedUser().
  if (!requiresAuthentication(req.nextUrl.pathname)) {
    return;
  }

  const { isAuthenticated, redirectToSignIn } = await auth();
  if (!isAuthenticated) {
    return redirectToSignIn();
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for Clerk's auto-proxy path
    "/__clerk/:path*",
    "/(api|trpc)(.*)",
  ],
};
