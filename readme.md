# Sheetlog

[![NPM Version](https://img.shields.io/npm/v/@yawnxyz/sheetlog)](https://www.npmjs.com/package/@yawnxyz/sheetlog)
[![JSR](https://jsr.io/badges/@yawnxyz/sheetlog)](https://jsr.io/@yawnxyz/sheetlog)

> **⚠️ Breaking Change in v0.1.13:** Sheetlog now uses **named exports**. Update your imports from `import sheet from '@yawnxyz/sheetlog'` to `import { Sheetlog } from '@yawnxyz/sheetlog'`

Sheetlog is a a logging system that turns any Google Sheet into a database.

It's very helpful for logging console data, record form responses, or store LLM outputs for evaluation outputs.

It also supports authentication and full CRUD operations, turning your Google Sheet into a full-fledged database.

Since Sheets supports up to roughly 200,000 cells per sheet, this makes Sheetlog perfect for toy projects and MVPs that need a "faux", persisted "database". Think of it as a lighter alternative to Notion Database or Airtable, as opposed to something like Firebase or Supabase.

The Google Sheets API is prone to rate limiting and slow cold starts, so is not ideal for high-traffic or fast applications.

Sheetlog is built on top of the excellent [SpreadAPI](https://spreadapi.roombelt.com/) library, which is a Google Apps Script library that turns any Google Sheets into a data store.

Here's a [live demo and usage guide](https://sheetlog.deno.dev/)


## Installation

Sheetlog is available for both **Node.js/NPM** and **Deno/JSR** ecosystems.

### For Node.js (NPM)

```bash
npm install @yawnxyz/sheetlog
# or
yarn add @yawnxyz/sheetlog
```

### For Deno (JSR)

```bash
deno add @yawnxyz/sheetlog
# or import directly
import { Sheetlog } from "jsr:@yawnxyz/sheetlog";
```

You can also use the NPM package in Deno:
```typescript
import { Sheetlog } from "npm:@yawnxyz/sheetlog";
```

### Google Sheets Setup

1. Create a Google Sheet
2. Follow the [installation instructions for SpreadAPI](https://spreadapi.roombelt.com/setup)
3. Replace the default script with the custom script (`sheetlog.js`) in this repo
4. Make sure to change the appropriate authentication for your app — the default is fully open.
5. Deploy the app per installation instructions, and get the custom URL.
6. Set that URL to `.env.SHEET_URL` to your deployed SpreadAPI Apps Script, or pass it directly in the constructor
7. Create a new Google Sheets tab named "Logs"
8. Now you can log any object to your sheet!

## Usage

### Quick Start

**⚠️ Important: Sheetlog uses a named export!**

```javascript
// ✅ Correct - Named import
import { Sheetlog } from '@yawnxyz/sheetlog';

// ❌ Incorrect - Default import won't work
// import sheet from '@yawnxyz/sheetlog';
```

#### For Node.js/NPM

```javascript
import { Sheetlog } from '@yawnxyz/sheetlog';

// Initialize the sheet logger
const logger = new Sheetlog({
  sheetUrl: "https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec",
  sheet: "testSheet"  // Optional, defaults to "Logs"
});

// Log data to your sheet
const result = await logger.log({
  Name: "John Doe",
  Email: "john@example.com"
});
```

#### For Deno

```typescript
import { Sheetlog } from "jsr:@yawnxyz/sheetlog";
// or: import { Sheetlog } from "npm:@yawnxyz/sheetlog";

const logger = new Sheetlog({
  sheetUrl: "https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec",
  sheet: "testSheet"
});

const result = await logger.log({
  Name: "Jane Doe",
  Email: "jane@example.com"
});
```

#### Using Environment Variables

You can also set the sheet URL via environment variables:

**Node.js** (`.env` file):
```bash
SHEET_URL=https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec
```

**Deno** (set in shell or use `--env` flag):
```bash
export SHEET_URL=https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec
```

Then initialize without the URL:
```javascript
import { Sheetlog } from '@yawnxyz/sheetlog';

const logger = new Sheetlog({
  sheet: "testSheet"  // Will use SHEET_URL from environment
});
```

This adds the data to the `Name` column of the `testSheet`. 


### Import Note

**Sheetlog uses named exports.** Always import using:
```javascript
import { Sheetlog } from '@yawnxyz/sheetlog';
```

The package also exports `SheetlogSchema` for type validation if needed:
```javascript
import { Sheetlog, SheetlogSchema } from '@yawnxyz/sheetlog';
```

### Basic Methods

#### .log(payload, options)
The `.log` function is the core method used to interact with the sheet. It accepts:
- `payload`: The data to be logged (object or array)
  - Can be a single object or array of objects with any schema
  - Nested objects/arrays will be JSON stringified into a single cell, not spread across columns
  - Example: `{ name: "John", details: { age: 30, city: "NY" } }` → "details" column will contain the stringified object
- `options`: Configuration object including:
  - `sheet`: Sheet name (defaults to "Logs")
  - `sheetUrl`: Optional custom sheet URL
  - `method`: Request method (defaults to "POST")
  - `id`: Row ID for operations like GET/PUT
  - `idColumn`: Column name for UPSERT operations
  - `partialUpdate`: (boolean) If true, only updates the specified fields in the row, rather than replacing the entire row
  - Additional parameters specific to each method

Example:
```javascript
import { Sheetlog } from '@yawnxyz/sheetlog';

const logger = new Sheetlog({
  sheetUrl: "YOUR_SHEET_URL"
});

const payload = { name: 'John', age: 30 };
await logger.log(payload, { 
  sheet: 'Users'
});
```

#### .get(id, options)
Retrieves data from the sheet. Can fetch single rows or multiple with pagination.

Example of single row:
```javascript
import { Sheetlog } from '@yawnxyz/sheetlog';
const logger = new Sheetlog({ sheetUrl: "YOUR_SHEET_URL" });

// Get row with ID 123
const row = await logger.get(123);
```

Example of multiple rows:
```javascript
// Get multiple rows with options
const rows = await logger.get(null, {
  method: "GET",
  limit: 10,
  start_id: 100,
  order: "desc"
});
```

#### .post(payload, options)
Creates new rows in the sheet. Automatically adds timestamp in "Date Modified" column.

```javascript
import { Sheetlog } from '@yawnxyz/sheetlog';
const logger = new Sheetlog({ sheetUrl: "YOUR_SHEET_URL" });

const result = await logger.post({ 
  name: 'Jane',
  email: 'jane@example.com'
}, {
  sheet: 'Users'
});
```

#### .upsert(idColumn, id, payload, options)
Updates existing row or creates new one if not found. Uses specified column as unique identifier.

```javascript
import { Sheetlog } from '@yawnxyz/sheetlog';
const logger = new Sheetlog({ sheetUrl: "YOUR_SHEET_URL" });

const result = await logger.upsert(
  'email',                    // idColumn
  'jane@example.com',        // id
  { status: 'active' },      // payload
  { sheet: 'Users' }         // options
);
```

#### .find(idColumn, id, returnAllMatches, options)
Searches for rows matching the specified criteria. Returns single object or array based on returnAllMatches.

```javascript
// Find single match
const user = await sheet.find(
  'email',                    // idColumn
  'jane@example.com',        // id
  false                      // returnAllMatches
);

// Find all matches
const users = await sheet.find(
  'status',                  // idColumn
  'active',                  // id
  true                      // returnAllMatches
);
```

#### .dynamicPost(payload, options)
Adds new rows and automatically creates new columns for any new fields in the payload.

```javascript
const result = await sheet.dynamicPost({
  name: 'Alice',
  newField: 'value',      // Creates column if doesn't exist
  nested: { foo: 'bar' }  // Will be JSON stringified
}, {
  sheet: 'Users'
});
```

#### .paginatedGet(options)
Provides cursor-based pagination for large datasets.

```javascript
const results = await sheet.paginatedGet({
  cursor: "100",           // Starting point
  limit: 20,              // Items per page
  sortBy: "Date Modified", // Sort column
  sortDir: "desc",        // Sort direction
  sheet: "Users"
});
```

#### .rangeUpdate(data, options)
Efficiently updates multiple cells in a range.

```javascript
const result = await sheet.rangeUpdate([
  ["A1", "B1", "C1"],
  ["A2", "B2", "C2"]
], {
  sheet: "Users",
  startRow: 2,
  startCol: 3
});
```

#### .aggregate(column, operation, options)
Performs calculations on numeric columns.

```javascript
const result = await sheet.aggregate(
  "amount",           // column
  "sum",             // operation: sum, avg, min, max, count
  {
    sheet: "Sales",
    where: { status: "completed" }
  }
);
```

#### .getSheets()
Returns information about all sheets in the spreadsheet.

```javascript
const sheets = await sheet.getSheets();
// Returns array of sheet names and metadata
```

#### .getCSV(options)
Exports a specific sheet as CSV format.

```javascript
const csvData = await sheet.getCSV({
  sheet: "Users"
});
```

#### .getColumns(options)
Retrieves specific columns from the sheet. Can fetch single or multiple columns, including formulas and formatting.

**Parameters:**
- `sheet`: The name of the sheet
- `startColumn`: The starting column identifier (e.g., "A", "G", or 1)
- `endColumn`: (Optional) The ending column identifier
- `includeFormulas`: (Optional) Get the actual formulas in cells instead of computed values
- `includeFormatting`: (Optional) Include cell formatting information

```javascript
// Get columns with formulas
const columnsWithFormulas = await sheet.getColumns({
  sheet: "Users",
  startColumn: "B",
  endColumn: "D",
  includeFormulas: true
});

// Get columns with full formatting
const columnsWithFormatting = await sheet.getColumns({
  sheet: "Users",
  startColumn: "B",
  endColumn: "D",
  includeFormulas: true,
  includeFormatting: true  // Includes backgrounds, fonts, alignments, etc.
});
```

#### .getAllCells(options)
Retrieves all cells and data from a specified sheet, with comprehensive formatting information.

**Parameters:**
- `sheet`: The name of the sheet
- `includeFormulas`: (Optional, defaults to true) Include cell formulas
- `includeFormatting`: (Optional, defaults to true) Include full cell formatting

```javascript
// Get all cells with complete information
const allData = await sheet.getAllCells({
  sheet: "testSheet",
  includeFormulas: true,
  includeFormatting: true
});

// Response includes:
{
  values: [...],           // Cell values
  formulas: [...],        // Original formulas
  backgrounds: [...],     // Cell background colors
  fontColors: [...],      // Text colors
  numberFormats: [...],   // Number formatting
  fontFamilies: [...],    // Font families
  fontSizes: [...],       // Font sizes
  fontStyles: [...],      // Font styles (bold, italic, etc.)
  horizontalAlignments: [...],  // Text alignment
  verticalAlignments: [...],    // Vertical alignment
  wraps: [...],           // Text wrapping
  lastColumn: 10,         // Last used column
  lastRow: 100           // Last used row
}
```

#### .getRows(options)
Retrieves specific rows from the sheet. Can fetch single or multiple rows.

```javascript
const rows = await sheet.getRows({
  sheet: "Users",
  startRow: 2,    // Row 1 is typically headers
  endRow: 10
});
```

#### .getRange(payload, options)
Retrieves data from a specified range with flexible empty cell handling.

```javascript
// Basic range retrieval
const result = await sheet.getRange({}, {
  sheet: "Sheet1",
  startRow: 2,
  startCol: 3
});

// Stop at first empty row or column
const result = await sheet.getRange({}, {
  sheet: "Sheet1",
  startRow: 2,
  startCol: 3,
  stopAtEmptyRow: true,    // Stop when encountering an empty row
  stopAtEmptyColumn: true  // Stop when encountering an empty column
});

// Skip empty rows and columns
const result = await sheet.getRange({}, {
  sheet: "Sheet1",
  startRow: 2,
  startCol: 3,
  skipEmptyRows: true,     // Skip any empty rows in the range
  skipEmptyColumns: true   // Skip any empty columns in the range
});
```

#### .getDataBlock(payload, options)
Automatically finds and retrieves a contiguous block of data within a search range. Useful for finding data that's not aligned to A1.

```javascript
// Find data block anywhere in first 99 rows and 26 columns (A-Z)
const result = await sheet.getDataBlock({}, {
  sheet: "Sheet1",
  searchRange: {
    startRow: 1,
    startCol: 1,
    endRow: 99,
    endCol: 26
  }
});
```

### Column Management

```javascript
// Add new column
sheet.log(null, {
  method: "ADD_COLUMN",
  columnName: "newColumn"
});

// Rename column
sheet.log(null, {
  method: "EDIT_COLUMN",
  oldColumnName: "oldName",
  newColumnName: "newName"
});

// Remove column
sheet.log(null, {
  method: "REMOVE_COLUMN",
  columnName: "columnToRemove"
});
```


## Features

- Simple logging interface with `sheet.log()`
- Automatic timestamp tracking with "Date Modified" column
- Dynamic column creation
- JSON object serialization for nested data
- Multiple authentication methods
- Pagination support
- Bulk operations
- Aggregation functions
- Data export options
- Custom sheet management

## Authentication

Sheetlog supports flexible authentication patterns:

```javascript
const logger = new Sheetlog({
  users: [
    // Admin with full access
    {
      name: "admin",
      key: "myStr0ng!Pass",  // Strong password required
      permissions: "*"       // ALL access
    },

    // Power user with mixed permissions
    {
      name: "poweruser",
      key: "P0wer!User",
      permissions: {
        logs: ["GET", "POST"],     // Multiple methods for one sheet
        analytics: "GET",          // Single method for one sheet
        config: ["PUT", "DELETE"]  // Multiple methods for another sheet
      }
    },

    // Read-only user
    {
      name: "viewer",
      key: "V1ewer!Pass",
      permissions: {
        public: "GET",
        reports: "GET"
      }
    }
  ]
});
```

### Authentication Requirements

Keys must be:
- 8+ characters long
- Include lowercase, uppercase, number, and special character
- Can be marked as `UNSAFE()` to bypass security requirements (development only)

## Available Methods

To run these folllowing methods, set the `method` key in the payload for the desired method when using `sheet.log()`.

For example, to run `GET_ROWS`:
```javascript
sheet.log(null, {
  method: "GET_ROWS",
  sheet: "testSheet",
  startRow: 1,
  endRow: 9099
});
```

| Method | Description |
|--------|-------------|
| GET | Fetch single or multiple rows |
| POST | Create new rows |
| PUT | Update existing rows |
| DELETE | Remove rows |
| UPSERT | Create or update based on ID |
| DYNAMIC_POST | Create rows with dynamic columns |
| ADD_COLUMN | Add new columns |
| EDIT_COLUMN | Rename columns |
| REMOVE_COLUMN | Delete columns |
| FIND | Search for specific values |
| BULK_DELETE | Remove multiple rows |
| PAGINATED_GET | Get rows with pagination |
| EXPORT | Export data in different formats |
| AGGREGATE | Perform calculations on columns |
| BATCH_UPDATE | Update multiple rows efficiently |
| GET_SHEETS | Get information about all sheets in the spreadsheet |
| GET_CSV | Export a specific sheet as CSV |


### Retrieve Specific Rows

You can retrieve specific rows from a Google Sheet using the `GET_ROWS` method. This method allows you to specify a range of rows to fetch.

**Parameters:**
- `sheet`: The name of the sheet.
- `startRow`: The starting row number (1-indexed).
- `endRow`: (Optional) The ending row number. If not provided, only the `startRow` will be retrieved.

**Example:**
```javascript
{
  method: "GET_ROWS",
  sheet: "logs",
  startRow: 2,
  endRow: 5
}
```

### Retrieve Specific Columns

You can retrieve specific columns from a Google Sheet using the `GET_COLUMNS` method. This method allows you to specify a range of columns to fetch by their letter or number.

**Parameters:**
- `sheet`: The name of the sheet.
- `startColumn`: The starting column identifier (e.g., "A", "G", or 1).
- `endColumn`: (Optional) The ending column identifier. If not provided, only the `startColumn` will be retrieved.

**Example:**
```javascript
{
  method: "GET_COLUMNS",
  sheet: "logs",
  startColumn: "A",
  endColumn: "C"
}
```


## Method Index & Examples

```javascript
// Fetch all
{
  "method": "GET",
  "sheet": "testSheet"
}

// Fetch the first row of data (row 1 is the header row since Sheets is 1-indexed)
{
  "method": "GET",
  "sheet": "testSheet",
  "id": 2
}

// Fetch multiple rows with pagination
{
  "method": "GET",
  "sheet": "links",
  "start_id": 2,
  "limit": 5
}

// Create a new row
{
  "method": "POST",
  "sheet": "users",
  "payload": {
    "name": "John Doe",
    "email": "john@example.com"
  }
}

// Create or update a row based on ID
{
  "method": "UPSERT",
  "sheet": "users",
  "idColumn": "userId",
  "id": 123,
  "partialUpdate": true,
  "payload": {
    "name": "Jane Doe",
    "email": "jane@example.com"
  }
}

// Create rows with dynamic columns
{
  "method": "DYNAMIC_POST",
  "sheet": "data",
  "payload": {
    "newField": "newValue",
    "anotherField": "anotherValue"
  }
}

// Update specific fields in a row
{
  "method": "PUT",
  "sheet": "users",
  "id": 123,
  "payload": {
    "email": "newemail@example.com"
  }
}

// Delete a specific row
{
  "method": "DELETE",
  "sheet": "users",
  "id": 123
}

// Add a new column to the sheet
{
  "method": "ADD_COLUMN",
  "sheet": "users",
  "columnName": "newColumn"
}

// Rename an existing column
{
  "method": "EDIT_COLUMN",
  "sheet": "users",
  "oldColumnName": "oldName",
  "newColumnName": "newName"
}

// Remove a column from the sheet
{
  "method": "REMOVE_COLUMN",
  "sheet": "users",
  "columnName": "columnToRemove"
}

// Find rows by a specific column value
{
  "method": "FIND",
  "sheet": "users",
  "idColumn": "email",
  "id": "john@example.com",
  "returnAllMatches": true
}

// Bulk delete multiple rows
{
  "method": "BULK_DELETE",
  "sheet": "users",
  "ids": [1, 2, 3, 4]
}

// Get rows with pagination
{
  "method": "PAGINATED_GET",
  "sheet": "logs",
  "limit": 20,
  "cursor": "100",
  "sortBy": "timestamp",
  "sortDir": "desc"
}

// Export data in a specific format
{
  "method": "EXPORT",
  "sheet": "logs",
  "format": "csv"
}

// Perform aggregation on a column
{
  "method": "AGGREGATE",
  "sheet": "sales",
  "column": "amount",
  "operation": "sum"
}

// Batch update multiple rows
{
  "method": "BATCH_UPDATE",
  "sheet": "logs",
  "payload": [
    { "_id": 1, "status": "complete" },
    { "_id": 2, "status": "pending" }
  ]
}

// Fetch specific rows
{
  "method": "GET_ROWS",
  "sheet": "testSheet",
  "startRow": 2,
  "endRow": 10
}

// Fetch specific columns
{
  "method": "GET_COLUMNS",
  "sheet": "testSheet",
  "startColumn": "B",
  "endColumn": "D"
}

// Fetch a single column
{
  "method": "GET_COLUMNS",
  "sheet": "testSheet",
  "startColumn": "G"
}

// Fetch all cells and data in the sheet
{
  "method": "GET_ALL_CELLS",
  "sheet": "testSheet"
}

// Update a range of cells
{
  "method": "RANGE_UPDATE",
  "sheet": "dynamicSheet", 
  "startRow": 2,
  "startCol": 3,
  "data": [
    ["A1", "B1", "C1"],
    ["A2", "B2", "C2"],
    ["A3", "B3", "C3"]
  ]
}

// Get information about all sheets
{
  "method": "GET_SHEETS"
}

// Get CSV export of a specific sheet
{
  "method": "GET_CSV",
  "sheet": "testSheet"
}

// Get range with empty handling
{
  "method": "GET_RANGE",
  "sheet": "Sheet1",
  "startRow": 2,
  "startCol": 3,
  "stopAtEmptyRow": true,
  "stopAtEmptyColumn": true,
  "skipEmptyRows": true,
  "skipEmptyColumns": true
}

// Find data block
{
  "method": "GET_DATA_BLOCK",
  "sheet": "Sheet1",
  "searchRange": {
    "startRow": 1,
    "startCol": 1,
    "endRow": 99,
    "endCol": 26
  }
}

// Get columns with formulas
{
  "method": "GET_COLUMNS",
  "sheet": "testSheet",
  "startColumn": "B",
  "endColumn": "D",
  "includeFormulas": true
}

// Get columns with full formatting
{
  "method": "GET_COLUMNS",
  "sheet": "testSheet",
  "startColumn": "B",
  "endColumn": "D",
  "includeFormulas": true,
  "includeFormatting": true
}

// Get all cells with complete information
{
  "method": "GET_ALL_CELLS",
  "sheet": "testSheet",
  "includeFormulas": true,
  "includeFormatting": true
}

// Get all cells (values only)
{
  "method": "GET_ALL_CELLS",
  "sheet": "testSheet",
  "includeFormulas": false,
  "includeFormatting": false
}

### Authentication & Security

#### Strong Password Requirements
Keys (passwords) must meet the following criteria:
- Minimum 8 characters
- Include at least one lowercase letter
- Include at least one uppercase letter
- Include at least one number
- Include at least one special character
- Can be marked as `UNSAFE()` to bypass security requirements (development only)

```javascript
const logger = new Sheetlog({
  users: [
    // Strong password example
    {
      name: "admin",
      key: "myStr0ng!Pass",  // Meets all requirements
      permissions: "*"
    },
    
    // Unsafe password example (development only)
    {
      name: "dev",
      key: { __unsafe: "simple" },  // Bypasses requirements
      permissions: "*"
    }
  ]
});
```

### Data Aggregation

#### .aggregate(column, operation, options)
Performs calculations on numeric columns.

**Operations:**
- `sum`: Total of all values
- `avg`: Average of values
- `min`: Minimum value
- `max`: Maximum value
- `count`: Count of numeric values

```javascript
const result = await sheet.aggregate(
  "amount",           // column
  "sum",             // operation: sum, avg, min, max, count
  {
    sheet: "Sales",
    where: { status: "completed" }  // Optional filter
  }
);
```

### Batch Operations

#### .batchUpdate(updates, options)
Efficiently updates multiple rows in a single operation.

```javascript
const result = await sheet.batchUpdate([
  { _id: 1, status: "complete", amount: 100 },
  { _id: 2, status: "pending", amount: 200 }
], {
  sheet: "Orders"
});
```

### Column Management

#### .addColumn(columnName, options)
Adds a new column to the sheet.

```javascript
const result = await sheet.addColumn("newColumn", {
  sheet: "Users"
});
```

#### .editColumn(oldName, newName, options)
Renames an existing column.

```javascript
const result = await sheet.editColumn(
  "oldName",
  "newName",
  { sheet: "Users" }
);
```

#### .removeColumn(columnName, options)
Removes a column from the sheet.

```javascript
const result = await sheet.removeColumn("columnToRemove", {
  sheet: "Users"
});
```

### Bulk Operations

#### .bulkDelete(ids, options)
Removes multiple rows in a single operation.

```javascript
const result = await sheet.bulkDelete([1, 2, 3, 4], {
  sheet: "Users"
});
```

## Changelog

### v0.1.13 (2024)
- **Breaking Change**: Switched from default export to named export
  - Old: `import sheet from '@yawnxyz/sheetlog'`
  - New: `import { Sheetlog } from '@yawnxyz/sheetlog'`
- Added full Deno/JSR support
- Fixed constructor logic to properly handle `sheetUrl` parameter
- Added support for both `Deno.env` and `process.env` for environment variables
- Updated `package.json` to use `"type": "module"` for better ES module support
- Added proper exports configuration for modern bundlers
- Both Node.js and Deno environments now fully tested and supported

### v0.1.12 and earlier
- Initial releases with Google Sheets logging functionality
- Full CRUD operations support
- Authentication and permissions system
- Multiple data retrieval methods
