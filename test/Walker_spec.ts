import * as path from 'path';
import { expect } from 'chai';

import { Module, Walker } from '../src/Walker';
import { DepType, DepRequireState } from '../src/depTypes';

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

  it('should locate top level prod deps as required prod deps', () => {
    expect(dep('fs-extra').relationship.getType()).equal(DepType.PROD);
    expect(dep('fs-extra').relationship.getRequired()).equal(DepRequireState.REQUIRED);
  });

  it('should locate top level dev deps as required dev deps', () => {
    expect(dep('mocha').relationship.getType()).equal(DepType.DEV);
    expect(dep('mocha').relationship.getRequired()).equal(DepRequireState.REQUIRED);
  });

  it('should locate a dep of a dev dep as a required dev dep', () => {
    expect(dep('commander').relationship.getType()).equal(DepType.DEV);
    expect(dep('commander').relationship.getRequired()).equal(DepRequireState.REQUIRED);
  });

  it('should locate a dep of a dev dep that is also a top level prod dep as a required prod dep', () => {
    expect(dep('debug').relationship.getType()).equal(DepType.PROD);
    expect(dep('debug').relationship.getRequired()).equal(DepRequireState.REQUIRED);
  });

  it('should locate a dep of a dev dep that is optional as an optional dev dep', function () {
    if (process.platform !== 'darwin') {
      this.skip();
    }
    expect(dep('fsevents').relationship.getType()).to.equal(DepType.DEV);
    expect(dep('fsevents').relationship.getRequired()).to.equal(DepRequireState.OPTIONAL);
  });
});
