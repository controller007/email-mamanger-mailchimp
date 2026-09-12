import NextAuth, { type NextAuthOptions } from "next-auth";
import bcrypt from "bcryptjs";
import CredentialsProvider from "next-auth/providers/credentials";

import prisma from "@/app/_lib/db/prisma";
import { GetUserByEmail } from "@/app/_lib/db/users";
import type { Session } from "next-auth";
import type { JWT } from "next-auth/jwt";

export const authOptions: NextAuthOptions = {
  debug: true,
  session: {
    strategy: "jwt",
    maxAge: 7 * 24 * 60 * 60,
  },
  secret: process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      id: "credentials",
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "text", placeholder: "john@doe.com" },
        password: { label: "Password", type: "password" },
        admin: { label: "Admin", type: "text" },
      },
      async authorize(credentials) {
        try {
          if (!credentials?.email || !credentials?.password) {
            return null;
          }

          const user = await prisma.user.findFirst({
            where: {
              OR: [
                {
                  email: credentials.email,
                },
                {
                  username: credentials.email,
                },
              ],
            },
          });

          if (!user || !user.password) {
            return null;
          }

          const passwordsMatch = await bcrypt.compare(
            credentials.password,
            user.password,
          );

          if (passwordsMatch) {
            if (user?.blocked) {
              throw new Error(JSON.stringify({ blocked: true }));
            }
            // await updateUserLastLogin(user.id)
            return {
              id: user.id,
              email: user.email,
              firstName: user.firstName || undefined,
              lastName: user.lastName || undefined,
              image: user.image || undefined,
            };
          }
          return null;
        } catch (e: any) {
          throw new Error(JSON.stringify(JSON.parse(e.message)));
        }
      },
    }),
    // FacebookProvider({
    //   clientId: process.env.FACEBOOK_APP_ID!,
    //   clientSecret: process.env.FACEBOOK_APP_SECRET!,
    //   // authorization: {
    //   //   params: {
    //   //     scope: 'public_profile,email,user_mobile_phone',
    //   //   },
    //   // },
    // }),
    // GoogleProvider({
    //   clientId: process.env.GOOGLE_CLIENT_ID!,
    //   clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    //   authorization: {
    //     params: {
    //       scope: 'profile email https://www.googleapis.com/auth/user.phonenumbers.read',
    //     },
    //   },
    // }),
  ],

  callbacks: {
    // async signIn({ user, account }: { user: User; account: Account | null }) {
    //   if (account?.provider === 'google' || account?.provider === 'facebook') {
    //     const { email, name, image } = user;

    //     try {
    //       const accessToken = account.access_token;

    //       let phoneNumber = null;

    //       if (account.provider === "google") {
    //         const response = await fetch("https://people.googleapis.com/v1/people/me?personFields=phoneNumbers", {
    //           method: "GET",
    //           headers: {
    //             Authorization: `Bearer ${accessToken}`,
    //             "Content-Type": "application/json",
    //           },
    //         })

    //         if (!response.ok) {
    //           throw new Error(`HTTP error! status: ${response.status}`)
    //         }

    //         const data = await response.json()

    //         if (data.phoneNumbers && data.phoneNumbers.length > 0) {
    //           phoneNumber = data.phoneNumbers[0].value
    //         }
    //       }

    //       console.log("Phone Number:", phoneNumber)

    //       const existingUser = await GetUserByEmail(email);
    //       if (!existingUser) {
    //         const userNew = await CreateUserOauth({
    //           email,
    //           number: null,
    //           profileImage: image as string,
    //           name: name as string,
    //         }, account?.provider?.toUpperCase() as AuthProviderType);
    //         await CreateNotification([userNew.id], `<strong>${userNew.firstName} ${userNew.lastName}</strong> welcome to <strong>Ship Market Square</strong>`, "Welcome to the grandest shipyard—we're ready for your next move.", "WELCOME_MESSAGE", userNew.id, userNew.id)
    //         const admins = await GetAdmins()
    //         await CreateNotification([...admins.map(admin => admin.id)], `<strong>${userNew.firstName} ${userNew.lastName}</strong> is successfully registered on <strong>Ship Market Square</strong>`, `Username: ${userNew.username}`, "NEW_ACCOUNT", userNew.id, userNew.id)
    //       }
    //       return true;

    //     } catch (error) {
    //       console.error("Error during sign-in:", error);
    //       return false;
    //     }
    //   }

    //   return true;
    // },

    async session({ token, session }) {
      if (token && !token.error) {
        const user = await GetUserByEmail(token.email as string);
        if (!user || user.blocked) {
          return {} as Session;
        }
        session.user.id = user.id as string;
        session.user.firstName = user.firstName as string;
        session.user.lastName = user.lastName as string;
        session.user.email = user.email as string;
        session.user.image = (user.image || token.image) as string;
        return session;
      }

      return session;
    },
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.firstName = user.firstName || user.name?.split(" ")[0];
        token.lastName = user.lastName || user.name?.split(" ")[1];
        token.image = user.image;
      } else if (token.email) {
        const dbUser = await GetUserByEmail(token.email);
        if (!dbUser || dbUser.blocked) {
          return {} as JWT;
        }
        if (dbUser) {
          token.id = dbUser.id;
          token.firstName = dbUser.firstName;
          token.lastName = dbUser.lastName;
          token.image = dbUser.image || token.image;
        } else {
          return { error: "deleted-user" };
        }
      }
      return token;
    },

    async redirect({ url, baseUrl }) {
      // if (url.startsWith(baseUrl)) {
      //   return url;
      // }
      // if (url.startsWith('/')) {
      //   return new URL(url, baseUrl).toString();
      // }
      return `${baseUrl}/`;
    },
  },
};

export const handler = NextAuth(authOptions);
