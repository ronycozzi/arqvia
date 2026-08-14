export function normalizeLeadEmail(email: string) {
  return email.trim().toLowerCase();
}

export function normalizeLeadPhone(phone: string) {
  return phone.replace(/\D/g, "");
}

export function hasUsableLeadPhone(phone: string) {
  return normalizeLeadPhone(phone).length >= 7;
}
