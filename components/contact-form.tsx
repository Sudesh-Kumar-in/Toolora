"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";
import { SITE } from "@/lib/site";
import { validateContact, type ContactErrors } from "@/lib/contact";

const TOPICS = [
  "General question",
  "Bug report",
  "Tool request",
  "Privacy or data",
  "Partnership",
] as const;

/**
 * There is no server-side mailbox yet, so the form opens the visitor's own mail app
 * with the message filled in. Nothing is stored or sent by Toolora itself.
 */
export function ContactForm() {
  const [values, setValues] = useState({ name: "", email: "", topic: TOPICS[0], message: "" });
  const [errors, setErrors] = useState<ContactErrors>({});
  const [notice, setNotice] = useState<string | null>(null);

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const found = validateContact(values);
    setErrors(found);
    setNotice(null);
    if (Object.keys(found).length > 0) return;

    if (!SITE.contactEmail) {
      setNotice("Email is not set up for this site yet. Please try again later.");
      return;
    }

    const subject = `[${values.topic}] Message from ${values.name.trim()}`;
    const body = `${values.message.trim()}\n\n— ${values.name.trim()} (${values.email.trim()})`;
    window.location.href = `mailto:${SITE.contactEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    setNotice("Your mail app should open with the message ready to send.");
  }

  const field = (id: keyof typeof values) => ({
    id,
    name: id,
    value: values[id],
    onChange: (
      e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
    ) => setValues((v) => ({ ...v, [id]: e.target.value })),
  });

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5 rounded-2xl border border-ink/10 bg-paper-raised p-6 shadow-card sm:p-8">
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="name" className="text-sm font-medium text-ink">Name</label>
          <input {...field("name")} autoComplete="name" className="field mt-2" aria-invalid={!!errors.name} aria-describedby={errors.name ? "name-err" : undefined} />
          {errors.name && <p id="name-err" className="mt-1.5 text-sm text-red-700">{errors.name}</p>}
        </div>
        <div>
          <label htmlFor="email" className="text-sm font-medium text-ink">Email</label>
          <input {...field("email")} type="email" autoComplete="email" className="field mt-2" aria-invalid={!!errors.email} aria-describedby={errors.email ? "email-err" : undefined} />
          {errors.email && <p id="email-err" className="mt-1.5 text-sm text-red-700">{errors.email}</p>}
        </div>
      </div>

      <div>
        <label htmlFor="topic" className="text-sm font-medium text-ink">Topic</label>
        <select {...field("topic")} className="field mt-2">
          {TOPICS.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="message" className="text-sm font-medium text-ink">Message</label>
        <textarea {...field("message")} rows={6} className="field mt-2 resize-y" aria-invalid={!!errors.message} aria-describedby={errors.message ? "message-err" : undefined} />
        {errors.message && <p id="message-err" className="mt-1.5 text-sm text-red-700">{errors.message}</p>}
      </div>

      <button type="submit" className="btn-primary w-full sm:w-auto">Open in my email app</button>

      {notice && <p role="status" className="text-sm text-ink-soft">{notice}</p>}
    </form>
  );
}
