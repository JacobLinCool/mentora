type DateLike = number | string | Date | { toDate: () => Date };

function toDate(input: DateLike): Date {
    if (input instanceof Date) return input;
    if (typeof input === "object" && "toDate" in input) {
        return input.toDate();
    }
    return new Date(input);
}

export function formatMentoraDate(
    input: DateLike | null | undefined,
    locale?: string,
): string {
    if (!input) return "-";
    const date = toDate(input);
    return date.toLocaleDateString(locale || undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
    });
}

export function formatMentoraDateTime(
    input: DateLike | null | undefined,
    locale?: string,
): string {
    if (!input) return "-";
    const date = toDate(input);
    return (
        formatMentoraDate(date, locale) +
        " " +
        date.toLocaleTimeString(locale || undefined, {
            hour: "2-digit",
            minute: "2-digit",
        })
    );
}
