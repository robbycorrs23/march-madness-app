// lib/auth.ts
import * as nextAuthModule from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import type { Session } from "next-auth";
import type { JWT } from "next-auth/jwt";

// Extract the default export
const NextAuth = (nextAuthModule as any).default || nextAuthModule;

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
    // Single admin login provider
    CredentialsProvider({
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
    signIn: '/admin/login',
    error: '/admin/login',
  },
  
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  
  secret: process.env.NEXTAUTH_SECRET,
};

// Export the NextAuth functions, using dynamic access to handle different exports between versions
export const { auth, handlers, signIn, signOut } = NextAuth(authOptions);