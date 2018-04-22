"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const params_1 = require("./params");
function getArguments(argv) {
    const args = params_1.parseParams(argv);
    if (!args.config) {
        throw new Error('Bugshot: --config parameter is required.');
    }
    if ('keep' in args) {
        args.keep = true;
    }
    if ('occurances' in args) {
        args.occurances = true;
    }
    return args;
}
exports.getArguments = getArguments;
