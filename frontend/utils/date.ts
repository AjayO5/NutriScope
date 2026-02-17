export function getLocalDateString(date?: Date) {
    const d = date || new Date();
    return d.toLocaleDateString("en-CA"); // YYYY-MM-DD
}

export function getLastNDays(n: number) {
    const days = [];
    const today = new Date();
    for (let i = 0; i < n; i++) {
        const d = new Date();
        d.setDate(today.getDate() - i);
        days.push(getLocalDateString(d));
    }
    return days.reverse();
}
