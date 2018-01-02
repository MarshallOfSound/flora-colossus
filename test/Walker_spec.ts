import * as path from 'path';
import { expect } from 'chai';

import { Module, Walker } from '../src/Walker';
import { DepType } from '../src/depTypes';

describe('Walker', () => {
  let walker: Walker;
  let modules: Module[];
  const dep = (depName: string) => modules.find(module => module.name === depName);

  beforeEach(async () => {
    walker = new Walker(path.resolve(__dirname, '..'));
     modules = await walker.walkTree();
  });

  it('should save root directory correctly', () => {
    expect(walker.getRootModule()).to.equal(path.resolve(__dirname, '..'));
  });

  it('should locate top level prod deps as prod deps', () => {
    expect(dep('fs-extra')).to.have.property('depType', DepType.PROD);
  });

  it('should locate top level dev deps as dev deps', () => {
    expect(dep('mocha')).to.have.property('depType', DepType.DEV);
  });

  it('should locate a dep of a dev dep as a dev dep', () => {
    expect(dep('commander')).to.have.property('depType', DepType.DEV);
  });

  it('should locate a dep of a dev dep that is also a top level prod dep as a prod dep', () => {
    expect(dep('debug')).to.have.property('depType', DepType.PROD);
  });
});
