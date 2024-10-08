/**
 * Simple Procedure inspired by XSProcedure
 * Feature: 1. able to handle procedure native outputs (as well as INOUT parameters)
 *          2. less code, easier understanding
 *          3. configurable (support pass connection, bulk insert, named output and temp schema)
 * Author: yihan.song@sap.com
 *
 * Change list: 1. fix a bug for empty bulk insert. --by queena.qian@sap.com
 *              2. fix a bug for getting scalar output of procedure.  --by queena.qian@sap.com
 *              3. enable stream output mode (prepare for large data)
 *
*/
var quote = $.import("sap.tm.trp.service.xslib", "utils").quote;
var debug = false;
var UnmanagedConnection = $.db.getUnmanagedConnection; // unmanaged connection is a separate connection which may not need to be central controlled

var TableTypeHandlers = {};
TableTypeHandlers.LOCAL = function(tempSchema, conn) {
    this.conn = conn;
    this.tempSchema = tempSchema;

    this.handler = function(tableTypeSchema, tableTypeName, procedureName, name, columns) {
        this.tableName = (function() {
            return (debug ? "" : "#") + procedureName + "_" + name + "_" + Date.now();
        }());

        this.canonicalName = quote(tempSchema).concat(".").concat(quote(this.tableName));

        this.create = function() {
            var sql = "CREATE" + (debug ? "" : " LOCAL TEMPORARY") + " COLUMN TABLE " + this.canonicalName;
            if (tableTypeSchema && tableTypeName) {
                sql += " LIKE " + quote(tableTypeSchema) + "." + quote(tableTypeName);
            } else {
                sql += " ( " + columns.map(function(column) {
                    var def = column.name + " ";

                    if (column.type.indexOf("CHAR") !== -1) {
                        def += column.type + "(" + column.length + ")";
                    } else if (column.type === "DECIMAL") {
                        def += column.type + "(" + column.length + ", " + column.scale + ")";
                    } else {
                        def += column.type;
                    }

                    return def;
                }).join(",") + ")";
            }

            conn.prepareStatement(sql).execute();
        };

        this.finalize = function() {
            if (!debug) {
                var sql = "DROP TABLE " + this.canonicalName;
                conn.prepareStatement(sql).execute();
            }
        };

    };
};

TableTypeHandlers.GLOBAL = function(tempSchema, conn) {
    this.conn = conn;
    this.tempSchema = tempSchema;

    var that = this;

    this.handler = function(tableTypeSchema, tableTypeName, name, procedureName, columns) {
        this.tableName = (function() {
            // avoid multiple parameters with the same table type in a stored procedure
            return procedureName + "_" + name;
        }());

        this.create = function() {
            var tableName = this.tableName;
            this.canonicalName = quote(that.tempSchema).concat(".").concat(quote(tableName));

            var exitence = (function() {
                var pstmt;
                try {
                    pstmt = conn.prepareStatement("SELECT 1 FROM TABLES WHERE TABLE_NAME = ? AND SCHEMA_NAME = ?");
                    pstmt.setString(1, tableName);
                    pstmt.setString(2, tempSchema);

                    var rs = pstmt.executeQuery();
                    return rs.next();

                } finally {
                    if (pstmt) {
                        pstmt.close();
                    }
                }
            }());

            var sql = "CREATE GLOBAL TEMPORARY COLUMN TABLE " + this.canonicalName;
            if (!exitence) {
                try {
                    if (tableTypeSchema && tableTypeName) {
                        sql +=  " LIKE " + quote(tableTypeSchema) + "." + quote(tableTypeName);
                    } else {
                        sql += " ( " + columns.map(function(column) {
                            var def = column.name + " ";

                            if (column.type.indexOf("CHAR") !== -1) {
                                def += column.type + "(" + column.length + ")";
                            } else if (column.type === "DECIMAL") {
                                def += column.type + "(" + column.length + ", " + column.scale + ")";
                            } else {
                                def += column.type;
                            }

                            return def;
                        }).join(",") + ")";
                    }
                    var r = conn.prepareStatement(sql).execute();

                    return r;
                } catch (e) {
                    if (e.code === 288) {
                        /**
                         *  [288] indicates cannot use duplicate table name
                         *  caused by another transaction which is not committed yet
                         *  intend to create the same table name simultaneously
                         *  a simple non-block solution would be just append the original name
                         *  and try again
                         */
                        this.tableName = this.tableName.concat("_1");
                        this.create();
                        this.retry = true;
                    } else {
                        throw e;
                    }
                }
            } else {
                sql = "TRUNCATE TABLE " + this.canonicalName;
                conn.prepareStatement(sql).execute();
            }
        };

        this.finalize = function() {
            if (this.retry) {
                var sql = "DROP TABLE " + this.canonicalName;
                 conn.prepareStatement(sql).execute();
            }
        };
    };
};

