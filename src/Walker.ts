import { existsSync } from 'node:fs';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';

import debug from 'debug';

import { DepType, depTypeGreater, childDepType } from './depTypes.js';
import { NativeModuleType } from './nativeModuleTypes.js';

export type VersionRange = string;
export interface PackageJSON {
  name: string;
  dependencies: { [name: string]: VersionRange };
  devDependencies: { [name: string]: VersionRange };
  optionalDependencies: { [name: string]: VersionRange };
}
export interface Module {
  path: string;
  depType: DepType;
  nativeModuleType: NativeModuleType;
  name: string;
}

const d = debug('flora-colossus');

export class Walker {
  private rootModule: string;
  private modules: Module[] = [];
  private walkHistory: Set<string> = new Set();

  constructor(modulePath: string) {
    if (!modulePath || typeof modulePath !== 'string') {
      throw new Error('modulePath must be provided as a string');
    }
    d(`creating walker with rootModule=${modulePath}`);
    this.rootModule = modulePath;
  }

  private relativeModule(rootPath: string, moduleName: string) {
    return path.resolve(rootPath, 'node_modules', moduleName);
  }

  private async loadPackageJSON(modulePath: string): Promise<PackageJSON | null> {
    const pJPath = path.resolve(modulePath, 'package.json');
    if (existsSync(pJPath)) {
      const pJ = JSON.parse(await fs.readFile(pJPath, 'utf-8'));
      if (!pJ.dependencies) pJ.dependencies = {};
      if (!pJ.devDependencies) pJ.devDependencies = {};
      if (!pJ.optionalDependencies) pJ.optionalDependencies = {};
      return pJ;
    }
    return null;
  }

  private async walkDependenciesForModuleInModule(
    moduleName: string,
    modulePath: string,
    depType: DepType,
  ) {
    let testPath = modulePath;
    let discoveredPath: string | null = null;
    let lastRelative: string | null = null;
    // Try find it while searching recursively up the tree
    while (!discoveredPath && this.relativeModule(testPath, moduleName) !== lastRelative) {
      lastRelative = this.relativeModule(testPath, moduleName);
      try {
        // Check if path exists (handles both regular files/dirs and valid symlinks)
        await fs.access(lastRelative);
        discoveredPath = lastRelative;
      } catch {
        // Try to check if it's a symlink (even if broken)
        try {
          await fs.lstat(lastRelative);
          // It exists as a symlink but target doesn't exist (broken symlink)
          d(`found broken symlink at ${lastRelative}, skipping`);
          return; // Skip broken symlinks gracefully
        } catch {
          // Path doesn't exist at all, continue searching up the tree
          if (path.basename(path.dirname(testPath)) !== 'node_modules') {
            testPath = path.dirname(testPath);
          }
          testPath = path.dirname(path.dirname(testPath));
        }
      }
    }
    // If we can't find it the install is probably buggered
    if (!discoveredPath && depType !== DepType.OPTIONAL && depType !== DepType.DEV_OPTIONAL) {
      throw new Error(
        `Failed to locate module "${moduleName}" from "${modulePath}"

        This normally means that either you have deleted this package already somehow (check your ignore settings if using electron-packager).  Or your module installation failed.`,
      );
    }
    // If we can find it let's do the same thing for that module
    if (discoveredPath) {
      await this.walkDependenciesForModule(discoveredPath, depType);
    }
  }

  private async detectNativeModuleType(
    modulePath: string,
    pJ: PackageJSON,
  ): Promise<NativeModuleType> {
    if (pJ.dependencies['prebuild-install']) {
      return NativeModuleType.PREBUILD;
    } else if (existsSync(path.join(modulePath, 'binding.gyp'))) {
      return NativeModuleType.NODE_GYP;
    }
    return NativeModuleType.NONE;
  }

  private async walkDependenciesForModule(modulePath: string, depType: DepType) {
    d('walk reached:', modulePath, ' Type is:', DepType[depType]);
    
    // Resolve symlinks to get the real path for proper duplicate detection
    let realPath = modulePath;
    try {
      realPath = await fs.realpath(modulePath);
    } catch (err) {
      // If realpath fails (e.g., broken symlink), log and return early
      d('failed to resolve path:', modulePath, err);
      return;
    }
    
    // We have already traversed this module (using real path to catch symlink cycles)
    if (this.walkHistory.has(realPath)) {
      d('already walked this route (real path)');
      // Find the existing module reference by real path
      const existingModule = this.modules.find((module) => module.path === realPath) as Module;
      // If the depType we are traversing with now is higher than the
      // last traversal then update it (prod superseeds dev for instance)
      if (depTypeGreater(depType, existingModule.depType)) {
        d(
          `existing module has a type of "${existingModule.depType}", new module type would be "${depType}" therefore updating`,
        );
        existingModule.depType = depType;
      }
      return;
    }

    const pJ = await this.loadPackageJSON(realPath);
    // If the module doesn't have a package.json file it is probably a
    // dead install from yarn (they dont clean up for some reason)
    if (!pJ) {
      d('walk hit a dead end, this module is incomplete');
      return;
    }

    // Record this module as being traversed (using real path)
    this.walkHistory.add(realPath);
    this.modules.push({
      depType,
      nativeModuleType: await this.detectNativeModuleType(realPath, pJ),
      path: realPath,
      name: pJ.name,
    });

    // For every prod dep
    for (const moduleName in pJ.dependencies) {
      // npm decides it's a funny thing to put optional dependencies in the "dependencies" section
      // after install, because that makes perfect sense
      if (moduleName in pJ.optionalDependencies) {
        d(`found ${moduleName} in prod deps of ${realPath} but it is also marked optional`);
        continue;
      }
      await this.walkDependenciesForModuleInModule(
        moduleName,
        realPath,
        childDepType(depType, DepType.PROD),
      );
    }

    // For every optional dep
    for (const moduleName in pJ.optionalDependencies) {
      await this.walkDependenciesForModuleInModule(
        moduleName,
        realPath,
        childDepType(depType, DepType.OPTIONAL),
      );
    }

    // For every dev dep, but only if we are in the root module
    if (depType === DepType.ROOT) {
      d("we're still at the beginning, walking down the dev route");
      for (const moduleName in pJ.devDependencies) {
        await this.walkDependenciesForModuleInModule(
          moduleName,
          realPath,
          childDepType(depType, DepType.DEV),
        );
      }
    }
  }

  private cache: Promise<Module[]> | null = null;
  async walkTree() {
    d('starting tree walk');
    if (!this.cache) {
      this.cache = new Promise<Module[]>(async (resolve, reject) => {
        this.modules = [];
        try {
          await this.walkDependenciesForModule(this.rootModule, DepType.ROOT);
        } catch (err) {
          reject(err);
          return;
        }
        resolve(this.modules);
      });
    } else {
      d('tree walk in progress / completed already, waiting for existing walk to complete');
    }
    return await this.cache;
  }

  public getRootModule() {
    return this.rootModule;
  }
}
