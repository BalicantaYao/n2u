import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: { signIn: "/login" },
});

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
