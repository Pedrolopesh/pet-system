import type { DueVaccine } from "@petsystem/contracts";
import { describe, expect, it } from "vitest";
import { age, kg, parseDecimal, reminderLink } from "@/lib/clinic";

describe("clínica", () => {
  it("calcula a idade em anos e meses", () => {
    const now = new Date("2026-11-16T12:00:00");
    expect(age("2023-09-10", now)).toBe("3 anos e 2 meses");
    expect(age("2026-06-20", now)).toBe("4 meses");
    expect(age("2025-11-16", now)).toBe("1 ano");
    expect(age("2026-11-01", now)).toBe("menos de 1 mês");
    expect(age(null, now)).toBe("idade não informada");
  });

  it("formata o peso", () => {
    expect(kg(31.25)).toBe("31,3 kg");
    expect(kg(8)).toBe("8 kg");
    expect(kg(0.45)).toBe("450 g");
  });

  it("lê números com vírgula ou ponto", () => {
    expect(parseDecimal("38,6")).toBe(38.6);
    expect(parseDecimal("12.5")).toBe(12.5);
    expect(parseDecimal("")).toBeNull();
    expect(parseDecimal("abc")).toBeNaN();
  });

  it("monta o lembrete do WhatsApp só com telefone válido", () => {
    const due: DueVaccine = {
      id: "1",
      vaccine: "Antirrábica",
      nextDoseAt: "2026-11-01",
      overdue: true,
      pet: { id: "p", name: "Thor", species: "cao" },
      client: { id: "c", name: "Ana Beatriz", phone: "48999990000" },
    };
    const link = reminderLink(due, "Patas & Cia")!;
    expect(link.startsWith("https://wa.me/5548999990000?text=")).toBe(true);
    const text = decodeURIComponent(link.split("text=")[1]!);
    expect(text).toContain("Olá, Ana!");
    expect(text).toContain("Antirrábica do Thor venceu em 01/11/2026");
    expect(reminderLink({ ...due, client: { ...due.client, phone: "" } }, "X")).toBeNull();
  });
});
