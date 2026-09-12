import { Role } from "@prisma/client";
import NextAuth, { DefaultSession, DefaultUser } from "next-auth";
import { DefaultJWT } from "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      firstName?: string;
      lastName?: string;
      image?: string;
    } & DefaultSession["user"];
  }

  interface User extends DefaultUser {
    id: string;
    email: string;
    
    firstName?: string;
    lastName?: string;
    image?: string;
  }

  interface JWT extends DefaultJWT {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
    image?: string;
  }
}
