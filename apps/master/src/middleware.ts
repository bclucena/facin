import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse, type NextRequest } from "next/server";

const isPublicRoute = createRouteMatcher(["/sign-in(.*)", "/sign-up(.*)"]);

// Passthrough enquanto CLERK_SECRET_KEY não está configurado.
export default function middleware(request: NextRequest) {
  if (!process.env.CLERK_SECRET_KEY) {
    return NextResponse.next();
  }

  return clerkMiddleware((auth, req) => {
    if (!isPublicRoute(req)) {
      auth().protect();
    }
  })(request);
}

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
