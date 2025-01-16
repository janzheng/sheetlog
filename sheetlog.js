/*
 * Sheetlog - A Google Sheets Logging System
 * Copyright (c) 2024 Jan Zheng
 * 
 * This work is licensed under Apache License 2.0
 * 
 * This work contains modified portions of SpreadAPI 1.0,
 * originally created by Mateusz Zieliński (https://spreadapi.com)
 * 
 * You may use this software according to either license.
 * For the Apache 2.0 licensed portions, you can find the full text at:
 * http://www.apache.org/licenses/LICENSE-2.0
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED,
 * INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR
 * PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE
 * FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE,
 * ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */


/*
 * Authentication Configuration Guide
 * 
 * Sheetlog supports flexible authentication patterns:
 * 
 * 1. Method-level permissions:
 *    - GET: Read access to fetch rows
 *    - POST: Create new rows
 *    - PUT: Update existing rows
 *    - DELETE: Remove rows
 *    - UPSERT: Create or update based on ID
 *    - DYNAMIC_POST: Create rows with dynamic columns
 *    - ADD_COLUMN: Add new columns
 *    - EDIT_COLUMN: Rename columns
 *    - REMOVE_COLUMN: Delete columns
 *    - FIND: Search for specific values
 *    - BULK_DELETE: Remove multiple rows at once
 *    - BATCH_UPDATE: Update multiple rows efficiently
 *    - PAGINATED_GET: Get rows with cursor-based pagination
 *    - AGGREGATE: Perform calculations on columns
 *    - EXPORT: Export data in different formats
 *    - ALL: Full access (*)
 * 
 * 2. Sheet-specific permissions:
 *    - Single sheet: { sheetName: METHOD }
 *    - Multiple sheets: { sheet1: METHOD1, sheet2: METHOD2 }
 *    - All sheets: ALL
 * 
 * 3. Key security:
 *    - Strong keys: Must be 8+ chars with lowercase, uppercase, number, and special char
 *    - Unsafe keys: Marked with UNSAFE() to bypass security requirements
 * 
 * Example Configuration:
 * 
 * const logger = new SheetlogScript({
 *   users: [
 *     // Admin with full access
 *     {
 *       name: "admin",
 *       key: "myStr0ng!Pass",
 *       permissions: "*"
 *     },
 * 
 *     // Power user with mixed permissions
 *     {
 *       name: "poweruser",
 *       key: "P0wer!User",
 *       permissions: {
 *         logs: ["GET", "POST"],
 *         analytics: "GET",
 *         config: ["PUT", "DELETE"]
 *       }
 *     },
 * 
 *     // Read-only user
 *     {
 *       name: "viewer",
 *       key: "V1ewer!Pass",
 *       permissions: {
 *         public: "GET",
 *         reports: "GET"
 *       }
 *     },
 * 
 *     // Write-only user
 *     {
 *       name: "writer",
 *       key: "Wr1ter!Pass",
 *       permissions: {
 *         submissions: "POST"
 *       }
 *     },
 * 
 *     // Development/testing access (unsafe)
 *     {
 *       name: "anonymous",
 *       key: { __unsafe: "" },
 *       permissions: "*"
 *     }
 *   ]
 * });
 * 
 * Available Methods:
 * 
 * GET: Fetch rows
 * - Single row: Provide row ID
 * - Multiple rows: Optional limit and start_id parameters
 * - Sorting: order=desc/asc parameter
 * 
 * PAGINATED_GET: Cursor-based pagination
 * - Required: cursor (optional), limit (default 10)
 * - Optional: sortBy (default 'Date Modified'), sortDir (default 'desc')
 * - Returns: rows, nextCursor, hasMore
 * 
 * POST: Create new rows
 * - Adds timestamp automatically
 * - Accepts single object or array of objects
 * 
 * BATCH_UPDATE: Update multiple rows efficiently
 * - Accepts array of updates: [{ _id, ...data }]
 * - Updates timestamp automatically
 * - More efficient than multiple PUT requests
 * 
 * BULK_DELETE: Remove multiple rows
 * - Accepts array of row IDs
 * - More efficient than multiple DELETE requests
 * 
 * AGGREGATE: Perform calculations on columns
 * - Operations: sum, avg, min, max, count
 * - Parameters: column, operation
 * - Optional: where conditions
 * 
 * EXPORT: Export data
 * - Formats: json, csv
 * - Optional: filtering and sorting
 * 
 * UPSERT: Create or update based on ID
 * - Requires idColumn and id parameters
 * - Updates if found, creates if not
 * 
 * DYNAMIC_POST: Flexible row creation
 * - Automatically adds new columns as needed
 * - Handles nested objects via JSON stringification
 * 
 * PUT: Update specific cells
 * - Requires row ID
 * - Updates only specified fields
 * 
 * DELETE: Remove rows
 * - Clears specified row
 * 
 * ADD_COLUMN: Create new column
 * - Adds column at end of sheet
 * - Requires columnName parameter
 * 
 * EDIT_COLUMN: Rename column
 * - Requires oldColumnName and newColumnName parameters
 * 
 * REMOVE_COLUMN: Delete column
 * - Requires columnName parameter
 * 
 * FIND: Search for matches
 * - Requires idColumn and id parameters
 * - Optional returnAllMatches parameter
 * 
 * Example Usage:
 * 
 * // Paginated Get
 * {
 *   method: "PAGINATED_GET",
 *   sheet: "logs",
 *   limit: 20,
 *   cursor: "100",
 *   sortBy: "timestamp",
 *   sortDir: "desc"
 * }
 * 
 * // Batch Update
 * {
 *   method: "BATCH_UPDATE",
 *   sheet: "logs",
 *   payload: [
 *     { _id: 1, status: "complete" },
 *     { _id: 2, status: "pending" }
 *   ]
 * }
 * 
 * // Aggregate
 * {
 *   method: "AGGREGATE",
 *   sheet: "sales",
 *   column: "amount",
 *   operation: "sum"
 * }
 * 
 * // Export
 * {
 *   method: "EXPORT",
 *   sheet: "logs",
 *   format: "csv"
 * }
 * 
 * // Bulk Delete
 * {
 *   method: "BULK_DELETE",
 *   sheet: "logs",
 *   ids: [1, 2, 3, 4]
 * }
 */





