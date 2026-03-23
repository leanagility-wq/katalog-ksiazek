export function toSqlValue(value: string | number | null | undefined) {
  if (value == null) {
    return "NULL";
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? String(value) : "NULL";
  }

  return `'${value.replace(/'/g, "''")}'`;
}
