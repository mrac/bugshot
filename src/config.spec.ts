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
  const jsonMock = `{ "configParam1": 1, "configParam2": true }`;
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

  it('should return config object', () => {
    const config = getConfig(args, currentDir);

    expect(config).to.deep.equal({
      configParam1: 1,
      configParam2: true,
      dirs: {
        configDir: '/current/dir/conf/',
        currentDir: '/current/dir/'
      }
    });
  });
});
