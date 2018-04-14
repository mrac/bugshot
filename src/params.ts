export function parseParams<T>(argv: string[]): T {
  const args: T = {} as T;
  argv.forEach(arg => {
    const match = arg.match(/--?([^=]+)=(.*)/);
    if (match) {
      const key = match[1];
      const value = match[2];
      args[key] = value;
    }
  });
  return args;
}
