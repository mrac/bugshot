"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs = require("fs");
const path = require("path");
function getConfig(args, currentDir) {
    currentDir = currentDir.replace(/\/?$/, '/');
    const configPath = currentDir + args.config;
    const configDir = path.normalize(path.dirname(configPath) + '/');
    const json = fs.readFileSync(configPath, 'utf8');
    let config;
    try {
        config = JSON.parse(json);
    }
    catch (err) {
        throw new Error(`Config ${configPath} json file cannot be parsed.\n${err.message}`);
    }
    config.dirs = { currentDir, configDir };
    config.faultFileExt = 'bugshot-fault';
    config.testFileExt = 'test';
    config.sourceFileToTestFileFn = (sourcePath, config) => sourcePath.replace(/\.([a-zA-Z_-]+)$/, `.${config.testFileExt}.$1`);
    config.sourceFileToFaultSourceFileFn = (sourcePath, config) => sourcePath.replace(/\.([a-zA-Z_-]+)$/, `.${config.faultFileExt}.$1`);
    config.testFileToFaultTestFileFn = (testPath, config) => {
        const regex = new RegExp(`\.(${config.testFileExt})\.([a-zA-Z_-]+)$`);
        return testPath.replace(regex, `.${config.faultFileExt}.$1.$2`);
    };
    return config;
}
exports.getConfig = getConfig;
