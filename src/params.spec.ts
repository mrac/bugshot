import * as chai from 'chai';
import { expect } from 'chai';
import * as sinon from 'sinon';
import * as sinonChai from 'sinon-chai';
import 'mocha';
chai.use(sinonChai);

import { parseParams } from './params';

describe('parseParams', () => {
  it('should return commandline parameters', () => {
    const argv = ['node', './my-script.js', '--name=10', '-t=something/s.js'];
    expect(parseParams(argv)).to.deep.equal({
      name: '10',
      t: 'something/s.js'
    });
  });
});
