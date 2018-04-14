import * as fs from 'fs';
import * as path from 'path';

import { Args } from './arguments';

type Config = {
  baseDir: string;
  jestConfig: string;
  sourceFiles: string;
  ignore: string[];
  dirs: {
    currentDir: string;
    configDir: string;
  };
};

export function getConfig(args: Args, currentDir: string): Config {
  currentDir = currentDir.replace(/\/?$/, '/');
  const configPath = currentDir + args.config;
  const configDir = path.normalize(path.dirname(configPath) + '/');
  const json = fs.readFileSync(configPath, 'utf8');

  let config;

  try {
    config = JSON.parse(json);
  } catch (err) {
    throw new Error(`Config ${configPath} json file cannot be parsed.\n${err.message}`);
  }

  config.dirs = { currentDir, configDir };

  return config;
}
