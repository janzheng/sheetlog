# Publishing Sheetlog

This package is configured to work with both NPM (Node.js) and JSR/Deno registries.

## Changes Made

### 1. Fixed `index.mjs` for Deno compatibility
- Updated the constructor to preserve `sheetUrl` parameter instead of overwriting it
- Added Deno-specific environment variable handling using `Deno.env.get()`
- Made the code work in both Node.js and Deno environments

### 2. Updated `package.json` for NPM
- Added `"type": "module"` for ES module support
- Added proper `exports` field for modern Node.js
- Added `files` field to specify what gets published
- Added `repository` field for better NPM page

### 3. Updated `deno.json` for JSR/Deno
- Added `version` and `license` fields (required for JSR)
- Added `publish` configuration with include/exclude rules
- Organized tasks with test as the primary task

## Testing

Both runtimes are tested with the same `test.js` file:

```bash
# Test with Deno
deno task test

# Test with Node.js
npm test
```

## Publishing

### To NPM (Node.js ecosystem)
```bash
npm publish --access public
```

### To JSR (Deno ecosystem)
```bash
# First time setup (if not already done)
deno install -A jsr:@deno/publish

# Publish to JSR
deno publish
```

Or use the newer `deno publish` command directly (Deno 1.42+):
```bash
deno publish --allow-slow-types
```

## Usage

### In Node.js projects
```javascript
import { Sheetlog } from '@yawnxyz/sheetlog';

const logger = new Sheetlog({
  sheetUrl: 'YOUR_SHEET_URL',
  sheet: 'Logs'
});

await logger.log({ message: 'Hello from Node!' });
```

### In Deno projects
```typescript
import { Sheetlog } from 'jsr:@yawnxyz/sheetlog';
// or from npm
import { Sheetlog } from 'npm:@yawnxyz/sheetlog';

const logger = new Sheetlog({
  sheetUrl: 'YOUR_SHEET_URL',
  sheet: 'Logs'
});

await logger.log({ message: 'Hello from Deno!' });
```

## Environment Variables

The package supports loading sheet URLs from environment variables:

- **Deno**: Reads from `Deno.env.get('SHEET_URL')`
- **Node.js**: Reads from `process.env.SHEET_URL` (via dotenv if available)

If you pass `sheetUrl` directly to the constructor, it takes precedence over environment variables.

