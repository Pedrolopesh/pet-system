import { ApiError } from "@/api/http";

const BY_CODE: Record<string, string> = {
  INVALID_CREDENTIALS: "E-mail ou senha incorretos.",
  EMAIL_TAKEN: "Este e-mail já tem uma conta. Tente entrar.",
  RATE_LIMITED: "Muitas tentativas. Espere um minuto e tente de novo.",
  UNAUTHORIZED: "Sua sessão expirou. Entre de novo.",
  NOT_FOUND: "Não encontramos esse registro. Ele pode ter sido removido.",
  PRODUCT_UNAVAILABLE: "Um produto do carrinho não está mais disponível.",
  INVALID_DISCOUNT: "O desconto não pode ser maior que o subtotal.",
};

/** Mensagem para a pessoa a partir de qualquer erro (código da API primeiro, texto genérico por último). */
export function friendly(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.code === "OUT_OF_STOCK") return error.message.endsWith(".") ? error.message : `${error.message}.`;
    if (error.code === "VALIDATION_ERROR") {
      const issues = (error.details?.issues ?? []) as { path: string; message: string }[];
      return issues.length
        ? `Confira os campos: ${issues.map((i) => i.path || i.message).join(", ")}.`
        : "Confira os campos.";
    }
    return BY_CODE[error.code] ?? error.message;
  }
  return "Algo deu errado. Tente de novo.";
}
