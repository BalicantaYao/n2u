/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow yahoo-finance2 and pg to be server-only (don't bundle in client)
  serverExternalPackages: ["@prisma/client", "@prisma/adapter-pg", "pg", "yahoo-finance2"],
};

export default nextConfig;
