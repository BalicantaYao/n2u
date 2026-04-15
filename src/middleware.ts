export { default } from "next-auth/middleware";

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/journal/:path*",
    "/positions/:path*",
    "/results/:path*",
    "/charts/:path*",
    "/api/trades/:path*",
    "/api/positions/:path*",
    "/api/pnl/:path*",
    "/api/results/:path*",
  ],
};
