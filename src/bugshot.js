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

const config = require(currentDir + '/' + args.config);

// --config
// --t
// --p
// --o
// --keep
// --single

main();

async function main() {
  const filePaths = await readFilePaths();

  for (i = 0; i < filePaths.length; i++) {
    const { componentName, componentNameL, path } = parseComponentPath(filePaths[i]);

    if (!args.t || (componentNameL + '.test.tsx').match(args.t)) {
      const sourceCode = readSourceFile(path, componentNameL);
      const testSource = readTestFile(path, componentNameL);
      const props = parseProps(sourceCode, componentName);

      if (props && testSource) {
        try {
          await Promise.all(
            props.map(async prop => {
              if (!args.p || prop.propName.toLowerCase() === args.p.toLowerCase()) {
                const pattern = detectPropPattern(sourceCode, prop);
                if (args.single) {
                  await reportSingleProperty(path, sourceCode, testSource, componentNameL, pattern);
                } else {
                  await reportProperty(path, sourceCode, testSource, componentNameL, pattern);
                }
              }
            })
          );
        } catch (err) {
          console.log('\x1b[31m%s\x1b[0m', componentName + '   -  fault-injection error  -  ' + err.message);
        }
      }
    }
  }
}

// ------------------------------------------------------------

async function readFilePaths() {
  return await glob(config.sourceFiles, {
    ignore: config.ignore
  });
}

function kebabCase2CamelCase(kebabCase) {
  const words = kebabCase.split('-');
  const capitalizedWords = words.map(word => word[0].toUpperCase() + word.substr(1).toLowerCase());
  return capitalizedWords.join('');
}

function parseComponentPath(componentFullPath) {
  const componentNameL = pathModule.parse(componentFullPath).name;
  const componentName = kebabCase2CamelCase(componentNameL);
  const path = pathModule.dirname(componentFullPath) + '/';
  return { path, componentName, componentNameL };
}

function readSourceFile(path, componentNameL) {
  const inputPath = `${path}${componentNameL}.tsx`;
  const buffer = fs.readFileSync(inputPath);
  const sourceCode = buffer.toString();
  return sourceCode;
}

function readTestFile(path, componentNameL) {
  let testSource;

  try {
    const testFilename = `${path}${componentNameL}.test.tsx`;
    const testBuffer = fs.readFileSync(testFilename);
    testSource = testBuffer.toString();
  } catch (err) {
    console.log('\x1b[31m%s\x1b[0m', path + componentNameL + '   - no test file');
  }
  return testSource;
}

function parseProps(sourceCode, componentName) {
  let props;

  try {
    const propsType = `${componentName}Props`;

    const propsReg = new RegExp(`(type|interface) ${propsType} (= )?({(.*\n)*});?`);
    const propsMatch = sourceCode.match(propsReg);
    let propsSrc = propsMatch && propsMatch[0];
    if (!propsSrc) {
      throw new Error(propsType + ' undetectable.');
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
    console.log('\x1b[31m%s\x1b[0m', componentName + '   - parsing error  -  ' + err.message);
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

  if (pattern.type.match(/[A-Za-z0-9]\[\]$/)) {
    return (s1, s2, s3) => `${s1}[]${s3}`;
  }

  if (pattern.type.match(/^[A-Za-z0-9]+$/)) {
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
      return (s1, s2, s3) => `${s1}(${s2} + \'hey\')${s3}`;
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

function writeTestFile(path, outputFilename, newTestSource) {
  const newTestFilename = `${outputFilename}.test`;
  const newTestPath = `${path}${newTestFilename}.tsx`;
  fs.writeFileSync(newTestPath, newTestSource);
  return newTestPath;
}

function generateTestSource(componentNameL, outputFilename, testSource) {
  const testReg = new RegExp(`(import )(.*)( from '\.\/)${componentNameL}(';)`, 'g');
  const newTestSource = testSource.replace(testReg, `$1$2$3${outputFilename}$4`);
  return newTestSource;
}

function writeSourceFile(path, outputFilename, faultCode) {
  const outputPath = `${path}${outputFilename}.tsx`;
  fs.writeFileSync(outputPath, faultCode);
  return outputPath;
}

function deleteFiles(outputPath, newTestPath) {
  fs.unlinkSync(outputPath);
  fs.unlinkSync(newTestPath);
}

async function report(newTestPath, testFilename, propName, occuranceIndex) {
  const jestRes = await jest.runCLI({ _: [`${newTestPath}`] }, [config.jestConfig]);
  const total = jestRes.results.numTotalTestSuites;
  const passing = jestRes.results.numPassedTestSuites;
  const failing = total - passing;
  const coverage = failing / total;
  const occuranceStr = occuranceIndex !== undefined ? occuranceIndex + 1 + '  ' : '';
  console.log(`\r${testFilename}  ${propName}  ${occuranceStr}`, (coverage * 100).toFixed(0) + '%');
}

async function reportSingleProperty(path, sourceCode, testSource, componentNameL, pattern) {
  if (replacePattern(pattern)) {
    for (let occuranceIndex = 0; occuranceIndex < pattern.occurances; occuranceIndex++) {
      if (!args.o || Number(args.o) === occuranceIndex + 1) {
        const filenameFragment = `.${pattern.propName}-${occuranceIndex}.fault`;
        const outputFilename = `${componentNameL}${filenameFragment}`;

        const faultCode = injectFault(sourceCode, pattern, occuranceIndex);
        const outputPath = writeSourceFile(path, outputFilename, faultCode);
        const newTestSource = generateTestSource(componentNameL, outputFilename, testSource);
        const newTestPath = writeTestFile(path, outputFilename, newTestSource);
        const testFilename = `${path}${componentNameL}.test.tsx`;
        await report(newTestPath, testFilename, pattern.propName, occuranceIndex);
        if (!args.keep) {
          deleteFiles(outputPath, newTestPath);
        }
      }
    }
  } else {
    console.log('\x1b[31m%s\x1b[0m', path + componentNameL + '  - unrecognised property type: ' + pattern.propName);
  }
}

async function reportProperty(path, sourceCode, testSource, componentNameL, pattern) {
  if (replacePattern(pattern)) {
    const filenameFragment = `.${pattern.propName}.fault`;
    const outputFilename = `${componentNameL}${filenameFragment}`;

    const faultCode = injectFault(sourceCode, pattern);
    const outputPath = writeSourceFile(path, outputFilename, faultCode);
    const newTestSource = generateTestSource(componentNameL, outputFilename, testSource);
    const newTestPath = writeTestFile(path, outputFilename, newTestSource);
    const testFilename = `${path}${componentNameL}.test.tsx`;
    await report(newTestPath, testFilename, pattern.propName);
    if (!args.keep) {
      deleteFiles(outputPath, newTestPath);
    }
  } else {
    console.log('\x1b[31m%s\x1b[0m', path + componentNameL + '  - unrecognised property type: ' + pattern.propName);
  }
}
