import assert from "node:assert/strict";
import test from "node:test";

import { buildEmergencyMessage, buildSmsLink } from "../lib/smsLink";

test("builds an iOS SMS deep link with an ampersand separator", () => {
  const link = buildSmsLink(
    ["+919876543210", "+919812345678"],
    "EMERGENCY - Test alert",
    "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)"
  );

  assert.equal(
    link,
    "sms:+919876543210,+919812345678&body=EMERGENCY%20-%20Test%20alert"
  );
});

test("builds an Android SMS deep link with a question separator", () => {
  const link = buildSmsLink(
    ["+919876543210", "+919812345678"],
    "EMERGENCY - Test alert",
    "Mozilla/5.0 (Linux; Android 14)"
  );

  assert.equal(
    link,
    "sms:+919876543210,+919812345678?body=EMERGENCY%20-%20Test%20alert"
  );
});

test("builds one emergency alert with a proper map address", () => {
  const message = buildEmergencyMessage({
    name: "Aarav",
    latitude: 19.076,
    longitude: 72.8777,
    accuracy: 35,
    createdAt: new Date("2026-09-15T10:15:00+05:30"),
  });

  assert.match(message, /EMERGENCY - Aarav needs help\./);
  assert.match(message, /https:\/\/maps\.google\.com\/\?q=19\.076,72\.8777 \(±35m\)/);
  assert.match(message, /Call 112\./);
});
