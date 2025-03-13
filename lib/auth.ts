// lib/auth.ts
import * as nextAuthModule from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import type { Session } from "next-auth";
import type { JWT } from "next-auth/jwt";

// Extract the default export
const NextAuth = (nextAuthModule as any).default || nextAuthModule;

const prisma = new PrismaClient();

// Custom types for our callbacks
interface SessionParams {
  session: Session;
  token: JWT & { id?: string; isAdmin?: boolean };
}

interface JWTParams {
  token: JWT & { id?: string; isAdmin?: boolean };
  user?: { id: string; isAdmin?: boolean; [key: string]: any };
}

// Define the auth options without relying on imported types
export const authOptions = {
  providers: [
    // Admin login provider
    CredentialsProvider({
      id: 'admin-credentials',
      name: "Admin Login",
      credentials: {
        password: { label: "Admin Password", type: "password" }
      },
      async authorize(credentials) {
        // Type assertion for credentials
        const password = credentials?.password as string;
        
        if (password === process.env.ADMIN_PASSWORD) {
          return { 
            id: "admin", 
            name: "Admin", 
            email: "admin@marchmadness.com",
            isAdmin: true 
          };
        }
        return null;
      }
    }),
    
    // Regular user credentials provider
    CredentialsProvider({
      id: 'user-credentials',
      name: 'User Credentials',
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }
        
        // Type assertions for credentials
        const email = credentials.email as string;
        const password = credentials.password as string;
        
        const user = await prisma.user.findUnique({
          where: { email }
        });
        
        if (!user) {
          return null;
        }
        
        const isValidPassword = await bcrypt.compare(
          password,
          user.password
        );
        
        if (!isValidPassword) {
          return null;
        }
        
        return {
          id: user.id.toString(),
          email: user.email,
          name: user.name,
          isAdmin: user.isAdmin
        };
      }
    })
  ],
  
  callbacks: {
    async session({ session, token }: SessionParams) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.isAdmin = Boolean(token.isAdmin);
      }
      return session;
    },
    
    async jwt({ token, user }: JWTParams) {
      if (user) {
        token.id = user.id;
        token.isAdmin = user.isAdmin;
      }
      return token;
    }
  },
  
  pages: {
    signIn: '/login',
    error: '/login',
  },
  
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  
  secret: process.env.NEXTAUTH_SECRET,
};

// Export the NextAuth functions, using dynamic access to handle different exports between versions
export const { auth, handlers, signIn, signOut } = NextAuth(authOptions);