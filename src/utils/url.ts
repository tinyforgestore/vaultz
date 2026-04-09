export const normalizeUrl = (urlInput: string): string => {
  const trimmed = urlInput.trim();
  if (!trimmed) return trimmed;

  if (/^[a-z][a-z\d+\-.]*:\/\//i.test(trimmed)) return trimmed;

  try {
    new URL(`https://${trimmed}`);
    return `https://${trimmed}`;
  } catch {
    return trimmed;
  }
};
