import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import BarChart from "@/components/BarChart.vue";

describe("BarChart", () => {
  const points = [
    { day: "2026-11-08", revenue: 10000, sales: 2 },
    { day: "2026-11-09", revenue: 0, sales: 0 },
    { day: "2026-11-10", revenue: 25000, sales: 5 },
  ];
  it("mostra o último dia por padrão e troca ao passar o mouse", async () => {
    const w = mount(BarChart, { props: { points } });
    expect(w.find(".tip").text()).toContain("R$ 250,00");
    await w.findAll(".bar")[0]!.trigger("mouseenter");
    expect(w.find(".tip").text()).toContain("R$ 100,00");
    expect(w.find(".tip").text()).toContain("2 vendas");
  });
  it("cada barra tem rótulo acessível", () => {
    const w = mount(BarChart, { props: { points } });
    expect(w.findAll(".bar")[2]!.attributes("aria-label")).toContain("R$ 250,00");
  });
});
