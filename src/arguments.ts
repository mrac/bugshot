import { parseParams } from './params';

export type Args = {
  config: string;
  t?: string;
  p?: string;
  o?: number;
  keep?: boolean;
  occurances?: boolean;
};

export function getArguments(argv: string[]): Args {
  const args = parseParams<Args>(argv);

  if (!args.config) {
    throw new Error('--config parameter is required');
  }

  if ('keep' in args) {
    args.keep = true;
  }

  if ('occurances' in args) {
    args.occurances = true;
  }

  return args;
}
