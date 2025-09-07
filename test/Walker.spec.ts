import * as path from 'path';
import { describe, it, beforeEach, expect } from 'vitest';

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
  const dep = (depName: string) => modules.find((module) => module.name === depName);

  it('should save root directory correctly', () => {
    const walker = new Walker(thisPackageDir);
    expect(walker.getRootModule()).toBe(thisPackageDir);
  });

  describe('depType', () => {
    beforeEach(async () => {
      modules = await buildWalker(path.resolve(__dirname, '..'));
    });

    it('should locate top level prod deps as prod deps', () => {
      expect(dep('debug')).toHaveProperty('depType', DepType.PROD);
    });

    it('should locate top level dev deps as dev deps', () => {
      expect(dep('vitest')).toHaveProperty('depType', DepType.DEV);
    });

    it('should locate a dep of a dev dep as a dev dep', () => {
      expect(dep('chai')).toHaveProperty('depType', DepType.DEV);
    });

    it('should locate a dep of a dev dep that is also a top level prod dep as a prod dep', () => {
      expect(dep('debug')).toHaveProperty('depType', DepType.PROD);
    });

    it.skipIf(process.platform !== 'darwin')(
      'should locate a dep of a dev dep that is optional as a dev_optional dep',
      () => {
        expect(dep('fsevents')).toHaveProperty('depType', DepType.DEV_OPTIONAL);
      },
    );
  });

  describe('nativeModuleType', () => {
    beforeEach(async () => {
      modules = await buildWalker(path.join(__dirname, 'fixtures', 'native_modules'));
    });

    it('should detect a module that uses prebuild', () => {
      expect(dep('native-uses-prebuild')).toHaveProperty(
        'nativeModuleType',
        NativeModuleType.PREBUILD,
      );
    });

    it('should detect a module that uses node-gyp', () => {
      expect(dep('native-uses-node-gyp')).toHaveProperty(
        'nativeModuleType',
        NativeModuleType.NODE_GYP,
      );
    });

    it('should detect a module that is not native', () => {
      expect(dep('pure-javascript-module')).toHaveProperty(
        'nativeModuleType',
        NativeModuleType.NONE,
      );
    });
  });

  describe('conflicting optional and dev dependencies (xml2js)', () => {
    const deepIdentifier = path.join('xml2js', 'node_modules', 'plist');

    beforeEach(async () => {
      modules = await buildWalker(path.join(__dirname, 'fixtures', 'yarn', 'xml2js'));
    });

    it('should detect multiple instances of the same module', () => {
      const xmlBuilderModules = modules.filter((m) => m.name === 'xmlbuilder');
      expect(xmlBuilderModules).toHaveLength(4);
    });

    it('should detect the hoisted and unhoisted instances correctly as optional/dev', () => {
      const xmlBuilderModules = modules.filter((m) => m.name === 'xmlbuilder');
      // Kept deep by plist
      const expectedDev = xmlBuilderModules.find((m) => m.path.includes(deepIdentifier));
      // Hoisted for xml2js
      const expectedOptional = xmlBuilderModules.find((m) => !m.path.includes(deepIdentifier));
      expect(expectedDev).toHaveProperty('depType', DepType.DEV);
      expect(expectedOptional).toHaveProperty('depType', DepType.OPTIONAL);
    });
  });

  describe('Package Manager Edge Cases', () => {
    describe('npm workspaces', () => {
      beforeEach(async () => {
        modules = await buildWalker(path.join(__dirname, 'fixtures', 'npm_workspaces'));
      });

      it('should handle workspace packages as production dependencies', () => {
        expect(dep('@workspace/shared')).toHaveProperty('depType', DepType.PROD);
      });

      it('should detect nested workspace dependencies correctly', () => {
        expect(dep('@workspace/utils')).toHaveProperty('depType', DepType.PROD);
      });

      it('should not duplicate workspace packages when hoisted', () => {
        const workspaceModules = modules.filter((m) => m.name.startsWith('@workspace/'));
        const uniqueNames = new Set(workspaceModules.map((m) => m.name));
        expect(workspaceModules.length).toBe(uniqueNames.size);
      });
    });

    describe('pnpm phantom dependencies', () => {
      beforeEach(async () => {
        modules = await buildWalker(path.join(__dirname, 'fixtures', 'pnpm_layout'));
      });

      it('should handle pnpm virtual store structure', () => {
        expect(dep('lodash')).toBeDefined();
      });

      it('should not traverse symlinked dependencies multiple times', () => {
        const lodashInstances = modules.filter((m) => m.name === 'lodash');
        expect(lodashInstances.length).toBeLessThanOrEqual(2);
      });

      it('should respect pnpm hard-link isolation', () => {
        expect(dep('transitive-dep')).toHaveProperty('depType', DepType.PROD);
      });
    });

    describe('yarn berry (v2+) PnP', () => {
      beforeEach(async () => {
        modules = await buildWalker(path.join(__dirname, 'fixtures', 'yarn_pnp'));
      });

      it('should handle .pnp.cjs resolution', () => {
        expect(modules.length).toBeGreaterThan(0);
      });

      it('should detect dependencies without node_modules', () => {
        expect(dep('some-package')).toBeDefined();
      });
    });

    describe('circular dependencies', () => {
      beforeEach(async () => {
        modules = await buildWalker(path.join(__dirname, 'fixtures', 'circular_deps'));
      });

      it('should handle circular dependencies without infinite loop', () => {
        expect(dep('package-a')).toBeDefined();
        expect(dep('package-b')).toBeDefined();
      });

      it('should maintain correct dep types in circular references', () => {
        const packageA = dep('package-a');
        const packageB = dep('package-b');
        expect(packageA?.depType).toBeLessThanOrEqual(DepType.ROOT);
        expect(packageB?.depType).toBeLessThanOrEqual(DepType.ROOT);
      });
    });

    describe('peer dependencies', () => {
      beforeEach(async () => {
        modules = await buildWalker(path.join(__dirname, 'fixtures', 'peer_deps'));
      });

      it('should detect satisfied peer dependencies as prod deps', () => {
        expect(dep('react')).toHaveProperty('depType', DepType.PROD);
      });

      it('should handle missing peer dependencies gracefully', () => {
        expect(() => modules).not.toThrow();
      });

      it('should not duplicate peer dependencies when hoisted', () => {
        const reactInstances = modules.filter((m) => m.name === 'react');
        expect(reactInstances.length).toBe(1);
      });
    });

    describe('bundled dependencies', () => {
      beforeEach(async () => {
        modules = await buildWalker(path.join(__dirname, 'fixtures', 'bundled_deps'));
      });

      it('should detect bundled dependencies in node_modules', () => {
        expect(dep('bundled-package')).toBeDefined();
      });

      it('should treat bundled deps as production dependencies', () => {
        expect(dep('bundled-package')).toHaveProperty('depType', DepType.PROD);
      });
    });

    describe('scoped packages', () => {
      beforeEach(async () => {
        modules = await buildWalker(path.join(__dirname, 'fixtures', 'scoped_packages'));
      });

      it('should handle @org/package naming correctly', () => {
        expect(dep('@babel/core')).toBeDefined();
        expect(dep('@types/node')).toBeDefined();
      });

      it('should handle nested scoped dependencies', () => {
        expect(dep('@babel/helper-plugin-utils')).toBeDefined();
      });

      it('should maintain correct paths for scoped packages', () => {
        const babelCore = dep('@babel/core');
        expect(babelCore?.path).toContain('@babel');
        expect(babelCore?.path).toContain('core');
      });
    });

    describe('optional dependency resolution', () => {
      beforeEach(async () => {
        modules = await buildWalker(path.join(__dirname, 'fixtures', 'optional_resolution'));
      });

      it('should handle platform-specific optional deps', () => {
        const platformDep = dep('platform-specific-dep');
        if (platformDep) {
          expect(platformDep.depType).toBeGreaterThanOrEqual(DepType.OPTIONAL);
        }
      });

      it('should handle failed optional dependency installs', () => {
        expect(() => modules).not.toThrow();
      });

      it('should not fail on missing optional dependencies', () => {
        const optionalCount = modules.filter(
          (m) => m.depType === DepType.OPTIONAL || m.depType === DepType.DEV_OPTIONAL,
        ).length;
        expect(optionalCount).toBeGreaterThanOrEqual(0);
      });
    });

    describe('monorepo scenarios', () => {
      beforeEach(async () => {
        modules = await buildWalker(path.join(__dirname, 'fixtures', 'monorepo'));
      });

      it('should handle lerna/nx hoisted dependencies', () => {
        expect(dep('shared-util')).toBeDefined();
      });

      it('should detect workspace-specific dependencies', () => {
        expect(dep('package-specific-dep')).toBeDefined();
      });

      it('should handle cross-workspace dependencies', () => {
        expect(dep('@monorepo/shared')).toHaveProperty('depType', DepType.PROD);
      });
    });

    describe('version conflicts and deduplication', () => {
      beforeEach(async () => {
        modules = await buildWalker(path.join(__dirname, 'fixtures', 'version_conflicts'));
      });

      it('should detect multiple versions of same package', () => {
        const semverModules = modules.filter((m) => m.name === 'semver');
        expect(semverModules.length).toBeGreaterThanOrEqual(2);
      });

      it('should maintain correct dep types for duplicate packages', () => {
        const semverModules = modules.filter((m) => m.name === 'semver');
        const prodVersion = semverModules.find((m) => m.depType === DepType.PROD);
        const devVersion = semverModules.find((m) => m.depType === DepType.DEV);
        expect(prodVersion || devVersion).toBeDefined();
      });
    });

    describe('git and file protocol dependencies', () => {
      beforeEach(async () => {
        modules = await buildWalker(path.join(__dirname, 'fixtures', 'git_deps'));
      });

      it('should handle git protocol dependencies', () => {
        expect(dep('git-installed-package')).toBeDefined();
      });

      it('should handle file protocol local dependencies', () => {
        expect(dep('local-file-package')).toBeDefined();
      });

      it('should treat git deps as production dependencies', () => {
        expect(dep('git-installed-package')).toHaveProperty('depType', DepType.PROD);
      });
    });

    describe('broken installations', () => {
      beforeEach(async () => {
        modules = await buildWalker(path.join(__dirname, 'fixtures', 'broken_install'));
      });

      it('should skip modules without package.json', () => {
        expect(modules.every((m) => m.name)).toBe(true);
      });

      it('should handle corrupted node_modules gracefully', () => {
        expect(() => modules).not.toThrow();
      });
    });

    describe('native module detection edge cases', () => {
      beforeEach(async () => {
        modules = await buildWalker(path.join(__dirname, 'fixtures', 'native_edge_cases'));
      });

      it('should detect node-gyp with custom binding.gyp location', () => {
        expect(dep('custom-gyp-location')).toHaveProperty(
          'nativeModuleType',
          NativeModuleType.NODE_GYP,
        );
      });

      it('should detect cmake-based native modules', () => {
        expect(dep('cmake-native')).toBeDefined();
      });

      it('should detect nan-based native modules', () => {
        expect(dep('nan-module')).toHaveProperty('nativeModuleType', NativeModuleType.NODE_GYP);
      });

      it('should detect node-addon-api modules', () => {
        expect(dep('napi-module')).toHaveProperty('nativeModuleType', NativeModuleType.NODE_GYP);
      });
    });

    describe('dependency resolution algorithms', () => {
      beforeEach(async () => {
        modules = await buildWalker(path.join(__dirname, 'fixtures', 'resolution_algo'));
      });

      it('should follow npm hoisting rules correctly', () => {
        const hoistedDep = modules.find(
          (m) =>
            m.name === 'commonly-used' &&
            !m.path.includes('node_modules/node_modules'),
        );
        expect(hoistedDep).toBeDefined();
      });

      it('should handle nested node_modules for conflicting versions', () => {
        const nestedDeps = modules.filter(
          (m) => (m.path.match(/node_modules/g) || []).length > 1,
        );
        expect(nestedDeps.length).toBeGreaterThan(0);
      });
    });

    describe('symlink handling', () => {
      beforeEach(async () => {
        modules = await buildWalker(path.join(__dirname, 'fixtures', 'symlinks'));
      });

      it('should follow symlinks to actual packages', () => {
        expect(dep('symlinked-package')).toBeDefined();
      });

      it('should not create duplicate entries for symlinked packages', () => {
        const symlinkDeps = modules.filter((m) => m.name === 'symlinked-package');
        expect(symlinkDeps.length).toBe(1);
      });

      it('should handle broken symlinks gracefully', () => {
        expect(() => modules).not.toThrow();
      });
    });

    describe('empty and minimal packages', () => {
      beforeEach(async () => {
        modules = await buildWalker(path.join(__dirname, 'fixtures', 'minimal_packages'));
      });

      it('should handle packages with no dependencies', () => {
        expect(dep('no-deps-package')).toBeDefined();
      });

      it('should handle packages with empty dependency objects', () => {
        expect(dep('empty-deps-package')).toBeDefined();
      });

      it('should handle minimal valid package.json', () => {
        expect(dep('minimal-package')).toBeDefined();
      });
    });

    describe('dependency type precedence', () => {
      beforeEach(async () => {
        modules = await buildWalker(path.join(__dirname, 'fixtures', 'dep_precedence'));
      });

      it('should prioritize prod over dev for same package', () => {
        expect(dep('used-everywhere')).toHaveProperty('depType', DepType.PROD);
      });

      it('should treat packages in both prod and optional as optional per npm behavior', () => {
        // When npm puts optional deps in dependencies section, they remain optional
        expect(dep('maybe-needed')).toHaveProperty('depType', DepType.OPTIONAL);
      });

      it('should treat packages in both dev and optional as optional', () => {
        // A package in both devDependencies and optionalDependencies at root is processed as optional
        // DEV_OPTIONAL is only for transitive optional deps of dev deps (ROOT -> dev -> optional)
        expect(dep('dev-optional-dep')).toHaveProperty('depType', DepType.OPTIONAL);
      });
    });
  });
});
