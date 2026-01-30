import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";

import { PrismaClient } from "../generated/prisma";

const prisma = new PrismaClient();
export const auth = betterAuth({
    baseURL:process.env.BETTER_AUTH_URL,
    trustedOrigins:["http://localhost:3000"],
    database: prismaAdapter(prisma, {
        provider: "postgresql", 
    }),
    socialProviders:{
        google:{
            prompt:"select_account consent",
            clientId: process.env.CLIENT_ID as string,
            clientSecret:process.env.CLIENT_SECRET as string
        }
   }
});