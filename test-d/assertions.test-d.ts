import { expectTypeOf } from "expect-type";

declare const unchecked: any;
declare const nestedUnchecked: Promise<{ value: any }>;
declare const wider: "allow" | "deny";
declare const missing: string | undefined;
declare const mutable: { value: string };

// @ts-expect-error any не должен проходить как конкретный тип.
expectTypeOf(unchecked).toEqualTypeOf<string>();
// @ts-expect-error Вложенный any также не должен проходить точную проверку.
expectTypeOf(nestedUnchecked).toEqualTypeOf<Promise<{ value: string }>>();
// @ts-expect-error Более широкий union не равен одному литералу.
expectTypeOf(wider).toEqualTypeOf<"allow">();
// @ts-expect-error Отсутствующее значение нельзя потерять в результате.
expectTypeOf(missing).toEqualTypeOf<string>();
// @ts-expect-error readonly является частью проверяемого контракта.
expectTypeOf(mutable).toEqualTypeOf<{ readonly value: string }>();
