import * as path from 'path';
import { expect } from 'chai';

import { Module, Walker } from '../src/Walker';
import { DepType } from '../src/depTypes';
import { NativeModuleType } from '../src/nativeModuleTypes';

async function buildWalker(modulePath: string): Promise<Module[]> {
  const walker = new Walker(modulePath);
  return await walker.walkTree();
}

describe('Walker', () => {
  let modules: Module[];
  const thisPackageDir = path.resolve(__dirname, '..');
  const dep = (depName: string) => modules.find(module => module.name === depName);

  it('should save root directory correctly', () => {
    const walker = new Walker(thisPackageDir)
    expect(walker.getRootModule()).to.equal(thisPackageDir);
  });

  describe('depType', () => {
    beforeEach(async () => {
      modules = await buildWalker(path.resolve(__dirname, '..'));
    });

    it('should locate top level prod deps as prod deps', () => {
      expect(dep('fs-extra')).to.have.property('depType', DepType.PROD);
    });

    it('should locate top level dev deps as dev deps', () => {
      expect(dep('mocha')).to.have.property('depType', DepType.DEV);
    });

    it('should locate a dep of a dev dep as a dev dep', () => {
      expect(dep('yargs')).to.have.property('depType', DepType.DEV);
    });

    it('should locate a dep of a dev dep that is also a top level prod dep as a prod dep', () => {
      expect(dep('debug')).to.have.property('depType', DepType.PROD);
    });

    it('should locate a dep of a dev dep that is optional as a dev_optional dep', function () {
      if (process.platform !== 'darwin') {
        this.skip();
        return;
      }
      expect(dep('fsevents')).to.have.property('depType', DepType.DEV_OPTIONAL);
    });
  });

  describe('nativeModuleType', () => {
    beforeEach(async () => {
      modules = await buildWalker(path.join(__dirname, 'fixtures', 'native_modules'));
    });

    it('should detect a module that uses prebuild', () => {
      expect(dep('native-uses-prebuild')).to.have.property('nativeModuleType', NativeModuleType.PREBUILD);
    });

    it('should detect a module that uses node-gyp', () => {
      expect(dep('native-uses-node-gyp')).to.have.property('nativeModuleType', NativeModuleType.NODE_GYP);
    });

    it('should detect a module that is not native', () => {
      expect(dep('pure-javascript-module')).to.have.property('nativeModuleType', NativeModuleType.NONE);
    });
  });

  describe('conflicting optional and dev dependencies (xml2js)', () => {
    beforeEach(async () => {
      modules = await buildWalker(path.join(__dirname, 'fixtures', 'xml2js'));
    });

    it('should detect multiple instances of the same module', () => {
      const xmlBuilderModules = modules.filter(m => m.name === 'xmlbuilder');
      expect(xmlBuilderModules).to.have.lengthOf(2);
    });

    it('should detect the hoisted and unhoisted instances correctly as optional/dev', () => {
      const xmlBuilderModules = modules.filter(m => m.name === 'xmlbuilder');
      // versions tested come from the lockfile, 8.2.2 is the version depended upon by plist@2.x
      const expectedDev = xmlBuilderModules.find(m => m.path.includes("8.2.2"));
      // versions tested come from the lockfile, 9.0.7 is the version transitively depended upon by xml2js and plist@3.x
      const expectedOptional = xmlBuilderModules.find(m => m.path.includes("9.0.7"));
      expect(expectedDev).to.have.property('depType', DepType.DEV);
      expect(expectedOptional).to.have.property('depType', DepType.OPTIONAL);
    });
  });
});
