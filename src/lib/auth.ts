import type { NextAuthOptions } from "next-auth";
import { getServerSession } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "@/lib/prisma";

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  session: {
    strategy: "database",
  },
  callbacks: {
    session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  events: {
    async signIn({ user, isNewUser }) {
      if (isNewUser) {
        // Assign all orphaned trades/positionLots to the first new user
        await prisma.trade.updateMany({
          where: { userId: null },
          data: { userId: user.id },
        });
        await prisma.positionLot.updateMany({
          where: { userId: null },
          data: { userId: user.id },
        });
      }
    },
  },
};

export async function getServerAuthSession() {
  return getServerSession(authOptions);
}
