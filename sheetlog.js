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
 * 
 * Original SpreadAPI Notice:
 * Copyright 2019 Mateusz Zieliński
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0.
 * 
 */


// To add better password protection for the sheet,
// you can use the following configurations for Sheetlog in both
// doGet() — which controls who can read the sheet and
// doPost() — which controls who can edit/write to the sheet




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

    // Remove automatic "Date Modified" column creation
    objects.forEach(obj => {
      Object.keys(obj).forEach(key => {
        if (!existingHeaders.includes(key) && !newColumns.includes(key)) {
          newColumns.push(key);
        }
      });
    });

    if (newColumns.length > 0) {
      const lastColumn = sheet.getLastColumn();
      sheet.insertColumnsAfter(lastColumn, newColumns.length);
      sheet.getRange(1, lastColumn + 1, 1, newColumns.length).setValues([newColumns]);
    }
  }

  // Main Request Handler
  handleRequest(params) {
    const lock = LockService.getScriptLock();
    // Wait for up to 30 seconds for other processes to finish.
    // Only needed for write operations, but simpler to wrap all or check method.
    const method = (params["method"] || "GET").toUpperCase();
    const isWrite = ["POST", "PUT", "DELETE", "UPSERT", "BATCH_UPSERT", "DYNAMIC_POST", "ADD_COLUMN", "EDIT_COLUMN", "REMOVE_COLUMN", "BULK_DELETE", "BATCH_UPDATE", "RANGE_UPDATE"].includes(method);
    
    if (isWrite) {
      try {
        lock.waitLock(30000);
      } catch (e) {
        return this.error(503, "server_busy", { message: "Could not obtain lock after 30 seconds." });
      }
    }

    try {
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
      case "GET_LAST":
        return this.handleGetLastRows(sheet, params);
      case "POST":
        return this.handlePost(sheet, payload);
      case "UPSERT":
        return this.handleUpsert(sheet, idColumn, id, payload, { ...params });
      case "BATCH_UPSERT":
        return this.handleBatchUpsert(sheet, idColumn, payload, { ...params });
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
  } finally {
    if (isWrite) {
      lock.releaseLock();
    }
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

    const rangeValues = sheet
      .getRange(firstRowInPage, 1, lastRowInPage - firstRowInPage + 1, lastColumn)
      .getValues();

    // OPTIMIZATION: Return raw values if requested
    if (params.raw) {
       if (!isAsc) rangeValues.reverse();
       return this.data(200, {
         headers: headers,
         values: rangeValues,
         next: undefined // Pagination logic for raw mode? simplistic for now
       });
    }

    const rows = rangeValues
      .map((item, index) => this.mapRowToObject(item, firstRowInPage + index, headers));

    if (!isAsc) {
      rows.reverse();
    }

    let next = isAsc ? lastRowInPage + 1 : firstRowInPage - 1;
    if (next < firstRow || next > lastRow) next = undefined;

    return this.data(200, rows.filter(this.isTruthy), { next: next });
  }

  // FAST: Get last N rows from the bottom of the sheet
  handleGetLastRows(sheet, params) {
    const limit = params.limit != null ? +params.limit : 10;
    const raw = params.raw || false;
    
    const lastRow = sheet.getLastRow();
    const lastColumn = sheet.getLastColumn();
    const headers = this.getHeaders(sheet);
    
    if (lastRow < 2) {
      return this.data(200, raw ? { headers: headers, values: [] } : []);
    }
    
    // Calculate starting row (don't go before row 2 which is first data row)
    const startRow = Math.max(2, lastRow - limit + 1);
    const numRows = lastRow - startRow + 1;
    
    // Single API call to get the last N rows
    const rangeValues = sheet
      .getRange(startRow, 1, numRows, lastColumn)
      .getValues();
    
    if (raw) {
      return this.data(200, {
        headers: headers,
        values: rangeValues,
        startRow: startRow,
        endRow: lastRow,
        total: lastRow - 1 // Total data rows (excluding header)
      });
    }
    
    // Map to objects with _id
    const rows = rangeValues
      .map((item, index) => this.mapRowToObject(item, startRow + index, headers))
      .filter(this.isTruthy);
    
    return this.data(200, rows, {
      startRow: startRow,
      endRow: lastRow,
      total: lastRow - 1
    });
  }

  handlePost(sheet, payload) {
    const headers = this.getHeaders(sheet);
    let row = this.mapObjectToRow(payload, headers);

    // Only add timestamp if "Date Modified" column exists
    if (headers[0] === "Date Modified") {
      const currentDate = new Date();
      const formattedDate = Utilities.formatDate(currentDate, Session.getScriptTimeZone(), "MM/dd/yyyy HH:mm:ss");
      row.unshift(formattedDate);
    }

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
    const hasDateModified = headers[0] === "Date Modified";
    const timestamp = Utilities.formatDate(currentDate, Session.getScriptTimeZone(), "MM/dd/yyyy HH:mm:ss");

    // Construct rows for batch insertion
    const rowsToAppend = [];
    payload.forEach(obj => {
      const row = [];
      if (hasDateModified) {
        row.push(timestamp);
      }
      headers.forEach(header => {
        if (header !== "Date Modified") {
          const val = obj[header];
          row.push((typeof val === 'object' ? JSON.stringify(val) : val) || "");
        }
      });
      rowsToAppend.push(row);
    });

    if (rowsToAppend.length > 0) {
      sheet.getRange(sheet.getLastRow() + 1, 1, rowsToAppend.length, rowsToAppend[0].length)
        .setValues(rowsToAppend);
    }

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

  // Optimized helper for ID lookup
  findRowIndexById(sheet, idColumnIndex, id) {
    const lastRow = sheet.getLastRow();
    if (lastRow < 2) return -1;
    // Optimization: Read only ID column in one batch
    const idColumnValues = sheet.getRange(2, idColumnIndex, lastRow - 1, 1).getValues();
    const searchStr = id.toString();
    
    for (let i = 0; i < idColumnValues.length; i++) {
      const val = idColumnValues[i][0];
      // Check both strict equality and string equality
      if (val == id || String(val) === searchStr) {
        return i + 2; // +2 because data starts at row 2
      }
    }
    return -1;
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

  handleUpsert(sheet, idColumn, _id, payload, options = { partialUpdate: false }) {
    const headers = this.getHeaders(sheet);
    const idColumnIndex = headers.indexOf(idColumn) + 1;
    if (idColumnIndex < 1) {
      return this.error(400, "id_column_not_found", { idColumn: idColumn });
    }

    // OPTIMIZATION: Use batch lookup
    const foundRow = this.findRowIndexById(sheet, idColumnIndex, _id);
    const currentDate = new Date();
    const formattedDate = Utilities.formatDate(currentDate, Session.getScriptTimeZone(), "MM/dd/yyyy HH:mm:ss");
    const hasDateModified = headers.length > 0 && headers[0] === "Date Modified";

    if (foundRow !== -1) {
      if (options.partialUpdate) {
        if (hasDateModified) {
          sheet.getRange(foundRow, 1).setValue(formattedDate);
        }
        Object.entries(payload).forEach(([key, value]) => {
          const colIndex = headers.indexOf(key);
          if (colIndex !== -1) {
            sheet.getRange(foundRow, colIndex + 1).setValue(
              typeof value === 'object' ? JSON.stringify(value) : value
            );
          }
        });
      } else {
        const rowValues = this.mapObjectToRow(payload, hasDateModified ? headers.slice(1) : headers);
        if (hasDateModified) {
          rowValues.unshift(formattedDate);
        }
        sheet.getRange(foundRow, 1, 1, rowValues.length).setValues([rowValues]);
      }
      return this.data(200, { message: "Row updated" });
    } else {
      this.addNewColumnsIfNeeded(sheet, [payload]);
      const updatedHeaders = this.getHeaders(sheet);
      const hasDateModifiedAfterAdd = updatedHeaders.length > 0 && updatedHeaders[0] === "Date Modified";
      const processedPayload = this.processPayloadForInsertion(payload, hasDateModifiedAfterAdd ? updatedHeaders.slice(1) : updatedHeaders);
      if (hasDateModifiedAfterAdd) {
        processedPayload.unshift(formattedDate);
      }
      sheet.appendRow(processedPayload);
      return this.data(201, { message: "Row inserted" });
    }
  }

  handleBatchUpsert(sheet, idColumn, payload, options = { partialUpdate: false }) {
    if (!Array.isArray(payload)) return this.error(400, "payload_must_be_array", {});
    
    this.addNewColumnsIfNeeded(sheet, payload);
    const headers = this.getHeaders(sheet);
    const idColumnIndex = headers.indexOf(idColumn) + 1;
    
    if (idColumnIndex < 1) {
      return this.error(400, "id_column_not_found", { idColumn: idColumn });
    }

    const lastRow = sheet.getLastRow();
    const idMap = new Map(); 
    if (lastRow >= 2) {
       const idValues = sheet.getRange(2, idColumnIndex, lastRow - 1, 1).getValues();
       for(let i=0; i<idValues.length; i++) {
         const val = idValues[i][0];
         if(val !== "" && val != null) {
            idMap.set(String(val), i + 2);
         }
       }
    }

    const currentDate = new Date();
    const formattedDate = Utilities.formatDate(currentDate, Session.getScriptTimeZone(), "MM/dd/yyyy HH:mm:ss");
    
    const inserts = [];
    const updates = [];

    payload.forEach(item => {
       const id = item[idColumn];
       if (id == null) return;
       
       if (idMap.has(String(id))) {
         updates.push({ row: idMap.get(String(id)), data: item });
       } else {
         inserts.push(item);
       }
    });

    if (inserts.length > 0) {
       const rowsToAppend = [];
       const hasDateModified = headers[0] === "Date Modified";
       inserts.forEach(obj => {
          const row = [];
          if (hasDateModified) {
             row.push(formattedDate);
          }
          headers.forEach(header => {
             if (header !== "Date Modified") {
               const val = obj[header];
               row.push((typeof val === 'object' ? JSON.stringify(val) : val) || "");
             }
          });
          rowsToAppend.push(row);
       });
       
       if (rowsToAppend.length > 0) {
         sheet.getRange(sheet.getLastRow() + 1, 1, rowsToAppend.length, rowsToAppend[0].length)
              .setValues(rowsToAppend);
       }
    }

    if (updates.length > 0) {
       const hasDateModified = headers.length > 0 && headers[0] === "Date Modified";
       if (!options.partialUpdate) {
         updates.forEach(update => {
            const rowValues = this.mapObjectToRow(update.data, hasDateModified ? headers.slice(1) : headers);
            if (hasDateModified) {
              rowValues.unshift(formattedDate);
            }
            sheet.getRange(update.row, 1, 1, rowValues.length).setValues([rowValues]);
         });
       } else {
         updates.forEach(update => {
            if (hasDateModified) {
              sheet.getRange(update.row, 1).setValue(formattedDate);
            }
            Object.entries(update.data).forEach(([key, value]) => {
              const colIndex = headers.indexOf(key);
              if (colIndex !== -1) {
                 sheet.getRange(update.row, colIndex + 1).setValue(
                   typeof value === 'object' ? JSON.stringify(value) : value
                 );
              }
            });
         });
       }
    }

    return this.data(200, { 
      inserted: inserts.length, 
      updated: updates.length 
    });
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
    if (lastRow < 2) {
      return this.error(404, "no_matches_found", {});
    }

    // OPTIMIZATION: Read ONLY the ID column first
    const idColumnValues = sheet.getRange(2, idColumnIndex, lastRow - 1, 1)
      .getValues()
      .map(row => row[0]); // Flatten to 1D array

    // Find matching row indices in memory - START FROM THE END
    const matchingRowIndices = [];
    const searchStr = id.toString();
    const searchNum = Number(id);
    const isNumericSearch = !isNaN(searchNum) && id !== '';

    // SEARCH BACKWARDS - from last row to first
    for (let i = idColumnValues.length - 1; i >= 0; i--) {
      const cellValue = idColumnValues[i];

      // Check both numeric and string equality
      if (cellValue === searchNum ||
        cellValue === searchStr ||
        cellValue.toString() === searchStr) {
        matchingRowIndices.push(i + 2); // +2 because we start at row 2
        if (!returnAllMatches) break;
      }
    }

    if (matchingRowIndices.length === 0) {
      return this.error(404, "no_matches_found", {});
    }

    // Reverse the indices if returning all matches (so they're in original order)
    if (returnAllMatches && matchingRowIndices.length > 1) {
      matchingRowIndices.reverse();
    }

    // Now fetch ONLY the rows we need
    const lastColumn = sheet.getLastColumn();
    const matches = [];

    // Batch read if multiple rows
    if (matchingRowIndices.length > 1 && returnAllMatches) {
      // For multiple rows, it might be more efficient to read them in one batch
      // if they're close together
      const minRow = Math.min(...matchingRowIndices);
      const maxRow = Math.max(...matchingRowIndices);

      if (maxRow - minRow < 100) {
        // Rows are close together, read the range
        const rangeData = sheet.getRange(minRow, 1, maxRow - minRow + 1, lastColumn).getValues();

        matchingRowIndices.forEach(rowIndex => {
          const dataIndex = rowIndex - minRow;
          matches.push(this.mapRowToObject(rangeData[dataIndex], rowIndex, headers));
        });
      } else {
        // Rows are spread out, read individually
        matchingRowIndices.forEach(rowIndex => {
          const rowData = sheet.getRange(rowIndex, 1, 1, lastColumn).getValues()[0];
          matches.push(this.mapRowToObject(rowData, rowIndex, headers));
        });
      }
    } else {
      // Single row
      const rowIndex = matchingRowIndices[0];
      const rowData = sheet.getRange(rowIndex, 1, 1, lastColumn).getValues()[0];
      matches.push(this.mapRowToObject(rowData, rowIndex, headers));
    }

    // Return results
    if (!returnAllMatches && matches.length === 1) {
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

    // Create A1 notations for full rows (e.g., "2:2")
    const ranges = ids.map(id => `${id}:${id}`);
    if (ranges.length > 0) {
      sheet.getRangeList(ranges).clearContent();
    }

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

    switch (format.toLowerCase()) {
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
    switch (operation) {
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

  getAllCells(sheet, options = {}) {
    const { 
      includeFormulas = false, 
      includeFormatting = false 
    } = options;
    
    // Gets all data in the sheet in one batch operation
    const dataRange = sheet.getDataRange();
    const result = {
      values: dataRange.getValues(),
      lastColumn: sheet.getLastColumn(),
      lastRow: sheet.getLastRow()
    };

    if (includeFormulas) {
      result.formulas = dataRange.getFormulas();
    }

    if (includeFormatting) {
      result.backgrounds = dataRange.getBackgrounds();
      result.fontColors = dataRange.getFontColors();
      result.numberFormats = dataRange.getNumberFormats();
      result.fontFamilies = dataRange.getFontFamilies();
      result.fontSizes = dataRange.getFontSizes();
      result.fontStyles = dataRange.getFontStyles();
      result.horizontalAlignments = dataRange.getHorizontalAlignments();
      result.verticalAlignments = dataRange.getVerticalAlignments();
      result.wraps = dataRange.getWraps();
    }

    return result;
  }

  handleGetAllCells(sheet, params = {}) {
    const {
      includeFormulas = false, // Default to false for speed
      includeFormatting = false // Default to false for speed
    } = params;

    // Pass params to getAllCells to avoid fetching unnecessary data
    const data = this.getAllCells(sheet, { includeFormulas, includeFormatting });

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

      // Only update "Date Modified" if the column exists
      const headers = this.getHeaders(sheet);
      if (headers[0] === "Date Modified") {
        const timestamp = new Date();
        const formattedDate = Utilities.formatDate(
          timestamp,
          Session.getScriptTimeZone(),
          "MM/dd/yyyy HH:mm:ss"
        );

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





function doPost(request) {
  // Create new Sheetlog instance with default anonymous unsafe access
  const logger = loggers.doPostLogger;

  try {
    let requestData;
    
    // Try to parse as JSON from postData.contents first
    if (request.postData && request.postData.contents) {
      try {
        requestData = JSON.parse(request.postData.contents);
      } catch (e) {
        // If that fails, maybe it's form-encoded data with a 'payload' parameter
        if (request.parameter && request.parameter.payload) {
          requestData = JSON.parse(request.parameter.payload);
        } else {
          throw e;
        }
      }
    } else if (request.parameter && request.parameter.payload) {
      // Try form parameter
      requestData = JSON.parse(request.parameter.payload);
    } else {
      throw new Error("No valid payload found");
    }
    
    if (Array.isArray(requestData)) {
      return httpResponse(requestData.map(params => logger.handleRequest(params)));
    }
    return httpResponse(logger.handleRequest(requestData));
  } catch (e) {
    return httpResponse(
      error(400, "invalid_post_payload", {
        message: e.message,
        payload: request.postData ? request.postData.contents : null,
        parameter: request.parameter ? request.parameter.payload : null,
        type: request.postData ? request.postData.type : null
      })
    );
  }
}


// Global Google Apps Script functions
function doGet(e) {
  // Test mode for FIND functionality
  if (e.parameter.testFind) {
    const testParams = {
      sheet: "yawnxyz", // default to "yawnxyz" sheet
      method: "FIND",
      idColumn: "_id",
      id: "1159555818",
      returnAllMatches: false
    };

    const logger = loggers.doGetLogger;
    return httpResponse(logger.handleRequest(testParams));
  }

  // Your existing test mode
  if (e.parameter.test) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "ok",
      mode: "test",
      timestamp: new Date().toISOString(),
      version: "1.0.5"
    })).setMimeType(ContentService.MimeType.JSON);
  }

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
