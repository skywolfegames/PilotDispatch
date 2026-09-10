import test from "node:test";
import assert from "node:assert/strict";

import { buildSimbriefCustomUrl, sanitizeAltitude } from "./ofp.ts";

test("SimBrief custom URL includes altitude when provided", () => {
  const url = buildSimbriefCustomUrl({
    orig: "SBGL",
    dest: "SBSP",
    type: "A320",
    altitude: "FL360",
    airline: "TAM",
    fltnum: "3740",
  });

  assert.match(url, /[?&]fl=36000/);
  assert.match(url, /[?&]airline=TAM/);
  assert.match(url, /[?&]fltnum=3740/);
});

test("sanitizeAltitude keeps FL format and strips invalid characters", () => {
  assert.equal(sanitizeAltitude("fl360"), "FL360");
  assert.equal(sanitizeAltitude("360"), "FL360");
  assert.equal(sanitizeAltitude("abc"), "");
});
