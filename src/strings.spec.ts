import * as chai from 'chai';
import { expect } from 'chai';
import * as sinon from 'sinon';
import * as sinonChai from 'sinon-chai';
import 'mocha';
chai.use(sinonChai);

import { kebabCase2CamelCase, kebabCase2UpperCamelCase } from './strings';

describe('kebabCase2CamelCase', () => {
  it('should tranform kebab-case string to camel-case string', () => {
    expect(kebabCase2CamelCase('uno-kebab-por-favor')).to.equal('unoKebabPorFavor');
  });

  it('should ignore case', () => {
    expect(kebabCase2CamelCase('UNO-Kebab-pOr-faVOR')).to.equal('unoKebabPorFavor');
  });

  it('should ignore spaces', () => {
    expect(kebabCase2CamelCase('  UNO- Kebab- pOr- faVOR ')).to.equal('unoKebabPorFavor');
  });

  it('should handle one word', () => {
    expect(kebabCase2CamelCase('UNO')).to.equal('uno');
  });

  it('should handle empty string', () => {
    expect(kebabCase2CamelCase('')).to.equal('');
  });

  it('should handle spaces string', () => {
    expect(kebabCase2CamelCase('  ')).to.equal('');
  });
});

describe('kebabCase2UpperCamelCase', () => {
  it('should tranform kebab-case string to uppercase camel-case string', () => {
    expect(kebabCase2UpperCamelCase('uno-kebab-por-favor')).to.equal('UnoKebabPorFavor');
  });

  it('should ignore case', () => {
    expect(kebabCase2UpperCamelCase('UNO-Kebab-pOr-faVOR')).to.equal('UnoKebabPorFavor');
  });

  it('should ignore spaces', () => {
    expect(kebabCase2UpperCamelCase('  UNO- Kebab- pOr- faVOR ')).to.equal('UnoKebabPorFavor');
  });

  it('should handle one word', () => {
    expect(kebabCase2UpperCamelCase('UNO')).to.equal('Uno');
  });

  it('should handle empty string', () => {
    expect(kebabCase2UpperCamelCase('')).to.equal('');
  });

  it('should handle spaces string', () => {
    expect(kebabCase2UpperCamelCase('  ')).to.equal('');
  });
});
