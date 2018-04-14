import * as path from 'path';
import { Config } from './config';
import * as glob from 'glob';
import * as util from 'util';

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

function normalize(configDir, baseDir, filepath) {
  return path.normalize(configDir + baseDir + filepath);
}
