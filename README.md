Flora Colossus
-----------

> Walk your node_modules tree

## Installation

```bash
npm i --save-dev flora-colossus
```

## API

### Enum: `DepType`

```js
import { DepType } from 'flora-colossus';

// DepType.PROD --> Production dependency
// DepType.OPTIONAL --> Optional dependency
// DepType.DEV --> Development dependency
// DepType.DEV_OPTIONAL --> Optional dependency of a development dependency
// DepType.ROOT --> The root module
```

####

### Class: `Walker`

```js
import { Walker } from 'flora-colossus';

// modulePath is the root folder of your module
const walker = new Walker(modulePath);
```

#### `walker.walkTree()`

Returns `Promise<Module[]>`

Will walk your entire node_modules tree reporting back an array of "modules", each
module has a "path", "name" and "depType".  See the typescript definition file
for more information.

## Testing with pnpm

To test with pnpm, switch the definition in `package.json#scripts#pretest` to `npm run pretest:pnpm`. instead of `npm run pretest:yarn`.

You may notice that we use a particular version of pnpm when testing, this is because
it may complain about the lockfile not being in sync with the package.json and fail.
This seems to be a bug in pnpm because it won't use the different but compatible lockfile when
`--frozen-lockfile` is specified.

For now, you can just force a particular pnpm version to run the tests like we did.

```sh
pnpx pnpm@~6.1 install
pnpx pnpm@~6.1 run test
```
