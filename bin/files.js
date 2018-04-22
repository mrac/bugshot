"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const path = require("path");
const glob = require("glob");
const util = require("util");
const fs = require("fs");
async function getAbsoluteSourcePaths(config) {
    const globPr = util.promisify(glob);
    const baseDir = config.baseDir;
    const sourceFiles = normalize(config.dirs.configDir, baseDir, config.sourceFiles);
    const defaultIgnore = [
        config.sourceFileToFaultSourceFileFn(config.sourceFiles, config),
        config.sourceFileToFaultTestFileFn(config.sourceFiles, config),
        config.sourceFileToTestFileFn(config.sourceFiles, config)
    ];
    const ignoreFilePaths = [...defaultIgnore, ...(config.ignore || [])].map(ignorePath => {
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
function writeFile(absolutePath, text) {
    fs.writeFileSync(absolutePath, text);
}
exports.writeFile = writeFile;
async function deleteTemporaryFiles(config) {
    const globPr = util.promisify(glob);
    const baseDir = config.baseDir;
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
