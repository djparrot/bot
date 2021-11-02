export default function scrap<T, A extends any[] = []>(
    item: Scrap<T, A>,
    ...args: A
): T {
    return typeof item === 'function'
        ? (item as Function<T, A>)(...args)
        : item;
}

export type Function<T, A extends any[] = []> = (...args: A) => T;
export type AsyncFunction<T, A extends any[] = []> = (...args: A) => Promise<T>;

export type Scrap<T, A extends any[] = []> =
    | T
    | Function<T, A>
    | AsyncFunction<T, A>;
