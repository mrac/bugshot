import { parseParams } from './params';
import { expect } from 'chai';
import 'mocha';

describe('parseParams', () => {
  it('should return arguments map', () => {
    const argv = ['node', './my-script.js', '--name=10', '-t=something/s.js'];
    expect(parseParams(argv)).to.deep.equal({
      name: '10',
      t: 'something/s.js'
    });
  });
});
