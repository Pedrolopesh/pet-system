import { beforeEach, describe, expect, it } from "vitest";
import { tutorToken } from "@/lib/tutor";

describe("token do tutor", () => {
  beforeEach(() => localStorage.clear());
  it("fica separado por loja", () => {
    tutorToken.set("loja-a", "token-a");
    tutorToken.set("loja-b", "token-b");
    expect(tutorToken.get("loja-a")).toBe("token-a");
    tutorToken.clear("loja-a");
    expect(tutorToken.get("loja-a")).toBeNull();
    expect(tutorToken.get("loja-b")).toBe("token-b");
  });
});