// To add better password protection for the sheet,
// you can use the following configurations for Sheetlog in both
// doGet() — which controls who can read the sheet and
// doPost() — which controls who can edit/write to the sheet

/*

const defaultLogger = new Sheetlog({
  users: [
    // Admin with full access to all sheets
    // { 
    //   name: "admin",
    //   key: "myStr0ng!Pass",  // Strong password required
    //   permissions: "*"       // ALL access
    // },

    // // Power user with mixed permissions
    // {
    //   name: "poweruser",
    //   key: "P0wer!User",
    //   permissions: {
    //     logs: ["GET", "POST"],     // Multiple methods for one sheet
    //     analytics: "GET",          // Single method for one sheet
    //     config: ["PUT", "DELETE"]  // Multiple methods for another sheet
    //   }
    // },

    // // Read-only user for specific sheets
    // {
    //   name: "viewer",
    //   key: "V1ewer!Pass",
    //   permissions: {
    //     public: "GET",
    //     reports: "GET"
    //   }
    // },

    // // Write-only user for one sheet
    // {
    //   name: "writer",
    //   key: "Wr1ter!Pass",
    //   permissions: {
    //     submissions: "POST"
    //   }
    // },

    // Unsafe anonymous access (for prototyping)
    {
      name: "anonymous",
      key: { __unsafe: "" },    // No password required
      permissions: "*"          // Full access
    }
  ]
});

*/

// Configuration flag for automatic timestamp updating
const ENABLE_AUTO_TIMESTAMPS = false;


class SheetlogScript {
  constructor(config = {}) {
    this.users = [];
    
    // Initialize with default anonymous access if no config provided
    if (Object.keys(config).length === 0) {
      // this.addUser("anonymous", this.UNSAFE(""), this.ALL());
      this.addUser("anonymous", { __unsafe: "" }, "*");
    } else {
      // Handle custom configuration
      if (config.users) {
        config.users.forEach(user => {
          this.addUser(user.name, user.key, user.permissions);
        });
      }
    }
  }

  // Method Constants
  GET() { return "GET"; }
  POST() { return "POST"; }
  PUT() { return "PUT"; }
  DELETE() { return "DELETE"; }
  ALL() { return "*"; }
  UNSAFE(key) { return { __unsafe: key }; }


  data(status, data, params = {}) {
    const result = { status: status, data: data };
    for (const key in params) {
      if (params.hasOwnProperty(key)) {
        result[key] = params[key];
      }
    }
    return result;
  }

  // Sheet Handling Methods
  getHeaders(sheet) {
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    for (let i = headers.length - 1; i >= 0; i--) {
      if (!this.isEmpty(headers[i])) return headers.slice(0, i + 1);
    }
    return [];
  }

  addNewColumnsIfNeeded(sheet, objects) {
    const existingHeaders = this.getHeaders(sheet);
    const newColumns = [];

    // Ensure "Date Modified" is always the first column
    if (existingHeaders[0] !== "Date Modified") {
      sheet.insertColumnBefore(1);
      sheet.getRange(1, 1).setValue("Date Modified");
    }

    objects.forEach(obj => {
      Object.keys(obj).forEach(key => {
        if (!existingHeaders.includes(key) && !newColumns.includes(key)) {
          newColumns.push(key);
        }
      });
    });

    newColumns.forEach(columnName => {
      const lastColumn = sheet.getLastColumn();
      sheet.insertColumnAfter(lastColumn);
      sheet.getRange(1, lastColumn + 1).setValue(columnName);
    });
  }

  // Main Request Handler
  handleRequest(params) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    const sheetName = (params.sheet || "").toLowerCase();
    const _id = params.id == null ? null : +params.id;
    const method = (params["method"] || "GET").toUpperCase();
    const key = params.key || "";

    const id = params.id || "";
    const idColumn = params.idColumn || "";

    console.log("users: ", this.users);

    if (!this.hasAccess(key, sheetName, method)) {
      return this.error(401, "unauthorized!", { 
        users: this.users, 
        getUserWithKey: this.getUserWithKey(key),
        getPermissions: this.getPermissions(this.getUserWithKey(key), sheetName) || "no permissions??",
        hasAccess: this.hasAccess(key, sheetName, method),
        what: "what"
      });
    }

    if (!this.isStrongKey(key)) {
      return this.error(401, "weak_key", {
        message: "Authentication key should be at least 8 characters long " +
          "and contain at least one lower case, upper case, number and special character. " +
          "Update your password or mark it as UNSAFE. Refer to the documentation for details."
      });
    }

    const sheet = ss.getSheetByName(sheetName);

    if (!sheet) {
      return this.error(404, "sheet_not_found", { sheet: sheetName });
    }

