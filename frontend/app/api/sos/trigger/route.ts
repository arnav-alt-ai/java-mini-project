import { NextResponse } from "next/server";

export const dynamic = "force-static";
import type { EmergencyContact, EmergencyReport } from "../../../../lib/models";
import { buildEmergencyMessage } from "../../../../lib/smsLink";
import { getRequestUser } from "../../../../lib/requireAuth";

type TriggerRequest = {
  userId: string;
  clientRequestId?: string;
  latitude: number | null;
  longitude: number | null;
  emergencyType?: string;
  contacts?: EmergencyContact[];
};

const processedRequests = new Set<string>();

const isValidCoordinate = (value: number | null) =>
  value === null || (Number.isFinite(value) && Math.abs(value) <= 180);

const mapsLink = (latitude: number | null, longitude: number | null) =>
  latitude !== null && longitude !== null
    ? `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`
    : "Location unavailable";

async function sendSms(contact: EmergencyContact, message: string) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_FROM_NUMBER;

  if (!accountSid || !authToken || !fromNumber) {
    throw new Error("SMS provider is not configured");
  }

  const body = new URLSearchParams({ To: contact.phoneNumber, From: fromNumber, Body: message });
  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    }
  );

  if (!response.ok) throw new Error(`SMS failed with status ${response.status}`);
}

async function sendWithRetry(contact: EmergencyContact, message: string) {
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      await sendSms(contact, message);
      return;
    } catch (error) {
      if (attempt === 3) {
        console.error(`SOS SMS permanently failed for ${contact.id}`, error);
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, 250 * attempt));
    }
  }
}

export async function POST(request: Request) {
  const user = await getRequestUser();
  if (!user) {
    return NextResponse.json({ success: false, error: "Authentication required" }, { status: 401 });
  }
  if (user.role !== "user") {
    return NextResponse.json({ success: false, error: "Citizen access required" }, { status: 403 });
  }

  let body: TriggerRequest;

  try {
    body = (await request.json()) as TriggerRequest;
  } catch {
    return NextResponse.json({ success: false, error: "Invalid request body" }, { status: 400 });
  }

  if (!body.userId || !isValidCoordinate(body.latitude) || !isValidCoordinate(body.longitude)) {
    return NextResponse.json({ success: false, error: "Invalid SOS request" }, { status: 400 });
  }

  const idempotencyKey = request.headers.get("Idempotency-Key") || body.clientRequestId;
  if (!idempotencyKey) {
    return NextResponse.json({ success: false, error: "Idempotency-Key is required" }, { status: 400 });
  }
  if (processedRequests.has(idempotencyKey)) {
    return NextResponse.json({ success: true, duplicate: true, contactsNotified: [], reportId: idempotencyKey });
  }

  const contacts = (body.contacts ?? []).slice(0, 3);
  const report: EmergencyReport = {
    id: crypto.randomUUID(),
    userId: body.userId,
    latitude: body.latitude,
    longitude: body.longitude,
    emergencyType: body.emergencyType || "unknown",
    channel: "sos_multi_channel",
    createdAt: new Date().toISOString(),
  };
  const message = buildEmergencyMessage({
    name: "User",
    latitude: body.latitude,
    longitude: body.longitude,
    accuracy: null,
    createdAt: new Date(),
  });

  void Promise.all(contacts.map((contact) => sendWithRetry(contact, message)));
  processedRequests.add(idempotencyKey);

  return NextResponse.json({
    success: true,
    contactsNotified: contacts.map((contact) => contact.id),
    reportId: report.id,
    smsConfigured: Boolean(
      process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_FROM_NUMBER
    ),
  });
}