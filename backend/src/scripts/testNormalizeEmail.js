import assert from "node:assert/strict";
import { normalizeEmail } from "../normalizeEmail.js";

// trim + lowercase
assert.equal(normalizeEmail("  Jane@Example.com  "), "jane@example.com");

// gmail: dots and +suffix are the same inbox
assert.equal(
  normalizeEmail("j.a.n.e+jobs@gmail.com"),
  "jane@gmail.com",
);
assert.equal(normalizeEmail("jane.doe@gmail.com"), "janedoe@gmail.com");
assert.equal(normalizeEmail("j.doe@gmail.com"), "jdoe@gmail.com");
assert.equal(
  normalizeEmail("Jane.Doe+jobs@gmail.com"),
  normalizeEmail("janedoe@gmail.com"),
);

// googlemail is gmail
assert.equal(
  normalizeEmail("jane.doe@googlemail.com"),
  "janedoe@gmail.com",
);

// other providers: keep dots and +
assert.equal(
  normalizeEmail("jane.doe+jobs@outlook.com"),
  "jane.doe+jobs@outlook.com",
);

console.log("normalizeEmail checks passed");
