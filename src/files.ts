import * as path from 'path';
import { Config } from './config';
import * as glob from 'glob';
import * as util from 'util';
import * as fs from 'fs';

export async function getAbsoluteSourcePaths(config: Config): Promise<string[]> {
  const globPr = util.promisify(glob);
  const baseDir = config.baseDir.replace(/\/?$/, '/');
  const sourceFiles = normalize(config.dirs.configDir, baseDir, config.sourceFiles);

  const ignoreFilePaths = config.ignore.map(ignorePath => {
    return normalize(config.dirs.configDir, baseDir, ignorePath);
  });

  return await globPr(sourceFiles, {
    ignore: ignoreFilePaths
  });
}

export function readFile(absolutePath: string) {
  const buffer = fs.readFileSync(absolutePath);
  return buffer.toString();
}

function normalize(configDir, baseDir, filepath) {
  return path.normalize(configDir + baseDir + filepath);
}
