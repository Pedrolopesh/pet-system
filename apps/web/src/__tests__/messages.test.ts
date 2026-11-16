import { describe, expect, it } from "vitest";
import { ApiError } from "@/lib/http";
import { friendly } from "@/lib/messages";

describe("friendly", () => {
  it("usa o código da API", () => {
    expect(friendly(new ApiError(401, "INVALID_CREDENTIALS", "x"))).toBe("E-mail ou senha incorretos.");
    expect(friendly(new ApiError(409, "OUT_OF_STOCK", "Estoque insuficiente de Ração"))).toBe(
      "Estoque insuficiente de Ração.",
    );
  });
  it("lista os campos inválidos", () => {
    const err = new ApiError(400, "VALIDATION_ERROR", "Dados inválidos", { issues: [{ path: "email", message: "x" }] });
    expect(friendly(err)).toBe("Confira os campos: email.");
  });
  it("erro desconhecido vira texto genérico", () => {
    expect(friendly(new Error("boom"))).toBe("Algo deu errado. Tente de novo.");
  });
});
