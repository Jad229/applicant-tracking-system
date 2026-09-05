/**
 * Cleans an email for matching.
 * Always trims and lowercases.
 * Gmail ignores dots and anything after + in the local part.
 *
 * @param {string} email
 * @returns {string}
 */
export function normalizeEmail(email) {
  if (typeof email !== "string") {
    return "";
  }

  const trimmed = email.trim().toLowerCase();
  const atIndex = trimmed.lastIndexOf("@");

  // Not a real email — still return the cleaned string
  if (atIndex === -1) {
    return trimmed;
  }

  let local = trimmed.slice(0, atIndex);
  let domain = trimmed.slice(atIndex + 1);

  // googlemail.com is the same inbox as gmail.com
  if (domain === "googlemail.com") {
    domain = "gmail.com";
  }

  if (domain === "gmail.com") {
    const plusIndex = local.indexOf("+");
    if (plusIndex !== -1) {
      local = local.slice(0, plusIndex);
    }
    local = local.replaceAll(".", "");
  }

  return local + "@" + domain;
}
