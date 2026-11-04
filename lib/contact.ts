/** Pure validation for the contact form. No imports, so it can be unit tested. */

export interface ContactValues {
  name: string;
  email: string;
  message: string;
}

export type ContactErrors = Partial<Record<keyof ContactValues, string>>;

/** Deliberately permissive. The mail client does the real delivery check. */
export function looksLikeEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim());
}

export function validateContact(values: ContactValues): ContactErrors {
  const errors: ContactErrors = {};
  if (!values.name.trim()) errors.name = "Enter your name.";
  if (!values.email.trim()) errors.email = "Enter an email address so we can reply.";
  else if (!looksLikeEmail(values.email)) errors.email = "Enter a valid email, such as name@example.com.";
  if (values.message.trim().length < 10) errors.message = "Write at least 10 characters so we know what you need.";
  else if (values.message.length > 3000) errors.message = "Keep your message under 3000 characters.";
  return errors;
}
