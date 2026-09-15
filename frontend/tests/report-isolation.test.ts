import assert from "node:assert/strict";
import test from "node:test";
import { adminReportsStatusForRole } from "../lib/reportAuthorization";
import { addReport, getReportsForReporter } from "../lib/reportStore";

test("citizens only receive reports owned by their reporterId", () => {
  const firstCitizenReport = addReport({
    reporterId: "citizen-one",
    type: "Medical Emergency",
    description: "First citizen report",
    location: "Location One",
    status: "Active",
  });
  const secondCitizenReport = addReport({
    reporterId: "citizen-two",
    type: "Fire Emergency",
    description: "Second citizen report",
    location: "Location Two",
    status: "Active",
  });

  assert.deepEqual(getReportsForReporter("citizen-one"), [firstCitizenReport]);
  assert.deepEqual(getReportsForReporter("citizen-two"), [secondCitizenReport]);
  assert.equal(
    getReportsForReporter("citizen-one").some((report) => report.reporterId === "citizen-two"),
    false
  );
});

test("non-admin access to admin reports is rejected with 403", () => {
  assert.equal(adminReportsStatusForRole("user"), 403);
  assert.equal(adminReportsStatusForRole("admin"), 200);
});