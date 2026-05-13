const eurFormatter = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
});

const eurFormatterShort = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

export function eur(n: number, short = false) {
  return short ? eurFormatterShort.format(n) : eurFormatter.format(n);
}

const dateFormatter = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "short",
});

const dateFormatterLong = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "long",
  year: "numeric",
});

const timeFormatter = new Intl.DateTimeFormat("fr-FR", {
  hour: "2-digit",
  minute: "2-digit",
});

export function shortDate(d: Date | string) {
  return dateFormatter.format(new Date(d));
}

export function longDate(d: Date | string) {
  return dateFormatterLong.format(new Date(d));
}

export function time(d: Date | string) {
  return timeFormatter.format(new Date(d));
}

export function relativeDate(d: Date | string) {
  const date = new Date(d);
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
  const rtf = new Intl.RelativeTimeFormat("fr-FR", { numeric: "auto" });
  if (Math.abs(diffDays) < 1) {
    const diffHours = Math.round(diffMs / (1000 * 60 * 60));
    return rtf.format(diffHours, "hour");
  }
  return rtf.format(diffDays, "day");
}

export function dimensions(w: number, h: number) {
  return `${w} × ${h} cm`;
}
