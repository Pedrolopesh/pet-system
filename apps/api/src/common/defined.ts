type Defined<T> = { [K in keyof T]: Exclude<T[K], undefined> };

/** Remove as chaves `undefined` (atualização parcial: campo ausente não muda no banco). */
export function defined<T extends object>(input: T): Partial<Defined<T>> {
  return Object.fromEntries(Object.entries(input).filter(([, v]) => v !== undefined)) as Partial<
    Defined<T>
  >;
}
