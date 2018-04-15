"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const path = require("path");
const glob = require("glob");
const util = require("util");
const fs = require("fs");
async function getAbsoluteSourcePaths(config) {
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
exports.getAbsoluteSourcePaths = getAbsoluteSourcePaths;
function readFile(absolutePath) {
    let buffer;
    let text;
    try {
        buffer = fs.readFileSync(absolutePath);
        text = buffer.toString();
    }
    catch (err) {
        text = null;
    }
    return text;
}
exports.readFile = readFile;
async function deleteTemporaryFiles(config) {
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
exports.deleteTemporaryFiles = deleteTemporaryFiles;
function normalize(configDir, baseDir, filepath) {
    return path.normalize(configDir + baseDir + filepath);
}
