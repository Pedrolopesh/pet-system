import { describe, expect, it } from "vitest";
import { toCsv } from "@/lib/csv";
import { dayLabel, initials, phone, when } from "@/lib/format";

describe("csv", () => {
  it("escapa aspas e separadores", () => {
    expect(toCsv([["a;b", 'diz "oi"', 3]])).toBe('"a;b";"diz ""oi""";3');
  });
  it("neutraliza fórmulas de planilha", () => {
    expect(toCsv([["=HYPERLINK(1)", "+1", "-2", "@x", "normal"]])).toBe("'=HYPERLINK(1);'+1;'-2;'@x;normal");
    // números negativos de verdade continuam números
    expect(toCsv([[-5]])).toBe("-5");
  });
});

describe("format", () => {
  it("telefone com DDD", () => {
    expect(phone("48999990000")).toBe("(48) 99999-0000");
    expect(phone("4833334444")).toBe("(48) 3333-4444");
  });
  it("iniciais", () => {
    expect(initials("ana beatriz souza")).toBe("AB");
  });
  it("datas relativas", () => {
    const now = new Date("2026-11-10T15:00:00");
    expect(when("2026-11-10T09:05:00", now)).toBe("hoje, 09:05");
    expect(when("2026-11-09T18:30:00", now)).toBe("ontem, 18:30");
    expect(dayLabel("2026-11-10")).toMatch(/^ter 10$/);
  });
});
