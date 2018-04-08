#!/usr/bin/env node
const util = require('util');
const jest = require('jest');
const fs = require('fs');
const pathModule = require('path');
const glob = util.promisify(require('glob'));
var sh = require('shelljs');

const currentDir = sh.pwd().stdout;

process.env.NODE_ENV = 'test';

// Makes the script crash on unhandled rejections instead of silently
// ignoring them. In the future, promise rejections that are not handled will
// terminate the Node.js process with a non-zero exit code.
process.on('unhandledRejection', err => {
  throw err;
});

// PARSE ARGUMESTS
const args = {};
process.argv.forEach(arg => {
  const match = arg.match(/--?([^=]+)=(.*)/);
  if (match) {
    const key = match[1];
    const value = match[2];
    args[key] = value;
  }
});

if (!args.config) {
  throw new Error('--config parameter is required');
}

if ('keep' in args) {
  args.keep = true;
}

if ('occurances' in args) {
  args.occurances = true;
}

const config = require(currentDir + '/' + args.config);

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

  for (i = 0; i < sourcePaths.length; i++) {
    const { componentName, componentNameL, dir } = parseComponentPath(sourcePaths[i]);

    if (!args.t || (componentNameL + '.test.tsx').match(args.t)) {
      if (!reports[dir]) {
        reports[dir] = {};
      }

      const sourceCode = readSourceFile(dir, componentNameL);
      const testSource = readTestFile(reports, dir, componentNameL);
      const props = parseProps(reports, dir, sourceCode, componentName);

      if (props && testSource) {
        await Promise.all(
          props.map(async prop => {
            const propName = prop.propName;
            try {
              if (!args.p || propName.toLowerCase() === args.p.toLowerCase()) {
                const pattern = detectPropPattern(sourceCode, prop);
                if (args.occurances) {
                  reports[dir][propName] = await reportPropertySeparateOccurances(
                    dir,
                    sourceCode,
                    testSource,
                    componentNameL,
                    pattern
                  );
                } else {
                  reports[dir][propName] = await reportProperty(dir, sourceCode, testSource, componentNameL, pattern);
                }
              }
            } catch (err) {
              reports[dir][propName] = {
                type: 'warning',
                problem: 'fault-injection error',
                problemMessage: err.message
              };
            }
          })
        );
      }
    }
  }
  //  console.log('reports: ', reports);
  showReport(reports);
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
  } catch (err) {
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
  } catch (err) {
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
        type: 'warning',
        propName,
        type,
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

function deleteFiles(outputPath, newTestPath) {
  fs.unlinkSync(outputPath);
  fs.unlinkSync(newTestPath);
}

async function runTest(newTestPath, testFilename, propName, occuranceIndex) {
  const jestRes = await jest.runCLI({ _: [`${newTestPath}`] }, [config.jestConfig]);
  const results = jestRes.results;

  if (results.numRuntimeErrorTestSuites) {
    type = 'warning';
  } else {
    if (!results.numFailedTestSuites) {
      type = 'error';
    } else {
      type = 'info';
    }
  }

  const result = {
    type,
    test: testFilename,
    prop: propName,
    failed: results.numFailedTestSuites,
    error: results.numRuntimeErrorTestSuites,
    errorMessage: results.numRuntimeErrorTestSuites && results.testResults[0].failureMessage
  };

  process.stdout.clearLine();
  process.stdout.write('\r' + testFilename + '    ');

  if (occuranceIndex !== undefined) {
    result.occurance = occuranceIndex + 1;
  }

  return result;
}

async function reportPropertySeparateOccurances(dir, sourceCode, testSource, componentNameL, pattern) {
  const propReports = [];
  if (replacePattern(pattern)) {
    for (let occuranceIndex = 0; occuranceIndex < pattern.occurances; occuranceIndex++) {
      if (!args.o || Number(args.o) === occuranceIndex + 1) {
        const filenameFragment = `.${pattern.propName}-${occuranceIndex}.fault`;
        const outputFilename = `${componentNameL}${filenameFragment}`;

        const faultCode = injectFault(sourceCode, pattern, occuranceIndex);
        const outputPath = writeSourceFile(dir, outputFilename, faultCode);
        const newTestSource = generateTestSource(componentNameL, outputFilename, testSource);
        const newTestPath = writeTestFile(dir, outputFilename, newTestSource);
        const testFilename = `${dir}${componentNameL}.test.tsx`;
        const propReport = await runTest(newTestPath, testFilename, pattern.propName, occuranceIndex);
        propReports.push(propReport);

        if (!args.keep) {
          deleteFiles(outputPath, newTestPath);
        }
      }
    }
  } else {
    error(dir + componentNameL + '  - Unrecognised property type: ' + pattern.propName);
  }
}

async function reportProperty(dir, sourceCode, testSource, componentNameL, pattern) {
  let propReport = {};
  if (replacePattern(pattern)) {
    const filenameFragment = `.${pattern.propName}.fault`;
    const outputFilename = `${componentNameL}${filenameFragment}`;

    const faultCode = injectFault(sourceCode, pattern);
    const outputPath = writeSourceFile(dir, outputFilename, faultCode);
    const newTestSource = generateTestSource(componentNameL, outputFilename, testSource);
    const newTestPath = writeTestFile(dir, outputFilename, newTestSource);
    const testFilename = `${dir}${componentNameL}.test.tsx`;
    propReport = await runTest(newTestPath, testFilename, pattern.propName);

    if (!args.keep) {
      deleteFiles(outputPath, newTestPath);
    }
  } else {
    propReport = {
      type: 'warning',
      prop: pattern.propName,
      problem: 'Unrecognised property type',
      problemMessage: pattern.type
    };
  }
  return propReport;
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

    if (general) {
      logReport(general.type, dir, general.problem, general.problemMessage);
    } else {
      Object.keys(report)
        .map(propName => report[propName])
        .filter(propReport => {
          return !propReport.failed || propReport.problem;
        })
        .forEach(propReport => {
          if (propReport.problem) {
            logReport(propReport.type, dir, propReport.prop, propReport.problem, propReport.problemMessage);
          } else {
            logReport(propReport.type, dir, propReport.prop, 'False negative');
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
