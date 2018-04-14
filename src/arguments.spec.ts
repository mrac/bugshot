import * as chai from 'chai';
import { expect } from 'chai';
import * as sinon from 'sinon';
import * as sinonChai from 'sinon-chai';
import 'mocha';
chai.use(sinonChai);

import { getArguments } from './arguments';
import * as params from './params';

describe('getArguments', () => {
  let sandbox: sinon.SinonSandbox;
  let CLIParamsMock = ['a', 'b', 'c'];

  beforeEach(() => {
    sandbox = sinon.sandbox.create();
  });

  afterEach(() => {
    sandbox.restore();
  });

  it('should call parseParams', () => {
    const argsMock = { config: 'a' };
    const parseParamsStub = sandbox.stub(params, 'parseParams').callsFake(() => argsMock);
    const args = getArguments(CLIParamsMock);
    expect(parseParamsStub).to.have.been.calledWith(CLIParamsMock);
  });

  it('should return arguments map', () => {
    const argsMock = { config: 'src/my.config.js', t: 't', p: 'p', o: 'o' };
    const parseParamsStub = sandbox.stub(params, 'parseParams').callsFake(() => argsMock);
    const args = getArguments(CLIParamsMock);
    expect(args).to.deep.equal({ config: 'src/my.config.js', t: 't', p: 'p', o: 'o' });
  });

  it('should throw error if no --config parameter', () => {
    const argsMock = {};
    const parseParamsStub = sandbox.stub(params, 'parseParams').callsFake(() => argsMock);
    expect(() => getArguments(CLIParamsMock)).to.throw();
  });

  it('should set occurances param to true', () => {
    const argsMock = { config: 'a', occurances: '' };
    const parseParamsStub = sandbox.stub(params, 'parseParams').callsFake(() => argsMock);
    const args = getArguments(CLIParamsMock);
    expect(args.occurances).to.equal(true);
  });

  it('should set keep param to true', () => {
    const argsMock = { config: 'a', keep: '' };
    const parseParamsStub = sandbox.stub(params, 'parseParams').callsFake(() => argsMock);
    const args = getArguments(CLIParamsMock);
    expect(args.keep).to.equal(true);
  });
});
