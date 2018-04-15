import * as chai from 'chai';
import { expect } from 'chai';
import * as sinon from 'sinon';
import * as sinonChai from 'sinon-chai';
import 'mocha';
chai.use(sinonChai);

import * as fs from 'fs';
import * as sh from 'shelljs';
import { getConfig } from './config';

describe('getConfig', () => {
  const jsonMock = `{ "baseDir": "a", "jestConfig": "b", "sourceFiles": "c", "ignore": ["a", "b"] }`;
  const args = { config: 'conf/a.json' };
  const currentDir = '/current/dir';
  let sandbox: sinon.SinonSandbox;
  let readFileStub;

  beforeEach(() => {
    sandbox = sinon.sandbox.create();
    readFileStub = sandbox.stub(fs, 'readFileSync').callsFake(() => jsonMock);
  });

  afterEach(() => {
    sandbox.restore();
  });

  it('should read config file', () => {
    const config = getConfig(args, currentDir);
    expect(readFileStub).to.have.been.calledWith('/current/dir/conf/a.json', 'utf8');
  });

  it('should return config parameters', () => {
    const config = getConfig(args, currentDir);

    expect(config.baseDir).to.equal('a');
    expect(config.jestConfig).to.equal('b');
    expect(config.sourceFiles).to.equal('c');
    expect(config.ignore).to.deep.equal(['a', 'b']);
  });

  describe('extra parameters', () => {
    it('should return absolute directories', () => {
      const config = getConfig(args, currentDir);
      expect(config.dirs.currentDir).to.equal('/current/dir/');
      expect(config.dirs.configDir).to.equal('/current/dir/conf/');
    });

    it('should return default tempFilePostfix', () => {
      const config = getConfig(args, currentDir);
      expect(config.faultFileExt).to.equal('bugshot-fault');
    });

    it('should return default testFileExt', () => {
      const config = getConfig(args, currentDir);
      expect(config.testFileExt).to.equal('test');
    });

    it('should return default sourceFileToTestFileFn', () => {
      const config = getConfig(args, currentDir);
      config.testFileExt = 'xyz';

      let sourcePath = './src/**/*.tsx';
      expect(config.sourceFileToTestFileFn(sourcePath, config)).to.equal('./src/**/*.xyz.tsx');

      sourcePath = './src/**/*-something.ts';
      expect(config.sourceFileToTestFileFn(sourcePath, config)).to.equal('./src/**/*-something.xyz.ts');
    });

    it('should return default sourceFileToFaultSourceFileFn', () => {
      const config = getConfig(args, currentDir);
      config.faultFileExt = 'abc';

      let sourcePath = './src/**/*.tsx';
      expect(config.sourceFileToFaultSourceFileFn(sourcePath, config)).to.equal('./src/**/*.abc.tsx');

      sourcePath = './src/**/*-something.ts';
      expect(config.sourceFileToFaultSourceFileFn(sourcePath, config)).to.equal('./src/**/*-something.abc.ts');
    });

    it('should return default testFileToFaultTestFileFn', () => {
      const config = getConfig(args, currentDir);
      config.faultFileExt = 'abc';
      config.testFileExt = 'xyz';

      let testPath = './src/**/*.xyz.tsx';
      expect(config.testFileToFaultTestFileFn(testPath, config)).to.equal('./src/**/*.abc.xyz.tsx');

      testPath = './src/**/*-something.xyz.ts';
      expect(config.testFileToFaultTestFileFn(testPath, config)).to.equal('./src/**/*-something.abc.xyz.ts');

      // non-test file extensions should not be processed
      testPath = './src/**/*-something.zzzz.ts';
      expect(config.testFileToFaultTestFileFn(testPath, config)).to.equal('./src/**/*-something.zzzz.ts');
    });
  });
});
