const NIGERIAN_PHONE_REGEX = /^(?:\+234|234|0)[789][01]\d{8}$/;

/**
 * Strips spaces/hyphens/parentheses and validates a Nigerian mobile number.
 * Returns normalized +234XXXXXXXXXX format, or null when invalid.
 */
export function normalizeNigerianPhone(raw: string): string | null {
  const cleaned = raw.replace(/[\s\-()]/g, "").trim();
  if (!NIGERIAN_PHONE_REGEX.test(cleaned)) {
    return null;
  }
  if (cleaned.startsWith("+234")) {
    return cleaned;
  }
  if (cleaned.startsWith("234")) {
    return `+${cleaned}`;
  }
  if (cleaned.startsWith("0")) {
    return `+234${cleaned.slice(1)}`;
  }
  return null;
}

export function isValidNigerianPhone(raw: string): boolean {
  return normalizeNigerianPhone(raw) !== null;
}

const nairaFormatter = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  maximumFractionDigits: 0,
});

export function formatNaira(amount: number): string {
  const whole = Math.round(Number.isFinite(amount) ? amount : 0);
  return nairaFormatter.format(whole);
}

export function calculateMoveInTotal(params: {
  rentAmount: number;
  agencyFee?: number | null;
  legalFee?: number | null;
  cautionFee?: number | null;
}): number {
  const rent = Math.max(0, Math.round(params.rentAmount || 0));
  const agency = Math.max(0, Math.round(params.agencyFee ?? 0));
  const legal = Math.max(0, Math.round(params.legalFee ?? 0));
  const caution = Math.max(0, Math.round(params.cautionFee ?? 0));
  return rent + agency + legal + caution;
}

export function formatDateNG(input: string | Date): string {
  const date = typeof input === "string" ? new Date(input) : input;
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return new Intl.DateTimeFormat("en-NG", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "Africa/Lagos",
  }).format(date);
}

export function buildWhatsAppUrl(phone: string, listingTitle: string): string {
  const normalized = normalizeNigerianPhone(phone) ?? phone;
  const digits = normalized.replace(/\D/g, "");
  const message = `Hello, I saw your listing ${listingTitle} on Keyhaus and I am interested.`;
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

export function buildTelUrl(phone: string): string {
  const normalized = normalizeNigerianPhone(phone) ?? phone.replace(/\s+/g, "");
  return `tel:${normalized}`;
}
