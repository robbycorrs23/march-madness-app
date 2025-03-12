import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

const handler = NextAuth({
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        password: { label: "Admin Password", type: "password" }
      },
      async authorize(credentials) {
        if (credentials?.password === process.env.ADMIN_PASSWORD) {
          return { id: "admin", name: "Admin", isAdmin: true };
        }
        return null;
      }
    }),
  ],
  pages: {
    signIn: "/admin/login",
  },
  callbacks: {
    async redirect({ url, baseUrl }) {
      return `${baseUrl}/admin`;
    },
    async session({ session, token }) {
      if (session.user) {
        // TypeScript-safe way to assign the property
        session.user = {
          ...session.user,
          isAdmin: true
        };
      }
      return session;
    },
  },
});

export { handler as GET, handler as POST };
