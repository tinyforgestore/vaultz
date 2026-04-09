export const normalizeUrl = (urlInput: string): string => {
  const trimmed = urlInput.trim();
  if (!trimmed) return trimmed;

  // Preserve any existing scheme (http, https, ftp, mailto, etc.)
  if (/^[a-z][a-z\d+\-.]*:\/\//i.test(trimmed)) return trimmed;

  try {
    new URL(`https://${trimmed}`);
    return `https://${trimmed}`;
  } catch {
    return trimmed;
  }
};
