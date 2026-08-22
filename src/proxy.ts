import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { requiresAuthentication } from "@/lib/auth/paths";

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    if (requiresAuthentication(request.nextUrl.pathname)) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/sign-in";
      redirectUrl.search = "?error=config";
      return NextResponse.redirect(redirectUrl);
    }
    return supabaseResponse;
  }

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options),
        );
        if (headers) {
          Object.entries(headers).forEach(([header, value]) => {
            supabaseResponse.headers.set(header, value);
          });
        }
      },
    },
  });

  let claims: { sub?: string } | null = null;
  try {
    const { data } = await supabase.auth.getClaims();
    claims = data?.claims ?? null;
  } catch {
    claims = null;
  }
  if (requiresAuthentication(request.nextUrl.pathname) && !claims) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/sign-in";
    redirectUrl.search = "";
    const nextPath = `${request.nextUrl.pathname}${request.nextUrl.search}`;
    if (nextPath.startsWith("/") && !nextPath.startsWith("//")) {
      redirectUrl.searchParams.set("next", nextPath);
    }
    return NextResponse.redirect(redirectUrl);
  }

  return supabaseResponse;
}

export default proxy;

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
