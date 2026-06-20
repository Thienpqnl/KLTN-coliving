export function formatRoomArea(
  areaValue?: number | string | null,
  areaText?: string | null,
) {
  const numericValue = areaValue == null ? "" : String(areaValue).trim();
  if (numericValue && Number(numericValue) > 0) {
    return `${numericValue} m²`;
  }

  const textValue = areaText?.trim();
  if (!textValue) return null;
  return /m(?:2|²)/i.test(textValue) ? textValue.replace(/m2/i, "m²") : `${textValue} m²`;
}
