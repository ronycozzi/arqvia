export type PublicContactQualityInput = {
  address: string;
  businessHours: string;
  email: string;
  phone: string;
  whatsapp: string;
};

const blockedPhoneNumbers = new Set([
  "543510000000",
  "5493510000000",
]);

function phoneDigits(value: string) {
  return value.replace(/\D/g, "");
}

function hasPublicPhone(value: string, minimumDigits: number) {
  const digits = phoneDigits(value);

  return (
    digits.length >= minimumDigits &&
    digits.length <= 15 &&
    !blockedPhoneNumbers.has(digits) &&
    !/^0+$/.test(digits)
  );
}

function hasPublicEmail(value: string) {
  const email = value.trim().toLowerCase();

  return (
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) &&
    !email.includes("example") &&
    !email.endsWith(".local") &&
    !email.endsWith(".test") &&
    !email.endsWith(".invalid")
  );
}

export function publicContactQualityIssues(
  contact: PublicContactQualityInput,
) {
  const issues: string[] = [];

  if (!hasPublicPhone(contact.whatsapp, 10)) {
    issues.push("WhatsApp must contain a usable international number");
  }
  if (!hasPublicPhone(contact.phone, 8)) {
    issues.push("phone must contain a usable public number");
  }
  if (!hasPublicEmail(contact.email)) {
    issues.push("email must use a valid public domain");
  }
  if (contact.address.trim().length < 8) {
    issues.push("address or service-area text must contain at least 8 characters");
  }
  if (contact.businessHours.trim().length < 8) {
    issues.push("business hours must contain at least 8 characters");
  }

  return issues;
}
