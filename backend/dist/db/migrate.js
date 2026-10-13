"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const database_1 = require("./database");
console.log('Running Goflyp Database Schema Migrations...');
(0, database_1.initDatabase)();
console.log('Database schema successfully migrated.');
