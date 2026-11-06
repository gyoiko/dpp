import { clearSessionCookie, requestIsSameOrigin } from "@/lib/auth/session";

export async function POST(request: Request) {
  if (!requestIsSameOrigin(request)) {
    return Response.json({ error: "Cross-origin logout is not allowed." }, { status: 403 });
  }

  await clearSessionCookie();
  return Response.json({ ok: true });
}
