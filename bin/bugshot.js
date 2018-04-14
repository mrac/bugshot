#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const util = require("util");
const jest = require("jest");
const fs = require("fs");
const pathModule = require("path");
const globCb = require("glob");
const sh = require("shelljs");
const arguments_1 = require("./arguments");
const glob = util.promisify(globCb);
const currentDir = sh.pwd().stdout;
const TEMP_FILE_POSTFIX = 'bugshot-fault';
process.env.NODE_ENV = 'test';
// Makes the script crash on unhandled rejections instead of silently
// ignoring them. In the future, promise rejections that are not handled will
// terminate the Node.js process with a non-zero exit code.
process.on('unhandledRejection', err => {
    throw err;
});
const args = arguments_1.getArguments(process.argv);
const configPath = currentDir + '/' + args.config;
const config = require(`${configPath}`);
// --config
// --t
// --p
// --o
// --keep
// --occurances
main();
async function main() {
    const sourcePaths = await readSourcePaths();
    const reports = {};
    for (let i = 0; i < sourcePaths.length; i++) {
        const { componentName, componentNameL, dir } = parseComponentPath(sourcePaths[i]);
        if (!args.t || (componentNameL + '.test.tsx').match(args.t)) {
            if (!reports[dir]) {
                reports[dir] = {};
            }
            const sourceCode = readSourceFile(dir, componentNameL);
            const testSource = readTestFile(reports, dir, componentNameL);
            const props = parseProps(reports, dir, sourceCode, componentName);
            if (props && testSource) {
                await Promise.all(props.map(async (prop) => {
                    const propName = prop.propName;
                    try {
                        if (!args.p || propName.toLowerCase() === args.p.toLowerCase()) {
                            const pattern = detectPropPattern(sourceCode, prop);
                            if (args.occurances) {
                                await reportPropertySeparateOccurances(reports, dir, sourceCode, testSource, componentNameL, pattern);
                            }
                            else {
                                await reportProperty(reports, dir, sourceCode, testSource, componentNameL, pattern);
                            }
                        }
                    }
                    catch (err) {
                        reports[dir][propName] = {
                            type: 'warning',
                            problem: 'fault-injection error',
                            problemMessage: err.message
                        };
                    }
                }));
            }
        }
    }
    const testReport = await runTests();
    testReport.results.forEach(result => {
        if (!reports[result.dir]) {
            reports[result.dir] = {};
        }
        reports[result.dir][result.prop] = result;
    });
    showReport(reports);
    if (!args.keep) {
        deleteTemporaryFiles();
    }
}
// ------------------------------------------------------------
async function readSourcePaths() {
    return await glob(config.sourceFiles, {
        ignore: config.ignore
    });
}
function kebabCase2CamelCase(kebabCase) {
    const words = kebabCase.split('-');
    const capitalizedWords = words.map(word => word[0].toUpperCase() + word.substr(1).toLowerCase());
    return capitalizedWords.join('');
}
function parseComponentPath(componentPath) {
    const componentNameL = pathModule.parse(componentPath).name;
    const componentName = kebabCase2CamelCase(componentNameL);
    const dir = pathModule.dirname(componentPath) + '/';
    return { dir, componentName, componentNameL };
}
function readSourceFile(dir, componentNameL) {
    const inputPath = `${dir}${componentNameL}.tsx`;
    const buffer = fs.readFileSync(inputPath);
    const sourceCode = buffer.toString();
    return sourceCode;
}
function readTestFile(reports, dir, componentNameL) {
    let testSource;
    try {
        const testFilename = `${dir}${componentNameL}.test.tsx`;
        const testBuffer = fs.readFileSync(testFilename);
        testSource = testBuffer.toString();
    }
    catch (err) {
        reports[dir]['.'] = {
            type: 'error',
            problem: 'no test file'
        };
    }
    return testSource;
}
function parseProps(reports, dir, sourceCode, componentName) {
    let props;
    try {
        const propsType = `${componentName}Props`;
        const propsReg = new RegExp(`(type|interface) ${propsType} (= )?({(.*\n)*});?`);
        const propsMatch = sourceCode.match(propsReg);
        let propsSrc = propsMatch && propsMatch[0];
        if (!propsSrc) {
            throw new Error(propsType + ' type cannot be found');
        }
        const split = propsSrc.split(/\n};?/);
        propsSrc = split[0] + '\n}';
        const propReg = new RegExp(`\n  ([^ :]+): .*`, 'g');
        const propMatch = propsSrc.match(propReg);
        props = propMatch.map(propMatch => {
            const propNameMatch = propMatch.match(/  ([^ :?]+)([?]?): ([^;]*)/);
            const propName = propNameMatch[1];
            const optional = !!propNameMatch[2];
            const type = propNameMatch[3];
            return { propName, optional, type };
        });
    }
    catch (err) {
        reports[dir]['.'] = {
            type: 'warning',
            problem: 'parse error',
            problemMessage: err.message
        };
    }
    return props;
}
function detectPropPattern(sourceCode, prop) {
    const { propName, optional, type } = prop;
    let propPatterns = [`this\.props\.${propName}`, `props\.${propName}`];
    return propPatterns
        .map(propPattern => {
        const regexp = new RegExp(`([^a-zA-Z0-9])(${propPattern})([^a-zA-Z0-9])`, 'g');
        const faultMatch = sourceCode.match(regexp);
        return {
            type,
            propName,
            regexp,
            occurances: faultMatch ? faultMatch.length : 0
        };
    })
        .find(pattern => pattern.occurances);
}
function replacePattern(pattern) {
    if (pattern.propName === 'children' && pattern.type === 'any') {
        return (s1, s2, s3) => `${s1}<p>hello!</p>${s3}`;
    }
    if (pattern.propName.match(/^on[A-Z]/) && (pattern.type.match(/\=\> void$/) || pattern.type.match(/\=\> any$/))) {
        return (s1, s2, s3) => `${s1}(() => null)${s3}`;
    }
    if (pattern.propName.match(/^on[A-Z]/) && pattern.type.match(/\=\> number$/)) {
        return (s1, s2, s3) => `${s1}(() => 0)${s3}`;
    }
    if (pattern.type.match(/^\([^)]*\) \=\> void/) || pattern.type.match(/^\([^)]*\) \=\> any/)) {
        return (s1, s2, s3) => `${s1}(() => null)${s3}`;
    }
    const stringUnionMatch = pattern.type.match(/('[^']+') (| '[^']+')+/);
    if (stringUnionMatch) {
        const firstItem = stringUnionMatch[1];
        return (s1, s2, s3) => `${s1}${firstItem}${s3}`;
    }
    if (pattern.type.match(/[A-Z][A-Za-z0-9]+\[\]$/)) {
        return (s1, s2, s3) => `${s1}[]${s3}`;
    }
    if (pattern.type.match(/^[A-Z][A-Za-z0-9]+$/)) {
        return (s1, s2, s3) => `${s1}(null)${s3}`;
    }
    switch (pattern.type) {
        case 'any':
            return (s1, s2, s3) => `${s1}(null)${s3}`;
        case 'typeof React.Component':
            return (s1, s2, s3) => `${s1}(null)${s3}`;
        case 'Function':
            return (s1, s2, s3) => `${s1}(() => null)${s3}`;
        case 'boolean':
            return (s1, s2, s3) => `${s1}!${s2}${s3}`;
        case 'string':
            return (s1, s2, s3) => `${s1}(${s2} + 'hey')${s3}`;
        case 'number':
            return (s1, s2, s3) => `${s1}0${s3}`;
        case 'RegExp':
            return (s1, s2, s3) => `${s1}0${s3}`;
        default:
            return null;
    }
}
function injectFault(sourceCode, pattern, caseIndex) {
    let i = 0;
    const replaceFn = replacePattern(pattern);
    let faultCode = sourceCode;
    if (replaceFn) {
        faultCode = sourceCode.replace(pattern.regexp, (match, s1, s2, s3) => {
            const res = caseIndex === undefined || i === caseIndex ? replaceFn(s1, s2, s3) : match;
            i++;
            return res;
        });
    }
    // console.log('\n\n');
    // console.log(faultCode);
    return faultCode;
}
function writeTestFile(dir, outputFilename, newTestSource) {
    const newTestFilename = `${outputFilename}.test`;
    const newTestPath = `${dir}${newTestFilename}.tsx`;
    fs.writeFileSync(newTestPath, newTestSource);
    return newTestPath;
}
function generateTestSource(componentNameL, outputFilename, testSource) {
    const testReg = new RegExp(`(import )(.*)( from '\.\/)${componentNameL}(';)`, 'g');
    const newTestSource = testSource.replace(testReg, `$1$2$3${outputFilename}$4`);
    return newTestSource;
}
function writeSourceFile(dir, outputFilename, faultCode) {
    const outputPath = `${dir}${outputFilename}.tsx`;
    fs.writeFileSync(outputPath, faultCode);
    return outputPath;
}
async function deleteTemporaryFiles() {
    const newSourceFiles = config.sourceFiles.replace(/\.tsx$/, `.${TEMP_FILE_POSTFIX}.tsx`);
    const newTestFiles = config.sourceFiles.replace(/\.tsx$/, `.${TEMP_FILE_POSTFIX}.test.tsx`);
    const newSourceFilePaths = await glob(newSourceFiles);
    const newTestFilePaths = await glob(newTestFiles);
    [...newSourceFilePaths, ...newTestFilePaths].forEach(path => {
        fs.unlinkSync(path);
    });
}
async function runTest(newTestPath, testFilename, propName, occuranceIndex) {
    const jestRes = await jest.runCLI({ _: [`${newTestPath}`] }, [config.jestConfig]);
    const results = jestRes.results;
    let type;
    if (results.numRuntimeErrorTestSuites) {
        type = 'warning';
    }
    else {
        if (!results.numFailedTestSuites) {
            type = 'error';
        }
        else {
            type = 'info';
        }
    }
    const result = {
        type,
        test: testFilename,
        prop: propName,
        failed: results.numFailedTestSuites,
        errors: results.numRuntimeErrorTestSuites,
        errorMessage: results.numRuntimeErrorTestSuites ? results.testResults[0].failureMessage : null
    };
    process.stdout.clearLine();
    process.stdout.write('\r' + testFilename + '    ');
    if (occuranceIndex !== undefined) {
        result.occurance = occuranceIndex + 1;
    }
    return result;
}
async function runTests() {
    const options = {};
    if (args.t) {
        options['_'] = [args.t];
    }
    const jestResult = (await jest.runCLI({ options }, [config.jestConfig])).results;
    const errors = jestResult.numRuntimeErrorTestSuites;
    const total = jestResult.numTotalTestSuites;
    const failed = jestResult.numTotalTestSuites - jestResult.numPassedTestSuites;
    const results = jestResult.testResults.map(jestResult => {
        const faultTestFilePath = jestResult.testFilePath;
        const path = '.' + faultTestFilePath.replace(currentDir, '');
        const dir = pathModule.parse(path).dir + '/';
        const tempFilename = pathModule.parse(path).name;
        const fragmentsStr = tempFilename.replace(`.${TEMP_FILE_POSTFIX}.test`, '');
        const fragments = fragmentsStr.split('.');
        const component = fragments[0];
        const prop = fragments[1];
        const occurance = fragments[2];
        let type, problem, problemMessage;
        if (jestResult.testExecError) {
            type = 'warning';
            problem = 'runtime error';
            problemMessage = jestResult.testExecError.message;
        }
        else {
            if (!jestResult.numFailingTests) {
                type = 'error';
                problem = 'false negative';
            }
            else {
                type = 'info';
                problem = '';
            }
        }
        const result = {
            type,
            dir,
            problem,
            component,
            prop
        };
        if (occurance) {
            result.occurance = Number(occurance);
        }
        if (problemMessage) {
            result.problemMessage = problemMessage;
        }
        return result;
    });
    const report = {
        currentDir,
        total,
        failed,
        coverage: Math.round(100 * failed / total) / 100,
        results
    };
    return report;
}
async function reportPropertySeparateOccurances(reports, dir, sourceCode, testSource, componentNameL, pattern) {
    const propReports = [];
    if (replacePattern(pattern)) {
        for (let occuranceIndex = 0; occuranceIndex < pattern.occurances; occuranceIndex++) {
            if (!args.o || Number(args.o) === occuranceIndex + 1) {
                const filenameFragment = `.${pattern.propName}-${occuranceIndex}.${TEMP_FILE_POSTFIX}`;
                const outputFilename = `${componentNameL}${filenameFragment}`;
                const faultCode = injectFault(sourceCode, pattern, occuranceIndex);
                const outputPath = writeSourceFile(dir, outputFilename, faultCode);
                const newTestSource = generateTestSource(componentNameL, outputFilename, testSource);
                const newTestPath = writeTestFile(dir, outputFilename, newTestSource);
                const testFilename = `${dir}${componentNameL}.test.tsx`;
                const propReport = await runTest(newTestPath, testFilename, pattern.propName, occuranceIndex);
                propReports.push(propReport);
            }
        }
    }
    else {
        error(dir + componentNameL + '  - Unrecognised property type: ' + pattern.propName);
    }
}
async function reportProperty(reports, dir, sourceCode, testSource, componentNameL, pattern) {
    let propReport = {};
    if (replacePattern(pattern)) {
        const filenameFragment = `.${pattern.propName}.${TEMP_FILE_POSTFIX}`;
        const outputFilename = `${componentNameL}${filenameFragment}`;
        const faultCode = injectFault(sourceCode, pattern);
        const outputPath = writeSourceFile(dir, outputFilename, faultCode);
        const newTestSource = generateTestSource(componentNameL, outputFilename, testSource);
        const newTestPath = writeTestFile(dir, outputFilename, newTestSource);
        const testFilename = `${dir}${componentNameL}.test.tsx`;
        // propReport = await runTest(newTestPath, testFilename, pattern.propName);
    }
    else {
        reports[dir][pattern.propName] = {
            type: 'warning',
            prop: pattern.propName,
            problem: 'Unrecognised property type',
            problemMessage: pattern.type
        };
    }
}
function error(...props) {
    const str = props.filter(s => s).join(' - ');
    console.log('\x1b[31m%s\x1b[0m', str);
}
function warning(...props) {
    const str = props.filter(s => s).join(' - ');
    console.log('\x1b[33m%s\x1b[0m', str);
}
function log(...props) {
    const str = props.filter(s => s).join(' - ');
    console.log(str);
}
function showReport(reports) {
    process.stdout.clearLine();
    process.stdout.write('\r');
    Object.keys(reports).forEach(dir => {
        const report = reports[dir];
        const general = report['.'];
        if (general && general.type !== 'info') {
            logReport(general.type, dir, general.problem, general.problemMessage);
        }
        else {
            Object.keys(report)
                .map(propName => report[propName])
                .forEach(propReport => {
                if (propReport.type !== 'info') {
                    logReport(propReport.type, dir, propReport.prop, propReport.problem, propReport.problemMessage);
                }
            });
        }
    });
}
function logReport(type, ...props) {
    switch (type) {
        case 'warning':
            return warning(...props);
        case 'error':
            return error(...props);
        default:
            return log(...props);
    }
}
