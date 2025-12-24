import { ParseResult } from "../types";

export const parseFoodLog = async (text: string, currentDateTime: string): Promise<ParseResult> => {
  try {
    const timezone =
      typeof Intl !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC" : "UTC";
    const countryIso2 =
      typeof navigator !== "undefined" && typeof navigator.language === "string"
        ? (navigator.language.split("-")[1] || navigator.language.split("-")[0] || "US").slice(0, 2).toUpperCase()
        : "US";

    const res = await fetch("/api/parseFoodLog", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text, currentDateTime, timezone, countryIso2 }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      throw new Error(errText || `API error (${res.status})`);
    }
    return (await res.json()) as ParseResult;
  } catch (e) {
    console.error("Failed to parse food log", e);
    throw new Error("Could not parse nutrition data.");
  }
};
