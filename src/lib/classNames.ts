export const classNames = (...args: Array<string | null | undefined | false>) => args.filter(Boolean).join(' ');
