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
    return config;
}
exports.getConfig = getConfig;
