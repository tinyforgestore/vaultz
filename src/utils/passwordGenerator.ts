const UPPERCASE_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const LOWERCASE_CHARS = 'abcdefghijklmnopqrstuvwxyz';
const NUMBER_CHARS = '0123456789';
const SYMBOL_CHARS = '!@#$%^&*()_+-=[]{}|;:,.<>?';

export function buildPassword(
  len: number,
  upper: boolean,
  lower: boolean,
  numbers: boolean,
  symbols: boolean,
): string {
  let charset = '';
  let result = '';

  if (upper) charset += UPPERCASE_CHARS;
  if (lower) charset += LOWERCASE_CHARS;
  if (numbers) charset += NUMBER_CHARS;
  if (symbols) charset += SYMBOL_CHARS;

  if (charset.length === 0) charset = LOWERCASE_CHARS;

  const requiredChars: string[] = [];
  if (upper) requiredChars.push(UPPERCASE_CHARS[Math.floor(Math.random() * UPPERCASE_CHARS.length)]);
  if (lower) requiredChars.push(LOWERCASE_CHARS[Math.floor(Math.random() * LOWERCASE_CHARS.length)]);
  if (numbers) requiredChars.push(NUMBER_CHARS[Math.floor(Math.random() * NUMBER_CHARS.length)]);
  if (symbols) requiredChars.push(SYMBOL_CHARS[Math.floor(Math.random() * SYMBOL_CHARS.length)]);

  for (let i = requiredChars.length; i < len; i++) {
    result += charset[Math.floor(Math.random() * charset.length)];
  }

  const arr = result.split('');
  requiredChars.forEach((char, index) => {
    const randomIndex = Math.floor(Math.random() * (len - index));
    arr.splice(randomIndex, 0, char);
  });

  return arr.slice(0, len).join('');
}
