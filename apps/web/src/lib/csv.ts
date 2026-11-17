/**
 * Gera CSV seguro para planilhas: aspas escapadas e proteção contra injeção de fórmula
 * (célula que começa com = + - @ vira texto).
 */
export function toCsv(rows: (string | number)[][]): string {
  return rows
    .map((row) =>
      row
        .map((cell) => {
          let s = String(cell);
          if (typeof cell === "string" && /^[=+\-@\t\r]/.test(s)) s = `'${s}`;
          return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
        })
        .join(";"),
    )
    .join("\r\n");
}

export function download(filename: string, content: string) {
  // BOM para o Excel abrir acentos certo.
  const blob = new Blob([`\ufeff${content}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