var TIME_FORMAT = ["HH:MI:SS.FF AM", "HH24:MI:SS.FF", "HH:MI:SS AM", "HH24:MI:SS", "HH:MI AM", "HH24:MI", "HH24:MI:SS.FF Z", "HH24:MI:SS Z"];
var BOOLEAN_ENUM = {TRUE: true, FALSE: false};

function SimpleProcedure(schema, name, configuration) {

    var that = this;

    this.schema = schema;
    this.proc = name;
    this.configuration = configuration || {};

    (function() {
        if (!this.configuration.hasOwnProperty("connection") || Object.prototype.toString.call(this.configuration.connection) !== "[object Connection]") {
            this.conn = $.db.getConnection($.db.isolation.READ_COMMITTED); // it should get managed connection inside railxs
            if (!this.conn.railxsManaged) {
                this.conn.selfOwned = true;
            }
        } else {
            this.conn = this.configuration.connection;
        }

        this.tempSchema = this.configuration.hasOwnProperty("tempSchema") ? this.configuration.tempSchema : schema; // if not specified then try to use procedure schema
        this.enableBulkInsert = this.configuration.hasOwnProperty("enableBulkInsert") ? String(this.configuration.enableBulkInsert) === "true" : true;
        this.enableStreamOutput = this.configuration.hasOwnProperty("enableStreamOutput") ? String(this.configuration.enableStreamOutput) === "true" : false;
        this.namedNativeOutputs = this.configuration.hasOwnProperty("namedNativeOutputs") ? this.configuration.namedNativeOutputs : [];
        this.enableNativeOutput = this.configuration.hasOwnProperty("enableNativeOutput") ? String(this.configuration.enableNativeOutput) === "true" : true;
        this.inputTableType = this.configuration.hasOwnProperty("inputTableType") &&
                                Object.keys(TableTypeHandlers).indexOf(this.configuration.inputTableType.toUpperCase()) !== -1 ?
                                    this.configuration.inputTableType : "GLOBAL";
        if (debug) {
            this.inputTableType = "LOCAL";
        }

        this.inputTableTypeHandler = new TableTypeHandlers[this.inputTableType](this.tempSchema, UnmanagedConnection ? UnmanagedConnection() : this.conn);

        this.async = this.configuration.hasOwnProperty("async") ? String(this.configuration.async) === "true" : false;
        this.overview = this.configuration.hasOwnProperty("overview") ? String(this.configuration.overview) === "true" : false;
        this.enableNativeOutput = this.enableNativeOutput && !this.overview; // overview will override native output
        this.timeFormat = this.configuration.hasOwnProperty("timeFormat") ? this.configuration.timeFormat : "HH24:MI";
        this.dateFormat = this.configuration.hasOwnProperty("dateFormat") ? this.configuration.dateFormat : "";
        this.timestampFormat = this.configuration.hasOwnProperty("timestampFormat") ? this.configuration.timestampFormat : "";

    }.bind(this)());

    this.tableTypes = [];
    this.parameters = [];
    this.inputs = [];
    this.outputs = [];
    this.pcall = null;

    // get procedure input/output parameters
    this.getParameters = function() {
        var conn = this.conn;
        var schema = this.schema;
        var procedureName = this.proc;
        var inputTableTypeHandler = this.inputTableTypeHandler;
        var sql = "SELECT DATA_TYPE_NAME, PARAMETER_TYPE, TABLE_TYPE_SCHEMA, TABLE_TYPE_NAME, PARAMETER_NAME, POSITION, HAS_DEFAULT_VALUE, IS_NULLABLE " +
                  "FROM PROCEDURE_PARAMETERS WHERE PROCEDURE_NAME = ? AND SCHEMA_NAME = ? ORDER BY POSITION ASC";

        var pstmt = conn.prepareStatement(sql);
        pstmt.setString(1, procedureName);
        pstmt.setString(2, schema);

        var rs = pstmt.executeQuery();
        while(rs.next()) {
            this.parameters.push({
                dataType: rs.getString(1),
                direction: rs.getString(2),
                schema: rs.getString(3) === "PUBLIC" ? schema : rs.getString(3),
                tableTypeName: rs.getString(4),
                name: rs.getString(5),
                position: rs.getInteger(6),
                hasDefaultValue: BOOLEAN_ENUM[rs.getString(7)],
                nullable: BOOLEAN_ENUM[rs.getString(8)]
            });
        }

        // get the table type column
        this.parameters.forEach(function(item) {
            if (item.dataType !== "TABLE_TYPE") {
                return;
            }

            if (item.schema && item.tableTypeName) {
                sql = "SELECT COLUMN_NAME, DATA_TYPE_NAME, LENGTH, SCALE, IS_NULLABLE, POSITION " +
                    "FROM TABLE_COLUMNS WHERE TABLE_NAME = ? AND SCHEMA_NAME = ? ORDER BY POSITION ASC";

                pstmt = conn.prepareStatement(sql);
                pstmt.setString(1, item.tableTypeName);
                pstmt.setString(2, item.schema);

            } else { // inline table type definition in procedure itself
                sql = "SELECT COLUMN_NAME, DATA_TYPE_NAME, LENGTH, SCALE, IS_NULLABLE, POSITION " +
                    "FROM PROCEDURE_PARAMETER_COLUMNS WHERE PROCEDURE_NAME = ? AND SCHEMA_NAME = ? AND PARAMETER_NAME = ? ORDER BY POSITION ASC";

                pstmt = conn.prepareStatement(sql);
                pstmt.setString(1, procedureName);
                pstmt.setString(2, schema);
                pstmt.setString(3, item.name);
            }

            rs = pstmt.executeQuery();

            var columns = [];
            while(rs.next()) {
                columns.push({
                    name: rs.getString(1),
                    type: rs.getString(2),
                    length: rs.getInteger(3),
                    scale: rs.getInteger(4),
                    nullable: BOOLEAN_ENUM[rs.getString(5)],
                    position: rs.getInteger(6)
                });
            }
            item.handler = new inputTableTypeHandler.handler(item.schema, item.tableTypeName, item.name, procedureName, columns);

            item.columns = columns;

            rs.close();
            pstmt.close();
        });

        this.outputs = this.parameters.filter(function(item) {
            return ["OUT", "INOUT"].indexOf(item.direction) !== -1;
        });

        this.inputs = this.parameters.filter(function(item) {
            return ["IN", "INOUT"].indexOf(item.direction) !== -1;
        });

        this.tableTypes = this.parameters.filter(function(item) {
            return item.dataType === "TABLE_TYPE";
        });

        this.scalarTypes = this.parameters.filter(function(item) {
            return item.dataType !== "TABLE_TYPE";
        });
    };

    this.Task = function() {
        this.taskName = this.proc + "_TASK";
        this.taskCanonicalName = this.tempSchema + ".\"" + this.taskName + "\"";

        this.create = function() {
            var sql = "CREATE TASK " + this.taskName + " USING PROCEDURE " + this.proc;
            this.conn.prepareStatement(sql).execute();
        };

        this.start = function() {
            var sql = "START TASK " + this.taskName + " ASYNC PROCEDURE PARAMETERS (" + this.parameters.map(function(param) {
                return param.handler.canonicalName;
            }).join(",") + ")";
            this.conn.prepareStatement(sql).execute();
        };

        this.drop = function() {
            var sql = "DROP TASK " + this.taskCanonicalName;
            this.conn.prepareStatement(sql).execute();
        };

        this.existence = (function() {
            var pstmt;
            try {
                pstmt = this.conn.prepareStatement("SELECT 1 FROM TASKS WHERE TASK_NAME = ? AND SCHEMA_NAME = ?");
                pstmt.setString(1, this.taskName);
                pstmt.setString(2, this.tempSchema);

                var rs = pstmt.executeQuery();
                return rs.next();

            } finally {
                if (pstmt) {
                    pstmt.close();
                }
            }
        }());

        this.executionId = (function() {
            var pstmt;
            try {
                pstmt = this.conn.prepareStatement("SELECT SESSION_CONTEXT('TASK_EXECUTION_ID') FROM DUMMY");

                var rs = pstmt.executeQuery();
                rs.next();

                return rs.getInteger(1);

            } finally {
                if (pstmt) {
                    pstmt.close();
                }
            }
        }());

        this.status = (function() {
            var pstmt;
            try {
                pstmt = this.conn.prepareStatement("SELECT CONNECTION_ID, TRANSACTION_ID, START_TIME, END_TIME, DURATION, STATUS, PROCESS_RECORDS, TOTAL_PROGRESS_PERCENT FROM M_TASKS WHERE TASK_NAME = ? AND SCHEMA_NAME = ? AND TASK_EXECUTION_ID = ?");
                pstmt.setString(1, this.taskName);
                pstmt.setString(2, this.tempSchema);
                pstmt.setInteger(3, this.executionId);

                var rs = pstmt.executeQuery();

                if (rs.next()) {
                    return {
                        CONNECTION_ID: rs.getInteger(1),
                        TRANSACTION_ID: rs.getInteger(2),
                        START_TIME: rs.getTimestamp(3),
                        END_TIME: rs.getTimestamp(4),
                        DURATION: rs.getInteger(5),
                        STATUS: rs.getString(6),
                        PROCESS_RECORDS: rs.getInteger(7),
                        TOTAL_PROGRESS_PERCENT: rs.getInteger(8)
                    };
                }
            } finally {
                if (pstmt) {
                    pstmt.close();
                }
            }
        }());

    }.bind(this);


    this.initial = function() {
        this.conn.setAutoCommit(false);

        var sql = "SET SCHEMA " + this.schema;
        this.conn.prepareStatement(sql).execute();

        this.getParameters();
    };

    this.createInputTempTables = function() {
        var inputs = that.tableTypes.filter(function(item){
            return ["IN", "INOUT"].indexOf(item.direction) !== -1;
        });

        // only when there's no separated connection and table type input exists then need to set DDL AUTO COMMIT
        if(!UnmanagedConnection && inputs.length > 0) {
            var sql = "SELECT value FROM M_SESSION_CONTEXT WHERE CONNECTION_ID = CURRENT_CONNECTION AND KEY = 'DDL_AUTO_COMMIT'";
            var rs = that.conn.prepareStatement(sql).executeQuery();
            var ddlCommit = true;

            if (rs.next()) {
                ddlCommit = !(rs.getString(1) === "FALSE");
            }

            if (ddlCommit) {
                sql = "SET TRANSACTION AUTOCOMMIT DDL OFF";
                that.conn.prepareStatement(sql).execute();
            }
        }

        inputs.forEach(function(item){
            if (!item.external) {
                item.handler.create();
            }
        });
    };

    // use string as type for the reason it gets from TABLE_COLUMNS view
    this.setScalar = function(type, position, value, statement, format) {
        if (value === null || value === undefined) {
            statement.setNull(position);
            return;
        }

        switch(type) {
            case "BIGINT":
                statement.setBigInt(position, parseInt(value, 10));
                break;
            case "INTEGER":
                statement.setInteger(position, parseInt(value, 10));
                break;
            case "SMALLINT":
                statement.setSmallInt(position, parseInt(value, 10));
                break;
            case "TINYINT":
                statement.setTinyInt(position, parseInt(value, 10));
                break;
            case "VARCHAR":
            case "CHAR":
                statement.setString(position, String(value));
                break;
            case "NVARCHAR":
            case "NCHAR":
                statement.setNString(position, String(value));
                break;
            case "TEXT":
                statement.setText(position, String(value));
                break;
            case "TIMESTAMP":
                // auto convert if the value is of string type
                if(typeof value === "string" && !format) {
                    var parsed = new Date(Date.parse(value));

                    // local time need convert to UTC time
                    value = new Date(parsed.getTime() + parsed.getTimezoneOffset() * 60 * 1000);
                } else if (Object.prototype.toString.call(value) === "[object Date]") {
                    format = undefined; // ignore the format option

                    // local time need convert to UTC time
                    value = new Date(value.getTime() + value.getTimezoneOffset() * 60 * 1000);
                }

                statement.setTimestamp(position, value, format);
                break;
            case "DATE":
                statement.setDate(position, value, that.dateFormat);
                break;
            case "DECIMAL":
                statement.setDecimal(position, Number(value));
                break;
            case "REAL":
                statement.setReal(position, value);
                break;
            case "FLOAT":
                statement.setFloat(position, Number(value));
                break;
            case "DOUBLE":
                statement.setDouble(position, Number(value));
                break;
            case "CLOB":
                statement.setClob(position, value);
                break;
            case "NCLOB":
                statement.setNClob(position, value);
                break;
            case "TIME":
                statement.setTime(position, value, that.timeFormat);
                break;
            case "BINARY":
            case "VARBINARY":
                statement.setBString(position, value);
                break;
            default: // fallback
                statement.setString(position, String(value));
                break;
        }
    };

    // use enumeration for the reason it gets from result set metadata
    this.getScalar = function(type, position, resultSet) {
        var value;
        switch(type) {
            case $.db.types.BIGINT:
                var v = resultSet.getBigInt(position);
                value = v === null ? null : String(v);  // not make null to "null"
                break;
            case $.db.types.BINARY:
                value = resultSet.getBString(position);
                break;
            case $.db.types.BLOB:
                value = resultSet.getBlob(position);
                break;
            case $.db.types.CHAR:
            case $.db.types.VARCHAR:
                value = resultSet.getString(position);
                break;
            case $.db.types.CLOB:
                value = resultSet.getClob(position);
                break;
            case $.db.types.DECIMAL:
                value = resultSet.getDecimal(position);
                break;
            case $.db.types.DOUBLE:
                value = resultSet.getDouble(position);
                break;
            case $.db.types.INT:
            case $.db.types.INTEGER:
            case $.db.types.SMALLINT:
            case $.db.types.TINYINT:
                value = resultSet.getInteger(position);
                break;
            case $.db.types.NCHAR:
            case $.db.types.NVARCHAR:
            case $.db.types.SHORTTEXT:
                value = resultSet.getNString(position);
                break;
            case $.db.types.NCLOB:
                value = resultSet.getNClob(position);
                break;
            case $.db.types.TEXT:
                value = resultSet.getText(position);
                break;
            case $.db.types.REAL:
                value = resultSet.getReal(position);
                break;
            case $.db.types.TIMESTAMP:
                // the native getTimestamp treat the UTC time as local time, so need to minus the timezone info
                var t = resultSet.getTimestamp(position);
                value = t ? new Date(t.getTime() - t.getTimezoneOffset() * 60 * 1000) : null;
                break;
            case $.db.types.DATE:
                value = resultSet.getDate(position);
                break;
            case $.db.types.SECONDDATE:
                value = resultSet.getSeconddate(position);
                break;
            case $.db.types.TIME:
                value = resultSet.getTime(position);
                break;
            case $.db.types.VARBINARY:
                value = resultSet.getBString(position);
                break;
            case $.db.types.FLOAT:
                value = resultSet.getFloat(position);
                break;
            case 74: // maybe ST_GEOMETRY
                value = resultSet.getString(position);
                break;
            default:
                value = resultSet.getString(position);
                break;
        }
        return value;
    };

    // set scalar value and insert table type value into a temporary table
    this.setValues = function(args) {
        var pcall = this.pcall;
        var conn = (debug && UnmanagedConnection) ? UnmanagedConnection() : this.conn;
        var pstmt;
        var setScalar = this.setScalar;
        var that = this;

        var tableIndex = 0;
        this.inputs.forEach(function(param) {
            if (param.dataType === "TABLE_TYPE") {
                var arg = args[param.position - 1];

                if (arg === undefined || arg === null || param.external) {
                    return;
                }

                if (!Array.isArray(arg)) {
                    throw new Error("Invalid Argument Type, expected an Array, got " + typeof arg);
                }

                var sql =
                    "INSERT INTO " +
                    param.handler.canonicalName +
                    " VALUES (" + (new Array(param.columns.length + 1)).join(",?").slice(1) + ")";

                pstmt = conn.prepareStatement(sql);

                // for only one row, bulk insert doesn't work, fml!
                var bulk = that.enableBulkInsert && arg.length > 1;

                if (bulk) {
                    pstmt.setBatchSize(arg.length); // batch size should exactly equal to row size
                }

                arg.forEach(function(itm) {
                    param.columns.forEach(function(i){
                        setScalar(i.type, i.position, itm[i.name], pstmt);
                    });
                    if (bulk) {
                        pstmt.addBatch();
                    } else {
                        pstmt.executeUpdate();
                    }
                });

                if (bulk) {
                    pstmt.executeBatch();
                }

                tableIndex++;
            } else {
                setScalar(param.dataType, param.position - tableIndex, args[param.position - 1], pcall);
            }
        });
    };

    // generate stored procedure invokation statement
    this.buildSQL = function() {
        var args = this.args;
        var conn = this.conn;

        function isPhysicalTable(name) {
            var sql = "SELECT 1 FROM TABLES WHERE SCHEMA_NAME || '.' || TABLE_NAME = ? OR TABLE_NAME = ?";
            var pstmt = conn.prepareStatement(sql);
            name = name.replace(/"/g, "");
            pstmt.setString(1, name);
            pstmt.setString(2, name);

            var rs = pstmt.executeQuery();

            return rs.next();
        }

        this.sql = "CALL " +
            quote(this.schema) + "." + quote(this.proc) +
            "(" + this.parameters.map(function(item) {
                var arg = args[item.position - 1];
                if (item.dataType === "TABLE_TYPE" &&
                        ["IN", "INOUT"].indexOf(item.direction) !== -1){
                    if ((typeof arg === "string") && isPhysicalTable(arg)) {
                        item.external = true;

                        return arg;
                    } else {
                        return item.handler.canonicalName;
                    }
                } else {
                    return "?";
                }
            }).join(",") + ")" + (this.enableNativeOutput ? "" : " WITH OVERVIEW");
    };

    // recycle resource
    this.finalize = function() {
        var conn = this.conn;

        // try to drop created input temporary table
        this.tableTypes.forEach(function(item){
            if (item.direction === "OUT") {
                return;
            }
            try {
                if (!item.external) {
                    item.handler.finalize();
                }
            } catch (e) {
                $.trace.error(e);
            }
        });

        // if connection is self owned, close it
        if (conn.selfOwned) {
            if (that.exceptionSignal) {
                conn.rollback();
            } else {
                conn.commit();
            }

            if (!(that.enableStreamOutput || conn.railxsManaged)) {
                conn.close();
            }
        }

    };

    this.normalizeArguments = function(values) {
        var args = Array.prototype.slice.call(values, 0);

        if (args.length === 1 && Object.prototype.toString.call(args[0]) === "[object Object]") { // convert to array
            args = this.inputs.map(function(param) {
                return args[0][param.name];
            });
        }

        if (args.length < this.inputs.filter(function(item) { return !item.nullable;}).length) { // the parameters allow null could not set through
            throw new Error("Invalid Argument Number, expected " + this.inputs.length + ", got " + args.length);
        }

        this.args = args;
    };

    this.initial();

    return function() {
        try {
            that.normalizeArguments(arguments);

            that.createInputTempTables();
            that.buildSQL();
            that.pcall = that.conn.prepareCall(that.sql);
            that.setValues(that.args);

            var getTableOutputGenerator = function(rs) {
                if (!rs) {
                    return;
                }
                var metadata = rs.getMetaData();
                var row, value, i;
                while(rs.next()) {
                    row = {};
                    for (i = 1; i <= metadata.getColumnCount(); ++i) {
                        value = that.getScalar(metadata.getColumnType(i), i, rs);
                        row[metadata.getColumnLabel(i)] = value;
                    }

                    // lazy load all results
                    yield row;
                }
            };

            var getTableOutput = function(rs) {
                if (that.enableStreamOutput) {
                    return getTableOutputGenerator(rs);
                } else {
                    var result = [];
                    var generator = getTableOutputGenerator(rs);

                    for (var row in generator) {
                        result.push(row);
                    }

                    return result;
                }
            };

            that.pcall.execute();

            var results = {};
            var nativeOutput = true;
            var firstResult;
            that.outputs.forEach(function(item, index, array) {
                if (that.overview && index === 0) {
                    firstResult = getTableOutput(that.pcall.getResultSet());
                    nativeOutput = false;
                }

                if (item.dataType === "TABLE_TYPE") {
                    if (that.overview) {
                        results[item.name] = firstResult.filter(function(r) {
                            return r.variable === item.name;
                        })[0].table;
                    } else {
                        let rs = that.pcall.getResultSet();
                        results[item.name] = getTableOutput(rs);

                        // if after the last output table type still can get result set
                        // then consider there are still native output need to be consumed
                        nativeOutput = that.pcall.getMoreResults();
                    }
                } else {
                    var mapping = {};
                    Object.keys($.db.types).forEach(function(key) {
                        mapping[key.toUpperCase()] = $.db.types[key];
                    });

                    // the scalar output index in pcall is its original postion minus all input table types type
                    // means call proc(1, 2, "#VAR_INPUT_23423423", ?), the output scalar index is 4(original) - 1(table type count) = 3
                    let offset = that.tableTypes.filter(function(itm, idx, arr) { return itm.position < item.position && itm.direction === "IN"; }).length;
                    //results[item.name] = that.getScalar(mapping[item.dataType], item.position - offset, that.pcall);
                    results[item.name] = that.getScalar($.db.types[item.dataType], item.position - offset, that.pcall);
                }
            });

            if (nativeOutput) {
                let loop = 1;
                do {
                    var result = getTableOutput(that.pcall.getResultSet());
                    if (result) {
                        results[that.namedNativeOutputs[loop - 1] || "__VAR_OUT_" + loop + "__"] = result;
                    }
                    loop++;
                } while(that.pcall.getMoreResults());
            }

            return results;
        } catch (e) {
            that.exceptionSignal = true;
            throw e;
        } finally {
            that.finalize();
        }
    };
}

var defineProcedure = (function() {
    return function() {
        return SimpleProcedure.apply(Object.create(SimpleProcedure.prototype), arguments);
    };
}());

var procedure = defineProcedure;
var Procedure = defineProcedure;