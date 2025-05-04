export function delay(val = 500) {
  return new Promise(resolve => setTimeout(resolve, val));
}
