// app/api/auth/[...nextauth]/route.ts
import { handlers } from "../../../../lib/auth";

// Export the handlers for NextAuth v5
export const { GET, POST } = handlers;