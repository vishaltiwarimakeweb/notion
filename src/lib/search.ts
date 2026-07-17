// Escapes regex metacharacters so user-supplied search text can't be used to build
// an unintended (or expensive/ReDoS-prone) pattern.
export function escapeRegExp(text: string) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
