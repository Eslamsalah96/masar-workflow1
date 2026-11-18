
import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const COOKIE_NAME = "masar_session";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(COOKIE_NAME)?.value;

  // السماح بصفحة تسجيل الدخول وواجهات المصادقة
  if (
    pathname === "/login" ||
    pathname.startsWith("/api/auth/login") ||
    pathname.startsWith("/api/auth/logout")
  ) {
    if (pathname === "/login" && token) {
      try {
        const secret = new TextEncoder().encode(
          process.env.AUTH_SECRET
        );

        await jwtVerify(token, secret);
        return NextResponse.redirect(new URL("/", request.url));
      } catch {
        return NextResponse.next();
      }
    }

    return NextResponse.next();
  }

  // منع الدخول بدون جلسة
  if (!token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // التحقق من صحة الجلسة وتاريخ انتهائها
  try {
    const secret = new TextEncoder().encode(
      process.env.AUTH_SECRET
    );

    const { payload } = await jwtVerify(token, secret);

    if (!payload.sub) {
      throw new Error("Invalid session");
    }

    return NextResponse.next();
  } catch {
    const response = NextResponse.redirect(
      new URL("/login", request.url)
    );

    response.cookies.delete(COOKIE_NAME);
    return response;
  }
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)).*)",
  ],
};
