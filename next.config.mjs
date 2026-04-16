/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow yahoo-finance2 and pg to be server-only (don't bundle in client)
  experimental: {
    serverComponentsExternalPackages: ["@prisma/client", "@prisma/adapter-pg", "pg", "yahoo-finance2"],
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
    ],
  },
};

export default nextConfig;
