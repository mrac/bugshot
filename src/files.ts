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

export function readFile(absolutePath: string): string {
  const buffer = fs.readFileSync(absolutePath);
  return buffer.toString();
}

export async function deleteTemporaryFiles(config: Config): Promise<void> {
  const globPr = util.promisify(glob);
  const baseDir = config.baseDir.replace(/\/?$/, '/');
  const sourceFiles = normalize(config.dirs.configDir, baseDir, config.sourceFiles);

  const sourceFilesGlob = sourceFiles;
  const testFilesGlob = config.sourceFileToTestFileFn(sourceFilesGlob, config);

  const faultSourceFilesGlob = config.sourceFileToFaultSourceFileFn(sourceFilesGlob, config);
  const faultTestFilesGlob = config.testFileToFaultTestFileFn(testFilesGlob, config);

  const faultSourceFilePaths = await globPr(faultSourceFilesGlob);
  const faultTestFilePaths = await globPr(faultTestFilesGlob);

  [...faultSourceFilePaths, ...faultTestFilePaths].forEach(path => {
    fs.unlinkSync(path);
  });
}

function normalize(configDir: string, baseDir: string, filepath: string): string {
  return path.normalize(configDir + baseDir + filepath);
}