    if (_id != null && _id <= 1) {
      return this.error(400, "row_index_invalid", { _id: _id });
    }

    const payload = params["payload"];

    switch (method) {
      case "GET":
        return _id != null
          ? this.handleGetSingleRow(sheet, _id)
          : this.handleGetMultipleRows(sheet, params);
      case "POST":
        return this.handlePost(sheet, payload);
      case "UPSERT":
        return this.handleUpsert(sheet, idColumn, id, payload);
      case "DYNAMIC_POST":
        return this.handleDynamicPost(sheet, payload);
      case "PUT":
        return this.handlePut(sheet, _id, payload);
      case "DELETE":
        return this.handleDelete(sheet, _id);
      case "ADD_COLUMN":
        return this.handleAddColumn(sheet, params.columnName);
      case "EDIT_COLUMN":
        return this.handleEditColumn(sheet, params.oldColumnName, params.newColumnName);
      case "REMOVE_COLUMN":
        return this.handleRemoveColumn(sheet, params.columnName);
      case "FIND":
        return this.handleFind(sheet, idColumn, id, params.returnAllMatches || false);
      case "BULK_DELETE":
        return this.handleBulkDelete(sheet, params);
      case "PAGINATED_GET":
        return this.handlePaginatedGet(sheet, params);
      case "EXPORT":
        return this.handleExport(sheet, params);
      case "AGGREGATE":
        return this.handleAggregate(sheet, params);
      case "BATCH_UPDATE":
        return this.handleBatchUpdate(sheet, payload);
      case "GET_ROWS":
        return this.handleGetRows(sheet, params);
      case "GET_COLUMNS":
        return this.handleGetColumns(sheet, params);
      case "GET_ALL_CELLS":
        return this.handleGetAllCells(sheet);
      case "RANGE_UPDATE":
        return this.handleRangeUpdate(sheet, params);
      case "GET_SHEETS":
        return this.handleGetSheets(ss);
      case "GET_CSV":
        return this.handleGetCSV(ss, params.sheet);
      case "GET_RANGE":
        return this.handleGetRange(sheet, params);
      case "GET_DATA_BLOCK":
        return this.handleGetDataBlock(sheet, params);
      default:
        return this.error(404, "unknown_method", { method: method });
    }
  }

  handleGetSingleRow(sheet, _id) {
    const lastColumn = sheet.getLastColumn();
    const headers = this.getHeaders(sheet);

    const rowData = sheet.getRange(_id, 1, 1, lastColumn).getValues()[0];
    const result = this.mapRowToObject(rowData, _id, headers);

    if (!result) {
      return this.error(404, "row_not_found", { _id: _id });
    }

    return this.data(200, result);
  }

  handleGetMultipleRows(sheet, params) {
    const lastColumn = sheet.getLastColumn();
    const headers = this.getHeaders(sheet);

    const firstRow = 2;
    const lastRow = sheet.getLastRow();
    const total = Math.max(lastRow - firstRow + 1, 0);
    const limit = params.limit != null ? +params.limit : total;

    const isAsc = typeof params.order !== "string" || params.order.toLowerCase() !== "desc";

    if (isNaN(limit) || limit < 0) {
      return this.error(404, "invalid_limit", { limit: limit });
    }

    let firstRowInPage = isAsc ? firstRow : lastRow - limit + 1;
    if (params.start_id != null) {
      const start_id = +params.start_id;

      if (start_id < firstRow || start_id > lastRow) {
        return this.error(404, "start_id_out_of_range", { start_id: start_id });
      }

      firstRowInPage = start_id - (isAsc ? 0 : limit - 1);
    }

    const lastRowInPage = Math.min(firstRowInPage + limit - 1, lastRow);
    firstRowInPage = Math.max(firstRowInPage, firstRow);

    if (firstRowInPage > lastRowInPage) {
      return this.data(200, []);
    }

    const rows = sheet
      .getRange(firstRowInPage, 1, lastRowInPage - firstRowInPage + 1, lastColumn)
      .getValues()
      .map((item, index) => this.mapRowToObject(item, firstRowInPage + index, headers));

    if (!isAsc) {
      rows.reverse();
    }

    let next = isAsc ? lastRowInPage + 1 : firstRowInPage - 1;
    if (next < firstRow || next > lastRow) next = undefined;

    return this.data(200, rows.filter(this.isTruthy), { next: next });
  }

  handlePost(sheet, payload) {
    const headers = this.getHeaders(sheet);
    const currentDate = new Date();
    const formattedDate = Utilities.formatDate(currentDate, Session.getScriptTimeZone(), "MM/dd/yyyy HH:mm:ss");

    let row = this.mapObjectToRow(payload, headers.slice(1));
    row.unshift(formattedDate);

    sheet.appendRow(row);
    return this.data(201);
  }

  handleDynamicPost(sheet, payload) {
    if (!Array.isArray(payload)) {
      payload = [payload];
    }

    this.addNewColumnsIfNeeded(sheet, payload);

    const headers = this.getHeaders(sheet);
    const currentDate = new Date();

    const processedPayload = payload.map(obj =>
      Object.keys(obj).reduce((acc, key) => {
        acc[key] = typeof obj[key] === 'object' ? JSON.stringify(obj[key]) : obj[key];
        return acc;
      }, {})
    );

    processedPayload.forEach(obj => {
      const row = [Utilities.formatDate(currentDate, Session.getScriptTimeZone(), "MM/dd/yyyy HH:mm:ss")];
      headers.slice(1).forEach(header => row.push(obj[header] || ""));
      sheet.appendRow(row);
    });

    return this.data(201);
  }

  // Utility methods
  isTruthy(x) {
    return !!x;
  }

  isEmpty(item) {
    return item === "" || item == null;
  }

  find(array, predicate) {
    if (!Array.isArray(array)) return;
    for (let i = 0; i < array.length; i++) {
      if (predicate(array[i])) {
        return array[i];
      }
    }
  }

  mapObjectToRow(object, headers) {
    return headers.map(header => {
      const value = object[header];
      if (value && typeof value === 'object') {
        return JSON.stringify(value);
      }
      return value || "";
    });
  }

  mapRowToObject(row, _id, headers) {
    if (row.every(this.isEmpty)) {
      return null;
    }

    const result = { _id: _id };
    for (let i = 0; i < headers.length; i++) {
      if (!this.isEmpty(headers[i])) {
        result[headers[i]] = row[i];
      }
    }
    return result;
  }

  handleUpsert(sheet, idColumn, _id, payload) {
    const headers = this.getHeaders(sheet);
    const idColumnIndex = headers.indexOf(idColumn) + 1;
    if (idColumnIndex < 1) {
      return this.error(400, "id_column_not_found", { idColumn: idColumn });
    }

    const lastRow = sheet.getLastRow();
    let foundRow = null;
    for (let i = 2; i <= lastRow; i++) {
      const cellValue = sheet.getRange(i, idColumnIndex).getValue();
      if (cellValue.toString() === _id.toString()) {
        foundRow = i;
        break;
      }
    }

    const currentDate = new Date();
    const formattedDate = Utilities.formatDate(currentDate, Session.getScriptTimeZone(), "MM/dd/yyyy HH:mm:ss");

    if (foundRow) {
      const rowValues = this.mapObjectToRow(payload, headers.slice(1));
      rowValues.unshift(formattedDate);
      sheet.getRange(foundRow, 1, 1, rowValues.length).setValues([rowValues]);
      return this.data(200, { message: "Row updated" });
    } else {
      this.addNewColumnsIfNeeded(sheet, [payload]);
      const processedPayload = this.processPayloadForInsertion(payload, headers.slice(1));
      processedPayload.unshift(formattedDate);
      sheet.appendRow(processedPayload);
      return this.data(201, { message: "Row inserted" });
    }
  }

  processPayloadForInsertion(payload, headers) {
    return headers.map(header => {
      const value = payload[header];
      return typeof value === 'object' ? JSON.stringify(value) : (value || "");
    });
  }

  handlePut(sheet, _id, payload) {
    if (_id == null) {
      return this.error(400, "row_id_missing", {});
    }

    const headers = this.getHeaders(sheet);
    for (const [key, value] of Object.entries(payload)) {
      const idx = headers.findIndex(h => h === key);
      if (idx === -1) continue;
      sheet.getRange(_id, idx + 1, 1).setValue(value);
    }

    return this.data(201);
  }

  handleDelete(sheet, _id) {
    sheet.getRange("$" + _id + ":" + "$" + _id).setValue("");
    return this.data(204);
  }

  handleAddColumn(sheet, columnName) {
    if (!columnName) {
      return this.error(400, "column_name_missing", {});
    }
    const lastColumn = sheet.getLastColumn();
    sheet.insertColumnAfter(lastColumn);
    sheet.getRange(1, lastColumn + 1).setValue(columnName);
    return this.data(201, { message: "Column added" });
  }

  handleEditColumn(sheet, oldColumnName, newColumnName) {
    const headers = this.getHeaders(sheet);
    const columnIndex = headers.indexOf(oldColumnName) + 1;
    if (columnIndex < 1) {
      return this.error(404, "column_not_found", { oldColumnName: oldColumnName });
    }
    sheet.getRange(1, columnIndex).setValue(newColumnName);
    return this.data(201, { message: "Column renamed" });
  }

  handleRemoveColumn(sheet, columnName) {
    const headers = this.getHeaders(sheet);
    const columnIndex = headers.indexOf(columnName) + 1;
    if (columnIndex < 1) {
      return this.error(404, "column_not_found", { columnName: columnName });
    }
    sheet.deleteColumn(columnIndex);
    return this.data(204, { message: "Column removed" });
  }

  handleFind(sheet, idColumn, id, returnAllMatches = false) {
    const headers = this.getHeaders(sheet);
    const idColumnIndex = headers.indexOf(idColumn) + 1;
    if (idColumnIndex < 1) {
      return this.error(400, "id_column_not_found", { idColumn: idColumn });
    }

    const lastRow = sheet.getLastRow();
    const matches = [];
    for (let i = 2; i <= lastRow; i++) {
      const cellValue = sheet.getRange(i, idColumnIndex).getValue();
      if (cellValue.toString() === id.toString()) {
        const rowData = sheet.getRange(i, 1, 1, sheet.getLastColumn()).getValues()[0];
        const result = this.mapRowToObject(rowData, i, headers);
        matches.push(result);
        if (!returnAllMatches) break;
      }
    }

    if (matches.length === 0) {
      return this.error(404, "no_matches_found", {});
    } else if (matches.length === 1 && !returnAllMatches) {
      return this.data(200, matches[0]);
    } else {
      return this.data(200, matches);
    }
  }

  handleBulkDelete(sheet, params) {
    const { ids } = params;
    if (!Array.isArray(ids)) {
      return this.error(400, "invalid_ids", { message: "ids must be an array" });
    }
    
    ids.forEach(_id => {
      sheet.getRange(_id, 1, 1, sheet.getLastColumn()).clearContent();
    });
    
    return this.data(200, { deleted: ids.length });
  }

  handlePaginatedGet(sheet, params) {
    const { cursor, limit = 10, sortBy = 'Date Modified', sortDir = 'desc' } = params;
    const headers = this.getHeaders(sheet);
    const sortColIndex = headers.indexOf(sortBy) + 1;
    
    if (sortColIndex < 1) {
      return this.error(400, "sort_column_not_found", { sortBy });
    }
    
    const lastRow = sheet.getLastRow();
    let startRow = cursor ? parseInt(cursor) : 2;
    let rows = [];
    
    // Get one more than limit to determine if there are more pages
    const range = sheet.getRange(startRow, 1, Math.min(limit + 1, lastRow - startRow + 1), sheet.getLastColumn());
    rows = range.getValues()
      .map((row, idx) => this.mapRowToObject(row, startRow + idx, headers))
      .filter(this.isTruthy);
      
    const hasMore = rows.length > limit;
    if (hasMore) rows.pop();
    
    const nextCursor = hasMore ? startRow + limit : null;
    
    return this.data(200, rows, { 
      cursor: nextCursor,
      hasMore
    });
  }

  handleExport(sheet, params) {
    const { format = 'json' } = params;
    const headers = this.getHeaders(sheet);
    const data = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn())
      .getValues()
      .map(row => this.mapRowToObject(row, null, headers))
      .filter(this.isTruthy);
      
    switch(format.toLowerCase()) {
      case 'json':
        return this.data(200, data);
      case 'csv':
        const csv = [
          headers.join(','),
          ...data.map(row => headers.map(h => row[h]).join(','))
        ].join('\n');
        return this.data(200, csv, { format: 'csv' });
      default:
        return this.error(400, "invalid_format", { format });
    }
  }

  handleAggregate(sheet, params) {
    const { column, operation, where } = params;
    const headers = this.getHeaders(sheet);
    const colIndex = headers.indexOf(column) + 1;
    
    if (colIndex < 1) {
      return this.error(400, "column_not_found", { column });
    }
    
    const values = sheet.getRange(2, colIndex, sheet.getLastRow() - 1, 1)
      .getValues()
      .map(row => row[0])
      .filter(val => typeof val === 'number');
      
    let result;
    switch(operation) {
      case 'sum':
        result = values.reduce((a, b) => a + b, 0);
        break;
      case 'avg':
        result = values.reduce((a, b) => a + b, 0) / values.length;
        break;
      case 'min':
        result = Math.min(...values);
        break;
      case 'max':
        result = Math.max(...values);
        break;
      case 'count':
        result = values.length;
        break;
      default:
        return this.error(400, "invalid_operation", { operation });
    }
    
    return this.data(200, { result });
  }

  handleBatchUpdate(sheet, updates) {
    const headers = this.getHeaders(sheet);
    const currentDate = new Date();
    const formattedDate = Utilities.formatDate(currentDate, Session.getScriptTimeZone(), "MM/dd/yyyy HH:mm:ss");
    
    updates.forEach(update => {
      const { _id, ...data } = update;
      if (!_id) return;
      
      // Update timestamp
      sheet.getRange(_id, 1).setValue(formattedDate);
      
      // Update fields
      for (const [key, value] of Object.entries(data)) {
        const idx = headers.indexOf(key);
        if (idx === -1) continue;
        sheet.getRange(_id, idx + 1).setValue(value);
      }
    });
    
    return this.data(200, { updated: updates.length });
  }

  handleGetRows(sheet, params) {
    const startRow = parseInt(params.startRow, 10);
    const endRow = params.endRow ? parseInt(params.endRow, 10) : startRow;
    const { includeFormulas = false } = params;
    
    const rows = {
      values: this.getRows(sheet, startRow, endRow)
    };
    
    // Add formulas if requested
    if (includeFormulas) {
      rows.formulas = sheet.getRange(
        startRow, 
        1, 
        endRow - startRow + 1, 
        sheet.getLastColumn()
      ).getFormulas();
    }
    
    return this.data(200, rows);
  }

  handleGetColumns(sheet, params) {
    const { 
      startColumn: startIdentifier, 
      endColumn: endIdentifier = startIdentifier,
      includeFormulas = false,
      includeFormatting = false
    } = params;
    
    const columns = this.getColumns(sheet, startIdentifier, endIdentifier, {
      includeFormulas,
      includeFormatting
    });
    return this.data(200, columns);
  }

  getColumns(sheet, startIdentifier, endIdentifier = startIdentifier, options = {}) {
    const {
      includeFormulas = false,
      includeFormatting = false
    } = options;

    const startIndex = this.getColumnIndex(startIdentifier);
    const lastColumn = sheet.getLastColumn();

    // If startIndex is invalid, return empty
    if (startIndex < 1) {
      return [];
    }

    // Convert endIdentifier to index and clamp to lastColumn
    const endIndex = Math.min(this.getColumnIndex(endIdentifier), lastColumn);
    
    // If startIndex is now greater than adjusted endIndex, return empty
    if (startIndex > endIndex) {
      return [];
    }

    const range = sheet.getRange(
      1, 
      startIndex, 
      sheet.getLastRow(), 
      endIndex - startIndex + 1
    );

    const result = {
      values: range.getValues()
    };

    if (includeFormulas) {
      result.formulas = range.getFormulas();
    }

    if (includeFormatting) {
      result.backgrounds = range.getBackgrounds();
      result.fontColors = range.getFontColors();
      result.numberFormats = range.getNumberFormats();
    }

    return result;
  }

  getAllCells(sheet) {
    // Gets all data in the sheet in one batch operation
    const dataRange = sheet.getDataRange();
    const result = {
      values: dataRange.getValues(),
      lastColumn: sheet.getLastColumn(),
      lastRow: sheet.getLastRow()
    };

    // Add formulas by default since this is a "get all" operation
    result.formulas = dataRange.getFormulas();

    // Add formatting information by default
    result.backgrounds = dataRange.getBackgrounds();
    result.fontColors = dataRange.getFontColors();
    result.numberFormats = dataRange.getNumberFormats();

    // Add additional useful formatting information
    result.fontFamilies = dataRange.getFontFamilies();
    result.fontSizes = dataRange.getFontSizes();
    result.fontStyles = dataRange.getFontStyles();
    result.horizontalAlignments = dataRange.getHorizontalAlignments();
    result.verticalAlignments = dataRange.getVerticalAlignments();
    result.wraps = dataRange.getWraps();

    return result;
  }

  handleGetAllCells(sheet, params = {}) {
    const { 
      includeFormulas = true,  // true by default for getAllCells
      includeFormatting = true // true by default for getAllCells
    } = params;

    const data = this.getAllCells(sheet);
    
    // Remove unwanted properties based on parameters
    if (!includeFormulas) {
      delete data.formulas;
    }
    
    if (!includeFormatting) {
      delete data.backgrounds;
      delete data.fontColors;
      delete data.numberFormats;
      delete data.fontFamilies;
      delete data.fontSizes;
      delete data.fontStyles;
      delete data.horizontalAlignments;
      delete data.verticalAlignments;
      delete data.wraps;
    }

    return this.data(200, data);
  }

  // Authentication Methods
  addUser(name, key, permissions) {
    this.users.push({ name, key, permissions });
  }

  getUserWithKey(key) {
    return this.find(this.users, x =>
      x.key === key || (x.key && typeof x.key === "object" && x.key.__unsafe === key)
    );
  }

  isStrongKey(key) {
    const strongKeyRegex = new RegExp(
      "^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[\x20-\x2F\x3A-\x40\x5B-\x60\x7B-\x7E])(?=.{8,})"
    );
    const user = this.getUserWithKey(key);

    if (!user) return false;
    if (user.key.__unsafe === key) return true;

    return user.key.match(strongKeyRegex);
  }

  getPermissions(user, spreadsheet) {
    // If permissions is "*" or ALL(), return it directly
    if (user.permissions === "*" || user.permissions === this.ALL()) {
      return user.permissions;
    }

    // Handle array of permissions
    if (Array.isArray(user.permissions)) {
      return user.permissions;
    }

    // Handle function permissions
    if (typeof user.permissions === "function") {
      return user.permissions;
    }

    // Handle object permissions
    if (typeof user.permissions === "object") {
      const keys = Object.keys(user.permissions);
      for (let i = 0; i < keys.length; i++) {
        if (keys[i].toLowerCase() === spreadsheet.toLowerCase()) {
          return user.permissions[keys[i]];
        }
      }
      return user.permissions["ALL"];
    }

    return null; // No valid permissions found
  }

  hasAccess(key, spreadsheet, method) {
    const user = this.getUserWithKey(key);
    if (!user) return false;

    const permission = this.getPermissions(user, spreadsheet);
    if (!permission) return false;

    // Simplify permission check - "*" or ALL() both mean full access
    if (permission === "*" || permission === this.ALL()) return true;

    // Check if permission is an array and includes the method
    if (Array.isArray(permission)) {
      return permission.includes("*") || permission.includes(this.ALL()) || permission.includes(method);
    }

    // Direct method match
    return permission === method;
  }

  getRows(sheet, startRow, endRow = startRow) {
    const lastRow = sheet.getLastRow();
    const lastColumn = sheet.getLastColumn();

    // If startRow is invalid, return empty
    if (startRow < 1) {
      return [];
    }

    // Clamp endRow to lastRow if it exceeds it
    endRow = Math.min(endRow, lastRow);
    
    // If startRow is now greater than adjusted endRow, return empty
    if (startRow > endRow) {
      return [];
    }

    return sheet.getRange(startRow, 1, endRow - startRow + 1, lastColumn).getValues();
  }

  getColumnIndex(identifier) {
    if (typeof identifier === 'string') {
      return this.columnLetterToIndex(identifier);
    } else if (typeof identifier === 'number') {
      return identifier;
    } else {
      throw new Error("Invalid column identifier");
    }
  }

  columnLetterToIndex(letter) {
    let column = 0;
    for (let i = 0; i < letter.length; i++) {
      column = column * 26 + (letter.charCodeAt(i) - 'A'.charCodeAt(0) + 1);
    }
    return column;
  }

  handleRangeUpdate(sheet, params) {
    const { startRow, startCol, data } = params;
    
    if (!Array.isArray(data) || !Array.isArray(data[0])) {
      return this.error(400, "invalid_data", { 
        message: "Data must be a 2D array" 
      });
    }

    const numRows = data.length;
    const numCols = data[0].length;

    try {
      // Single setValues() call is much more efficient than individual updates
      sheet.getRange(startRow, startCol, numRows, numCols).setValues(data);
      
      // Update "Date Modified" column for affected rows if it exists
      const headers = this.getHeaders(sheet);
      if (headers[0] === "Date Modified") {
        const timestamp = new Date();
        const formattedDate = Utilities.formatDate(
          timestamp, 
          Session.getScriptTimeZone(), 
          "MM/dd/yyyy HH:mm:ss"
        );
        
        // Update timestamp for all affected rows
        sheet.getRange(startRow, 1, numRows, 1)
          .setValue(formattedDate);
      }

      return this.data(200, {
        updated: {
          rows: numRows,
          columns: numCols,
          cells: numRows * numCols
        }
      });
    } catch (e) {
      return this.error(500, "update_failed", { 
        message: e.message,
        range: `${startRow},${startCol} to ${startRow + numRows},${startCol + numCols}`
      });
    }
  }

  error(status, code, details) {
    return {
      status: status,
      error: { code: code, details: details }
    };
  }

  handleGetSheets(spreadsheet) {
    const sheets = spreadsheet.getSheets();
    const spreadsheetId = spreadsheet.getId();
    
    const sheetInfo = sheets.map(sheet => ({
      name: sheet.getName(),
      id: sheet.getSheetId(),
      index: sheet.getIndex() + 1, // Make 1-based instead of 0-based
      isHidden: sheet.isSheetHidden(),
      // Add CSV export URL
      csvUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=${sheet.getSheetId()}`,
      // Add direct sheet URL
      sheetUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit#gid=${sheet.getSheetId()}`
    }));

    return this.data(200, sheetInfo);
  }

  handleGetCSV(spreadsheet, sheetName) {
    try {
      const sheets = spreadsheet.getSheets();
      const spreadsheetId = spreadsheet.getId();
      
      // Find the requested sheet
      const sheet = sheets.find(s => s.getName() === sheetName);
      if (!sheet) {
        return this.error(404, "sheet_not_found", { sheet: sheetName });
      }

      const sheetId = sheet.getSheetId();
      const csvUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=${sheetId}`;
      
      // Fetch CSV content
      const response = UrlFetchApp.fetch(csvUrl, {
        headers: {
          Authorization: `Bearer ${ScriptApp.getOAuthToken()}`
        },
        muteHttpExceptions: true
      });
      
      if (response.getResponseCode() !== 200) {
        return this.error(response.getResponseCode(), "csv_fetch_failed", {
          message: response.getContentText()
        });
      }

      // Return raw CSV content
      return this.data(200, response.getContentText());

    } catch (e) {
      return this.error(500, "csv_processing_failed", {
        message: e.message,
        sheet: sheetName
      });
    }
  }

  handleGetRange(sheet, params) {
    const { 
      startRow, 
      startCol, 
      stopAtEmptyRow = false, 
      stopAtEmptyColumn = false,
      skipEmptyRows = false,
      skipEmptyColumns = false,
      includeFormulas = false
    } = params;
    
    const range = this.getRange(sheet, startRow, startCol, {
      stopAtEmptyRow,
      stopAtEmptyColumn,
      skipEmptyRows,
      skipEmptyColumns,
      includeFormulas
    });
    return this.data(200, range);
  }

  getRange(sheet, startRow, startCol, options = {}) {
    const {
      stopAtEmptyRow = false,
      stopAtEmptyColumn = false,
      skipEmptyRows = false,
      skipEmptyColumns = false,
      includeFormulas = false
    } = options;

    // Validate inputs
    if (startRow < 1 || startCol < 1) {
      return [];
    }

    const lastRow = sheet.getLastRow();
    const lastCol = sheet.getLastColumn();
    
    if (startRow > lastRow || startCol > lastCol) {
      return [];
    }

    let endRow = lastRow;
    let endCol = lastCol;

    // Get both values and formulas if requested
    let rangeValues = sheet.getRange(
      startRow,
      startCol,
      endRow - startRow + 1,
      endCol - startCol + 1
    ).getValues();
    
    let rangeFormulas = includeFormulas ? 
      sheet.getRange(
        startRow,
        startCol,
        endRow - startRow + 1,
        endCol - startCol + 1
      ).getFormulas() : null;

    // Process columns if needed
    if (stopAtEmptyColumn || skipEmptyColumns) {
      const columnsToKeep = [];
      for (let col = 0; col < rangeValues[0].length; col++) {
        const isEmptyColumn = rangeValues.every(row => this.isEmpty(row[col]));
        if (!isEmptyColumn) {
          columnsToKeep.push(col);
        } else if (stopAtEmptyColumn) {
          break;
        }
      }
      
      if (columnsToKeep.length === 0) {
        return { values: [], range: null };
      }

      // Filter columns
      rangeValues = rangeValues.map(row => 
        columnsToKeep.map(col => row[col])
      );
      endCol = startCol + columnsToKeep.length - 1;
    }

    // Process rows if needed
    if (stopAtEmptyRow || skipEmptyRows) {
      const rowsToKeep = [];
      for (let row = 0; row < rangeValues.length; row++) {
        const isEmptyRow = rangeValues[row].every(cell => this.isEmpty(cell));
        if (!isEmptyRow) {
          rowsToKeep.push(row);
        } else if (stopAtEmptyRow) {
          break;
        }
      }

      if (rowsToKeep.length === 0) {
        return { values: [], range: null };
      }

      // Filter rows
      rangeValues = rowsToKeep.map(row => rangeValues[row]);
      endRow = startRow + rowsToKeep.length - 1;
    }

    // Also process formulas if they exist
    if (rangeFormulas) {
      if (stopAtEmptyColumn || skipEmptyColumns) {
        rangeFormulas = rangeFormulas.map(row => 
          columnsToKeep.map(col => row[col])
        );
      }
      if (stopAtEmptyRow || skipEmptyRows) {
        rangeFormulas = rowsToKeep.map(row => rangeFormulas[row]);
      }
    }

    return {
      values: rangeValues,
      formulas: rangeFormulas,
      range: {
        startRow,
        startCol,
        endRow,
        endCol,
        numRows: endRow - startRow + 1,
        numCols: endCol - startCol + 1
      }
    };
  }

  // New function to find and get a data block
  handleGetDataBlock(sheet, params) {
    const { searchRange = {} } = params;
    const { 
      startRow = 1, 
      startCol = 1, 
      endRow = sheet.getLastRow(), 
      endCol = sheet.getLastColumn() 
    } = searchRange;
    
    const block = this.findDataBlock(sheet, startRow, startCol, endRow, endCol);
    return this.data(200, block);
  }

  findDataBlock(sheet, startRow, startCol, endRow, endCol) {
    // Get the entire search range
    const searchValues = sheet.getRange(startRow, startCol, 
      endRow - startRow + 1, endCol - startCol + 1).getValues();

    // Find the first non-empty cell
    let blockStartRow = -1;
    let blockStartCol = -1;
    let found = false;

    for (let row = 0; row < searchValues.length && !found; row++) {
      for (let col = 0; col < searchValues[0].length; col++) {
        if (!this.isEmpty(searchValues[row][col])) {
          blockStartRow = row;
          blockStartCol = col;
          found = true;
          break;
        }
      }
    }

    if (!found) {
      return { values: [], range: null };
    }

    // Get the range with the found starting point
    return this.getRange(sheet, 
      startRow + blockStartRow, 
      startCol + blockStartCol, 
      {
        stopAtEmptyRow: true,
        stopAtEmptyColumn: true,
        skipEmptyRows: true,
        skipEmptyColumns: true
      }
    );
  }
}

function httpResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}


function error(status, code, details) {
  return {
    status: status,
    error: { code: code, details: details }
  };
}






/*
 * Original SpreadAPI Notice:
 * Copyright 2019 Mateusz Zieliński
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0.
 */ 

// Define all logger configurations
const loggers = {
  
  anonymous: new SheetlogScript({
    users: [{
      name: "anonymous",
      key: { __unsafe: "" },
      permissions: "*"
    }]
  }),

  doPostLogger: new SheetlogScript({
    users: [{
      name: "anonymous",
      key: { __unsafe: "" },
      permissions: "*"
    }]
  }),

  doGetLogger: new SheetlogScript({
    users: [{
      name: "anonymous",
      key: { __unsafe: "" },
      permissions: "*"
    }]
  }),

  admin: new SheetlogScript({
    users: [{
      name: "admin",
      key: "myStr0ng!Pass",
      permissions: "*"
    }]
  }),

  powerUser: new SheetlogScript({
    users: [{
      name: "poweruser",
      key: "P0wer!User",
      permissions: {
        logs: ["GET", "POST"],
        analytics: "GET",
        config: ["PUT", "DELETE"]
      }
    }]
  }),

  viewer: new SheetlogScript({
    users: [{
      name: "viewer", 
      key: "V1ewer!Pass",
      permissions: {
        public: "GET",
        reports: "GET"
      }
    }]
  }),

  writer: new SheetlogScript({
    users: [{
      name: "writer",
      key: "Wr1ter!Pass",
      permissions: {
        submissions: "POST"
      }
    }]
  }),

  // Example of mixed permissions
  mixed: new SheetlogScript({
    users: [
      {
        name: "admin",
        key: "Adm1n!Pass",
        permissions: "*"
      },
      {
        name: "viewer",
        key: "V1ew!Only",
        permissions: {
          public: "GET"
        }
      }
    ]
  })
};




// Global Google Apps Script functions
function doPost(request) {
  // Create new Sheetlog instance with default anonymous unsafe access
  const logger = loggers.doPostLogger;

  try {
    const requestData = JSON.parse(request.postData.contents);
    if (Array.isArray(requestData)) {
      return httpResponse(requestData.map(params => logger.handleRequest(params)));
    }
    return httpResponse(logger.handleRequest(requestData));
  } catch (e) {
    return httpResponse(
      error(400, "invalid_post_payload", {
        payload: request.postData.contents,
        type: request.postData.type
      })
    );
  }
}


function doGet(e) {
  const logger = loggers.doGetLogger;
  try {
    return httpResponse(logger.handleRequest(e.parameter));
  } catch (error) {
    Logger.log(error.message);
    return httpResponse(error(500, 'internal_error', { message: error.message }));
  }
}

function onEdit(e) {
  if (!ENABLE_AUTO_TIMESTAMPS) return;

  const lastModifiedColumnIndex = 1;
  const range = e.range;
  const sheet = range.getSheet();
  let startRow = range.getRow();
  let numRows = range.getNumRows();

  if (startRow == 1) {
    startRow = 2;
    numRows--;
  }

  const column = range.getColumn();
  if (column === lastModifiedColumnIndex) return;

  const timestamp = new Date();
  for (let i = 0; i < numRows; i++) {
    const row = startRow + i;
    sheet.getRange(row, lastModifiedColumnIndex).setValue(timestamp);
  }
}
