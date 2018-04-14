import * as chai from 'chai';
import { expect } from 'chai';
import * as sinon from 'sinon';
import * as sinonChai from 'sinon-chai';
import 'mocha';
chai.use(sinonChai);

import * as glob from 'glob';
import * as util from 'util';
import * as path from 'path';
import { getAbsoluteSourcePaths } from './files';
import { Config } from './config';

describe('getAbsoluteSourcePaths', () => {
  let sandbox: sinon.SinonSandbox;
  let globStub, promisifyStub, sourcePathsMock;

  const config = {
    baseDir: '../..',
    sourceFiles: './path/to/sourcefiles/**/*.tsx',
    ignore: ['./path/to/sourcefiles/but/not/this.tsx'],
    dirs: {
      configDir: '/absolute/config/dir/'
    }
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
      ignore: ['/absolute/path/to/sourcefiles/but/not/this.tsx']
    });
  });

  it('should return source paths', async () => {
    const sourcePaths = await getAbsoluteSourcePaths(config);
    expect(sourcePaths).to.equal(sourcePathsMock);
  });
});
