import { NextResponse } from "next/server";

export async function POST() {
  const response = NextResponse.json({ success: true });
  response.cookies.set("rc_client", "", { path: "/", maxAge: 0 });
  response.cookies.set("rc_user", "", { path: "/", maxAge: 0 });
  return response;
}
