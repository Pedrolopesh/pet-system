import { describe, expect, it } from "vitest";
import { addDays, hhmm, layoutOverlaps, localIso, minutesOf, weekStart } from "@/lib/dates";

describe("datas da agenda", () => {
  it("soma dias e acha a segunda-feira da semana", () => {
    expect(addDays("2026-11-30", 1)).toBe("2026-12-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
    expect(weekStart("2026-11-15")).toBe("2026-11-09"); // domingo → segunda anterior
    expect(weekStart("2026-11-09")).toBe("2026-11-09");
  });
  it("converte HH:MM e minutos", () => {
    expect(minutesOf("09:30")).toBe(570);
    expect(hhmm(570)).toBe("09:30");
  });
  it("monta o instante com o fuso do navegador", () => {
    const iso = localIso("2026-11-11", 9 * 60 + 30);
    expect(iso.startsWith("2026-11-11T09:30:00")).toBe(true);
    expect(new Date(iso).getHours()).toBe(9);
    expect(new Date(iso).getMinutes()).toBe(30);
  });
});

describe("layoutOverlaps", () => {
  it("lado a lado só quando sobrepõe", () => {
    const out = layoutOverlaps([
      { id: "a", start: 540, end: 600 },
      { id: "b", start: 570, end: 630 },
      { id: "c", start: 600, end: 660 },
      { id: "d", start: 700, end: 760 },
    ]);
    const by = Object.fromEntries(out.map((o) => [o.id, o]));
    expect(by.a).toMatchObject({ col: 0, cols: 2 });
    expect(by.b).toMatchObject({ col: 1, cols: 2 });
    // c começa quando a acaba: reaproveita a coluna 0 no mesmo grupo
    expect(by.c).toMatchObject({ col: 0, cols: 2 });
    expect(by.d).toMatchObject({ col: 0, cols: 1 });
  });
});
