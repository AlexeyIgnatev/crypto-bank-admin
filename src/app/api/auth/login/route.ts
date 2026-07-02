import { NextRequest, NextResponse } from "next/server";
import { upstreamFetch } from "@/lib/http";

type LoginBody = {
  email?: string;
  password?: string;
};

type LoginResponse = {
  accessToken?: string;
  refreshToken?: string;
  message?: string;
};

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as LoginBody;
  const email = body.email;
  const password = body.password;
  if (!email || !password) {
    return NextResponse.json(
      { message: "Email Рё РїР°СЂРѕР»СЊ РѕР±СЏР·Р°С‚РµР»СЊРЅС‹" },
      { status: 400 },
    );
  }

  const upstream = await upstreamFetch("/admin-management/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
    auth: false,
  });
  const data = (await upstream
    .json()
    .catch(() => null)) as LoginResponse | null;
  if (upstream.ok && data?.accessToken && data?.refreshToken) {
    const res = NextResponse.json({ ok: true });
    const isHttps = new URL(req.url).protocol === "https:";
    res.cookies.set("accessToken", data.accessToken, {
      httpOnly: true,
      path: "/",
      sameSite: "lax",
      secure: isHttps,
    });
    res.cookies.set("refreshToken", data.refreshToken, {
      httpOnly: true,
      path: "/",
      sameSite: "lax",
      secure: isHttps,
    });
    return res;
  }
  return NextResponse.json(
    { message: data?.message || "РћС€РёР±РєР° Р°РІС‚РѕСЂРёР·Р°С†РёРё" },
    { status: upstream.status || 401 },
  );
}
