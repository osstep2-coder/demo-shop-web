import type { PaymentToken } from "../api/types";

/**
 * The API takes a payment token instead of card data. Like a real gateway in test mode,
 * the outcome depends on the card number (documented in TEST_DATA.md, not shown in the UI):
 *   4000 0000 0000 0002 → declined, 4000 0000 0000 9995 → insufficient funds, any other valid card → success.
 */
const OUTCOMES: Record<string, PaymentToken> = {
  "4000000000000002": "tok_declined",
  "4000000000009995": "tok_insufficient_funds",
};

export function tokenForCard(number: string): PaymentToken {
  return OUTCOMES[digits(number)] ?? "tok_success";
}

export const digits = (value: string) => value.replace(/\D/g, "");

export type CardBrand = "visa" | "mastercard" | "mir" | null;

export function cardBrand(number: string): CardBrand {
  const d = digits(number);
  if (/^220[0-4]/.test(d)) return "mir";
  if (d.startsWith("4")) return "visa";
  if (/^(5[1-5]|2[2-7])/.test(d)) return "mastercard";
  return null;
}

export function formatCardNumber(value: string) {
  return digits(value)
    .slice(0, 19)
    .replace(/(\d{4})(?=\d)/g, "$1 ");
}

export function formatExpiry(value: string) {
  const d = digits(value).slice(0, 4);
  return d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
}

export function luhnValid(number: string) {
  const d = digits(number);
  if (d.length < 13 || d.length > 19) return false;
  let sum = 0;
  for (let i = 0; i < d.length; i++) {
    let n = Number(d[d.length - 1 - i]);
    if (i % 2 === 1) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
  }
  return sum % 10 === 0;
}

export function expiryValid(value: string, now = new Date()) {
  const m = /^(\d{2})\/(\d{2})$/.exec(value);
  if (!m) return false;
  const month = Number(m[1]);
  const year = 2000 + Number(m[2]);
  if (month < 1 || month > 12) return false;
  return year > now.getFullYear() || (year === now.getFullYear() && month >= now.getMonth() + 1);
}

export interface CardForm {
  number: string;
  expiry: string;
  cvc: string;
  holder: string;
}

export function validateCard(form: CardForm): Partial<Record<keyof CardForm, string>> {
  const errors: Partial<Record<keyof CardForm, string>> = {};
  if (!luhnValid(form.number)) errors.number = "Проверьте номер карты";
  if (!expiryValid(form.expiry)) errors.expiry = form.expiry.length < 5 ? "Укажите срок" : "Карта просрочена или срок указан неверно";
  if (!/^\d{3}$/.test(form.cvc)) errors.cvc = "Введите 3 цифры";
  if (!/^[A-Za-z][A-Za-z .'-]+$/.test(form.holder.trim())) errors.holder = "Латиницей, как на карте";
  return errors;
}
