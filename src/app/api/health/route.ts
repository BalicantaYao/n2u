export function GET() {
  return Response.json({
    ok: true,
    env: {
      NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ? "set" : "MISSING",
      NEXTAUTH_URL: process.env.NEXTAUTH_URL ?? "MISSING",
      GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID ? "set" : "MISSING",
      GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET ? "set" : "MISSING",
      DATABASE_URL: process.env.DATABASE_URL ? "set" : "MISSING",
      NODE_ENV: process.env.NODE_ENV ?? "unknown",
    },
  });
}
