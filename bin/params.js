"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function parseParams(argv) {
    const args = {};
    argv.forEach(arg => {
        const match = arg.match(/^--?([^=]+)(=(.*))?$/);
        if (match) {
            const key = match[1];
            const value = match[3];
            args[key] = value;
        }
    });
    return args;
}
exports.parseParams = parseParams;
