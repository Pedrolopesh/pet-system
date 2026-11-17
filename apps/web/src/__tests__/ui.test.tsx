import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BarChart } from "@/components/BarChart";
import { Avatar } from "@/components/ui";

describe("BarChart", () => {
  const points = [
    { day: "2026-11-08", revenue: 10000, sales: 2 },
    { day: "2026-11-10", revenue: 25000, sales: 5 },
  ];
  it("mostra o último dia e troca ao passar o mouse", () => {
    const { container } = render(<BarChart points={points} />);
    expect(container.querySelector(".tip")!.textContent).toContain("R$ 250,00");
    fireEvent.mouseEnter(screen.getByLabelText(/R\$ 100,00/));
    expect(container.querySelector(".tip")!.textContent).toContain("2 vendas");
  });
});

describe("Avatar", () => {
  it("mostra as iniciais", () => {
    const { container } = render(<Avatar name="Ana Beatriz" />);
    expect(container.textContent).toBe("AB");
  });
});
