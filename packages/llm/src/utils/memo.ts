import fs from 'fs';
fs.mkdirSync('.cache', { recursive: true });

export function memoize<Input, Result>(fn: (...input: Input[]) => Result) {
  const memoMap = {
    get: (key: string) =>
      JSON.parse(fs.readFileSync(`.cache/${key}`, { encoding: 'utf-8' })),
    has: (key: string) => fs.existsSync(`.cache/${key}`),
    set: (key: string, result: Result) => {
      fs.writeFileSync(`.cache/${key}`, JSON.stringify(result));
    },
  };
  return async function (...input: Input[]): Promise<Result> {
    const key = encodeURIComponent(JSON.stringify(input));

    if (memoMap.has(key)) return memoMap.get(key)!;

    const result = await fn(...input);
    memoMap.set(key, result);
    return result;
  };
}
