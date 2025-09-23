import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { login, password } = await req.json().catch(() => ({} as any));
  if (login === "admin" && password === "admin") {
    const res = NextResponse.json({ ok: true });
    res.cookies.set("admin_auth", "1", {
      httpOnly: true,
      path: "/",
      sameSite: "lax",
      // session cookie (no maxAge) — достаточно для демо
    });
    return res;
  }
  return NextResponse.json({ message: "Неверный логин или пароль" }, { status: 401 });
}
