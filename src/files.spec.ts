import * as chai from 'chai';
import { expect } from 'chai';
import * as sinon from 'sinon';
import * as sinonChai from 'sinon-chai';
import 'mocha';
chai.use(sinonChai);

import * as glob from 'glob';
import * as util from 'util';
import * as path from 'path';
import * as fs from 'fs';

import { getAbsoluteSourcePaths, readFile, deleteTemporaryFiles, writeFile } from './files';
import { Config } from './config';

describe('getAbsoluteSourcePaths', () => {
  let sandbox: sinon.SinonSandbox;
  let globStub, promisifyStub, sourcePathsMock;

  const config: Config = {
    baseDir: '../../',
    sourceFiles: './path/to/sourcefiles/**/*.tsx',
    ignore: ['./path/to/sourcefiles/but/not/this.tsx'],
    dirs: {
      configDir: '/absolute/config/dir/'
    },
    faultFileExt: 'fault-file',
    testFileExt: 'test-file'
  } as Config;

  beforeEach(() => {
    sandbox = sinon.sandbox.create();
    sourcePathsMock = ['path1', 'path2', 'path3'];
    globStub = sandbox.stub().callsFake(() => Promise.resolve(sourcePathsMock));
    promisifyStub = sandbox.stub(util, 'promisify').callsFake(() => globStub);
  });

  afterEach(() => {
    sandbox.restore();
  });

  it('should promisify glob', async () => {
    const sourcePaths = await getAbsoluteSourcePaths(config);
    expect(promisifyStub).to.have.been.calledWith(glob);
  });

  it('should call glob', async () => {
    const sourcePaths = await getAbsoluteSourcePaths(config);
    expect(globStub).to.have.been.calledWith('/absolute/path/to/sourcefiles/**/*.tsx', {
      ignore: [
        '/absolute/**/*.fault-file.*',
        '/absolute/**/*.fault-file.test-file.*',
        '/absolute/path/to/sourcefiles/but/not/this.tsx'
      ]
    });
  });

  it('should return source paths', async () => {
    const sourcePaths = await getAbsoluteSourcePaths(config);
    expect(sourcePaths).to.equal(sourcePathsMock);
  });
});

describe('readFile', () => {
  let sandbox: sinon.SinonSandbox;
  const textMock = 'this is file content';
  const filePath = '/absolute/path/to/file.tsx';

  const bufferMock = {
    toString: () => textMock
  };

  beforeEach(() => {
    sandbox = sinon.sandbox.create();
  });

  afterEach(() => {
    sandbox.restore();
  });

  it('should read file content', () => {
    const readFileSyncStub = sandbox.stub(fs, 'readFileSync').callsFake(() => bufferMock);
    const content = readFile(filePath);
    expect(readFileSyncStub).to.have.been.calledWith(filePath);
    expect(content).to.equal(textMock);
  });

  it('should NOT throw error', () => {
    const readFileSyncStub = sandbox.stub(fs, 'readFileSync').callsFake(() => {
      throw new Error('error');
    });
    expect(() => readFile(filePath)).not.to.throw();
  });

  it('should return null on error', () => {
    const readFileSyncStub = sandbox.stub(fs, 'readFileSync').callsFake(() => {
      throw new Error('error');
    });
    const content = readFile(filePath);
    expect(content).to.equal(null);
  });
});

describe('writeFile', () => {
  let sandbox: sinon.SinonSandbox;
  const filePath = '/absolute/path/to/file.tsx';
  const content = 'this is text';

  beforeEach(() => {
    sandbox = sinon.sandbox.create();
  });

  afterEach(() => {
    sandbox.restore();
  });

  it('should call writeFileSync', () => {
    const writeFileSyncStub = sandbox.stub(fs, 'writeFileSync');
    writeFile(filePath, content);
    expect(writeFileSyncStub).to.have.been.calledWith(filePath, content);
  });
});

describe('deleteTemporaryFiles', () => {
  let sandbox: sinon.SinonSandbox;
  let unlinkSyncStub: sinon.SinonStub;
  let sourcePathsMock: string;
  let globStub: sinon.SinonStub;
  let promisifyStub: sinon.SinonStub;

  const config = {
    baseDir: '../../',
    sourceFiles: './path/to/sourcefiles/**/*.tsx',
    ignore: ['./path/to/sourcefiles/but/not/this.tsx'],
    dirs: {
      configDir: '/absolute/config/dir/'
    },
    sourceFileToTestFileFn: (sourcePath: string, config: Config) => sourcePath + '_test',
    sourceFileToFaultSourceFileFn: (sourcePath: string, config: Config) => sourcePath + '_fault',
    testFileToFaultTestFileFn: (testPath: string, config: Config) => testPath + '_testfault'
  } as Config;

  beforeEach(() => {
    sandbox = sinon.sandbox.create();
    globStub = sandbox.stub().callsFake(glob => Promise.resolve([glob + '_1', glob + '_2']));
    promisifyStub = sandbox.stub(util, 'promisify').callsFake(() => globStub);
    unlinkSyncStub = sandbox.stub(fs, 'unlinkSync');
  });

  afterEach(() => {
    sandbox.restore();
  });

  it('should promisify glob', async () => {
    await deleteTemporaryFiles(config);
    expect(promisifyStub).to.have.been.calledWith(glob);
    expect(promisifyStub).to.have.been.calledWith(glob);
  });

  it('should call glob with fault files (source and test)', async () => {
    const sourcePaths = await deleteTemporaryFiles(config);
    expect(globStub).to.have.been.calledTwice;
    expect(globStub.firstCall).to.have.been.calledWith('/absolute/path/to/sourcefiles/**/*.tsx_fault');
    expect(globStub.secondCall).to.have.been.calledWith('/absolute/path/to/sourcefiles/**/*.tsx_test_testfault');
  });

  it('should delete fault files (source and test)', async () => {
    const content = await deleteTemporaryFiles(config);
    expect(unlinkSyncStub.callCount).to.equal(4);
    expect(unlinkSyncStub.getCall(0)).to.have.been.calledWith('/absolute/path/to/sourcefiles/**/*.tsx_fault_1');
    expect(unlinkSyncStub.getCall(1)).to.have.been.calledWith('/absolute/path/to/sourcefiles/**/*.tsx_fault_2');
    expect(unlinkSyncStub.getCall(2)).to.have.been.calledWith(
      '/absolute/path/to/sourcefiles/**/*.tsx_test_testfault_1'
    );
    expect(unlinkSyncStub.getCall(3)).to.have.been.calledWith(
      '/absolute/path/to/sourcefiles/**/*.tsx_test_testfault_2'
    );
  });
});
