import { NextResponse } from "next/server";
import { getRequestUser } from "../../../../lib/requireAuth";

export const dynamic = "force-static";

const processedRequests = new Set<string>();

export async function POST(request: Request) {
  const user = await getRequestUser();
  if (!user) {
    return NextResponse.json({ success: false, error: "Authentication required" }, { status: 401 });
  }
  if (user.role !== "user") {
    return NextResponse.json({ success: false, error: "Citizen access required" }, { status: 403 });
  }

  const idempotencyKey = request.headers.get("Idempotency-Key");
  if (!idempotencyKey) {
    return NextResponse.json({ success: false, error: "Idempotency-Key is required" }, { status: 400 });
  }

  if (processedRequests.has(idempotencyKey)) {
    return NextResponse.json({ success: true, duplicate: true, reportId: idempotencyKey });
  }

  try {
    await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid report body" }, { status: 400 });
  }

  processedRequests.add(idempotencyKey);
  return NextResponse.json({ success: true, reportId: idempotencyKey });
}