/**
 * "Grade 3 · Morah Cohen", dropping whichever part the office left blank.
 * The separator matches the screen that calls it, so a filled-in class reads
 * the same as it did before optional grade and teacher existed.
 */
export function classroomLine(
  grade?: string | null,
  teacher?: string | null,
  separator = " · "
): string {
  const gradeBit = grade?.trim() ? `Grade ${grade.trim()}` : "";
  const teacherBit = teacher?.trim() ?? "";
  return [gradeBit, teacherBit].filter(Boolean).join(separator);
}
