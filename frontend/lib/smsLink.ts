export function getSmsSeparator(userAgent = typeof navigator !== "undefined" ? navigator.userAgent : "") {
  return /(iPhone|iPad|iPod|Macintosh)/i.test(userAgent) ? "&" : "?";
}

export function formatEmergencyLocation(latitude: number | null, longitude: number | null, accuracy?: number | null) {
  if (latitude === null || longitude === null) return "Location unavailable";
  const radius = Math.max(1, Math.round(accuracy ?? 0));
  return `https://maps.google.com/?q=${latitude},${longitude} (±${radius}m)`;
}

export function buildEmergencyMessage({
  name = "User",
  latitude,
  longitude,
  accuracy,
  createdAt = new Date(),
  medicalSummary,
}: {
  name?: string;
  latitude: number | null;
  longitude: number | null;
  accuracy?: number | null;
  createdAt?: Date;
  medicalSummary?: string;
}) {
  const time = new Intl.DateTimeFormat("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "short",
  }).format(createdAt);

  const summary = medicalSummary ? `\n${medicalSummary}` : "";
  const message = `EMERGENCY - ${name} needs help.\nLocation: ${formatEmergencyLocation(latitude, longitude, accuracy)}\nTime: ${time}${summary}\nCall 112.`;

  return message.length > 300 ? `${message.slice(0, 297)}...` : message;
}

export function buildSmsLink(
  phoneNumbers: string[],
  message: string,
  userAgent = typeof navigator !== "undefined" ? navigator.userAgent : ""
) {
  const numbers = phoneNumbers.filter(Boolean).join(",");
  const separator = getSmsSeparator(userAgent);

  return `sms:${numbers}${separator}body=${encodeURIComponent(message)}`;
}

export function buildWhatsAppLink(phoneNumber: string, message: string) {
  const normalized = phoneNumber.replace(/\D/g, "");
  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
}
