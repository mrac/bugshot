import * as fs from 'fs';
import * as path from 'path';
import { Config as JestConfig } from 'jest';

import { Args } from './arguments';

export type Config = {
  baseDir: string; // relative to config file
  jestConfig: string; // relative to baseDir (path)
  sourceFiles: string; // relative to baseDir (glob path)
  ignore?: string[]; // relative to baseDir (glob paths)
  jest?: JestConfig;
  dirs?: {
    currentDir: string; // absolute
    configDir: string; // absolute
  };
  faultFileExt?: string; // [a-zA-Z0-9-_]+
  testFileExt?: string; // [a-zA-Z0-9-_]+
  sourceFileToTestFileFn?: (sourcePath: string, config: Config) => string; // absolute, relative, glob
  sourceFileToFaultSourceFileFn?: (sourcePath: string, config: Config) => string; // absolute, relative, glob
  testFileToFaultTestFileFn?: (sourcePath: string, config: Config) => string; // absolute, relative, glob
  sourceFileToFaultTestFileFn?: (sourcePath: string, config: Config) => string; // absolute, relative, glob
};

export function getConfig(args: Args, currentDir: string): Config {
  currentDir = currentDir.replace(/\/?$/, '/');
  const configPath = currentDir + args.config;
  const configDir = path.normalize(path.dirname(configPath) + '/');
  const config: Config = require(configPath);

  if (!config.baseDir) {
    throw new Error('Bugshot: config.baseDir is required.');
  }

  config.baseDir = config.baseDir.replace(/\/?$/, '/');

  if (!config.jestConfig) {
    throw new Error('Bugshot: config.jestConfig is required.');
  }

  if (!config.sourceFiles) {
    throw new Error('Bugshot: config.sourceFiles is required.');
  }

  config.dirs = { currentDir, configDir };
  config.faultFileExt = 'bugshot-fault';
  config.testFileExt = 'test';

  config.sourceFileToTestFileFn = (sourcePath: string, config: Config) =>
    sourcePath.replace(/\.([a-zA-Z0-9_-]+)$/, `.${config.testFileExt}.$1`);

  config.sourceFileToFaultSourceFileFn = (sourcePath: string, config: Config) =>
    sourcePath.replace(/\.([a-zA-Z0-9_-]+)$/, `.${config.faultFileExt}.$1`);

  config.testFileToFaultTestFileFn = (testPath: string, config: Config) => {
    const regex = new RegExp(`\.(${config.testFileExt})\.([a-zA-Z0-9_-]+)$`);
    return testPath.replace(regex, `.${config.faultFileExt}.$1.$2`);
  };

  config.sourceFileToFaultTestFileFn = (sourcePath: string, config: Config) => {
    return config.testFileToFaultTestFileFn(config.sourceFileToTestFileFn(sourcePath, config), config);
  };

  return config;
}
