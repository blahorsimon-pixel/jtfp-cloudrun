export function genOrderNo(prefix: string = 'O'): string {
  const ts = Date.now();
  const rand = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
  return `${prefix}${ts}${rand}`;
}

export function genOutTradeNo(prefix: string = 'P'): string {
  const ts = Date.now();
  const rand = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
  return `${prefix}${ts}${rand}`;
}

