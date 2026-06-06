import { NextResponse } from "next/server";

export function proxy() {
  const res = NextResponse.next();
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), interest-cohort=()"
  );
  if (process.env.NODE_ENV === "production") {
    res.headers.set(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains; preload"
    );
  }
  return res;
}

export const config = {
  // Run only on documents/API responses — skip Next internals and any static
  // asset (paths containing a dot, e.g. /images/*, /data/*.json, /icon.svg,
  // /sitemap.xml). These don't need the document security headers and were
  // adding needless latency to every asset.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.).*)"],
};
