// French number formatting separates thousands with a narrow no-break space
// and puts a no-break space before the currency sign. `\s` matches both.
export const normalizeSpaces = (text: string) => text.replace(/\s/g, ' ')
