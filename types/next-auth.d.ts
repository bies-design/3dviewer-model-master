import NextAuth from "next-auth";
import { DefaultSession, DefaultJWT } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: 'user' | 'admin';
    } & DefaultSession["user"];
  }

  interface JWT {
    id: string;
    role: 'user' | 'admin';
  }
}