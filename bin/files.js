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
    const buffer = fs.readFileSync(absolutePath);
    return buffer.toString();
}
exports.readFile = readFile;
function normalize(configDir, baseDir, filepath) {
    return path.normalize(configDir + baseDir + filepath);
}
