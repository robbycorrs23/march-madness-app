// lib/auth-types.ts

// Extended user type that includes the isAdmin property
export interface ExtendedUser {
  id?: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  isAdmin?: boolean;
}

// Helper function to safely access the user with proper typing
export function getExtendedUser(session: any): ExtendedUser | undefined {
  return session?.user as ExtendedUser | undefined;
}