import { getSession, unauthorizedResponse } from "@/lib/auth/session";

export async function GET() {
  const session = await getSession();

  if (!session) {
    return unauthorizedResponse();
  }

  return Response.json({
    user: {
      id: session.sub,
      email: session.email,
      name: session.name,
      role: session.role,
    },
  });
}
