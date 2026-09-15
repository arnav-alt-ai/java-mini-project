import { NextResponse } from "next/server";

export const dynamic = "force-static";
import { getRequestUser } from "../../../../lib/requireAuth";
import { getReportsForReporter } from "../../../../lib/reportStore";

export async function GET() {
  if (process.env.NEXT_PUBLIC_STATIC_DEMO === "true") {
    return NextResponse.json({ reports: [] });
  }
  const user = await getRequestUser();
  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }
  if (user.role !== "user") {
    return NextResponse.json({ error: "Citizen access required" }, { status: 403 });
  }

  return NextResponse.json({
    reports: getReportsForReporter(user.id),
  });
}