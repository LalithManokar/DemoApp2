var lib = $.import('/sap/tm/trp/service/xslib/railxs.xsjslib');
var proc = $.import('/sap/tm/trp/service/xslib/procedures.xsjslib');
var messages = $.import('/sap/tm/trp/service/xslib/messages.xsjslib');
var constants = $.import('/sap/tm/trp/service/xslib/constants.xsjslib');
var model = $.import("/sap/tm/trp/service/model/dataManagement.xsjslib");
var facetFilterUtils = $.import('/sap/tm/trp/service/xslib/utils.xsjslib').facetFilterUtils;
var logger = new($.import("/sap/tm/trp/service/xslib/applog.xsjslib")).AppLog();
var jobFactory = $.import("/sap/tm/trp/service/common/job/JobFactory.xsjslib");

var DATA_ARCHIVE_READ_MODE = "sap.tm.trp.service::DataArchiveRead";
var DATA_ARCHIVE_CONFIGURE_MODE = "sap.tm.trp.service::DataArchiveConfigure";
var DATA_ARCHIVE_RULE_CREATION_MODE = "sap.tm.trp.service::DataArchiveRuleCreation";
var DATA_ARCHIVE_RULE_EXECUTION_MODE = "sap.tm.trp.service::DataArchiveRuleExecution";
var DATA_ARCHIVE_NO_ACCESS = "sap.tm.trp.service::DataArchiveNoAccess";
var output = {};

var dataManagementService = new lib.SimpleRest({
    name: "Data Management",
    desc: "Manages the data archiving ,unarchiving and deletion",
    model: new model.DataManagement()
});

/**
 * validates the execution of a rule
 */
dataManagementService.validateExecute = function(params) {
    var procName,
        procHandle,
        procResult,
        result,
        conn;
    try {
        conn = $.db.getConnection($.db.isolation.READ_COMMITTED);
        procName = "sap.tm.trp.db.archive::p_data_archive_execute_validate";

        // this is to ensure there are no select-update or select-insert locks
        procHandle = new proc.procedure(constants.SCHEMA_NAME, procName, {
            "connection": conn
        });
        // procHandle = new proc.procedure(constants.SCHEMA_NAME, procName);
        procResult = procHandle(dateFrom);
        result = {
            success: procResult.STATUS_CODE,
            STATUS_MESSAGE: procResult.STATUS_MESSAGE,
        };
        logger.success("ARCHIVE_EXECUTE_VALIDATED",params.obj.ruleId);
    } catch (e) {
        logger.error("ARCHIVE_EXECUTE_VALIDATE_FAILED",
            params.obj.ruleId,
            e);
        throw new lib.InternalError(messages.MSG_RULE_VALIDATION_FAIL, e);
    }
    return result;
}

/**
 * schedule a job for the rule
 */
dataManagementService.executeRule = function(params) {
    var ruleId = params.obj.ruleId;
    try {
        jobFactory.create("executeRule",
            "sap.tm.trp.service.archive",
            "executeRule",
            "execute", {
                "ruleId": ruleId,
                "user": $.session.getUsername()
            });
        logger.success("RULE_JOB_CREATED", ruleId);
    } catch (e) {
        logger.error("RULE_JOB_CREATION_FAIL",
            ruleId,
            e);

        throw new lib.InternalError(messages.MSG_RULE_EXECUTION_FAIL, e);
    }
}

// validate rule name
function doesRuleExist(ruleName) {
    var sqlGet = "SELECT COUNT(1) AS COUNT FROM \"sap.tm.trp.db.archive::t_archive_rule\" WHERE RULE_NAME=? ";
    var conn, rs, count;
    var doesRuleNameExist = false;
    try {
        conn = $.hdb.getConnection();
        rs = conn.executeQuery(sqlGet, ruleName);
        count = rs[0]["COUNT"];
        if (count > 0) {
            doesRuleNameExist = true;
        }
        logger.success("RULE_NAME_VALIDATED", ruleName);
    } catch (e) {
        logger.error("RULE_NAME_VALIDATION_FAILURE",
            ruleName,
            e);
        throw e;
    } finally {
        conn.close();
    }
    return doesRuleNameExist;
}

/**
 *
 */
dataManagementService.createRule = function(params) {
    var procName,
        createProc,
        procResult;
    var rule_name = params.obj.rule_name,
        rule_desc = params.obj.rule_desc,
        table_id = params.obj.table_id,
        date_from = params.obj.date_from,
        date_from = params.obj.date_from,
        date_to = params.obj.date_to,
        type = params.obj.type,
        // this needs to be deleted
        unarchive_type = 1; // params.obj.unarchive_type;

    try {
        if (doesRuleExist(rule_name)) {
            throw new lib.InternalError(messages.MSG_NAME_ALREADY_EXISTS);
        }
        procName = "sap.tm.trp.db.archive::p_archive_rule_create";
        createProc = new proc.procedure(constants.SCHEMA_NAME, procName);
        procResult = createProc(rule_name, rule_desc, table_id, date_from,
            date_to, type, unarchive_type);
        if (procResult.STATUS_CODE == 0) {

            logger.error("DATA_ARCHIVE_RULE_CREATION_FAILED", rule_name);
            throw new lib.InternalError(messages.MSG_RULE_CREATION_FAIL, e);
        }

        var result = {
            success: procResult.STATUS_CODE,
            ruleId: procResult.RULE_ID
        }
        logger.success("DATA_ARCHIVE_RULE_CREATION_SUCCESS",rule_name);

        return result;
    } catch (e) {
        logger.error("DATA_ARCHIVE_RULE_CREATION_FAILED",
            rule_name,
            e);

        if (e.message === 'MSG_NAME_ALREADY_EXISTS') {
            throw new lib.InternalError(e.message, e);
        }

        throw new lib.InternalError(messages.MSG_RULE_CREATION_FAIL, e);

    }
}

/**
 *
 */
dataManagementService.deleteRule = function(params) {
    var procName,
        deleteProc,
        result;
    var ruleId = params.obj.ruleId;
    try {
        procName = "sap.tm.trp.db.archive::p_archive_rule_delete";
        deleteProc = new proc.procedure(constants.SCHEMA_NAME, procName);
        deleteProc(ruleId);
        result = {
            success: 1
        }
        logger.success("ARCHIVE_RULE_DELETED", ruleId);
    } catch (e) {
        logger.error("ARCHIVE_RULE_DELETE_FAILED",
            ruleId,
            e
        );
        throw new lib.InternalError(messages.MSG_RULE_DELETION_FAIL, e);
    }
    return result;
}

/**
 *
 * @param datasource_name
 * @param database_name
 * @param schema_name
 * @returns
 */
function validateConfiguration(configuration_type, datasource_name,
    database_name, schema_name) {
    var procName,
        validateProc,
        results;
    var tableCode = 'ALL';
    try {
        procName = "sap.tm.trp.db.archive::p_archive_config_setup";
        validateProc = new proc.procedure(constants.SCHEMA_NAME, procName);
        results = validateProc(configuration_type, datasource_name,
            database_name, schema_name, tableCode);
        logger.success("ARCHIVE_CONFIG_VALIDATED",
            datasource_name,
            database_name,
            schema_name);
    } catch (e) {
        logger.error("ARCHIVE_CONFIG_VALIDATE_FAILED",
            datasource_name,
            database_name,
            schema_name,
            e
        );
        throw new lib.InternalError(messages.MSG_ARCHIVE_CONFIG_VALIDATION_FAIL, e);
    }
    return results;
}

/**
 *
 */
function clearConfiguration() {
    var procName,
        procHandle,
        result;
    try {
        procName = "sap.tm.trp.db.archive::p_archive_clear_configuration";
        procHandle = new proc.procedure(constants.SCHEMA_NAME, procName);
        result = procHandle();
        logger.success("ARCHIVE_CONFIG_CLEAR");
    } catch (e) {
        logger.error("ARCHIVE_CONFIG_CLEAR_FAILED", e)
        throw e;
    }
}



/**
 *
 */
dataManagementService.configure = function(params) {

    var exist_flag;
    var configuration_type = params.obj.configuration_type,
        configuration_object = JSON
        .stringify(params.obj.configuration_object),
        datasource_name = params.obj.datasource_name,
        //database_name = params.obj.database_name === null ? "NULL" : params.obj.database_name,
        adapter_type = params.obj.adapter_type,
        adapter_name = params.obj.adapter_name,
        schema_name = params.obj.schema_name;

    var procName,
        createConfigProc,
        createResult,
        conn;

    if (!datasource_name)
    {
        datasource_name = '';
    }
    if (!adapter_type)
    {
        adapter_type = '';
    }
    if (!adapter_name)
    {
        adapter_name = '';
    }
    if (!schema_name)
    {
        schema_name = '';
    }

        conn = $.hdb.getConnection();
        conn.setAutoCommit(false);

        procName = "sap.tm.trp.db.archive::sp_archive_archive_configure";
        createConfigProc = conn.loadProcedure(constants.SCHEMA_NAME, procName);

        createResult = createConfigProc(configuration_type, adapter_type,
            adapter_name, datasource_name, schema_name,
            configuration_object);

        //check status code
        if (createResult.STATUS_CODE == 0)
        {
            conn.commit();
            exist_flag = createResult.EXIST_FLAG;
            //create temp table
            createTempTable(configuration_type, exist_flag);
        }
        else
        {
            conn.rollback();
            throw new lib.InternalError(createResult.MESSAGE_KEY);
            logger.error("ARCHIVE_CONFIG_CREATE_FAILED",
            JSON.stringify(params),
            e);

        }

        var result = {
            SUCCESS: createResult.STATUS_CODE
        };
        logger.success("ARCHIVE_CONFIG_CREATE", JSON.stringify(params));



    return result;
}

function createTempTable(configType, existFlag)
{
    var conn, procName, procCreateTempTab;

    if (existFlag == 'F')
    {
        conn = $.hdb.getConnection();
        conn.setAutoCommit(false);
        procName = "sap.tm.trp.db.archive::sp_archive_archive_create_temp_tab";
        procCreateTempTab = conn.loadProcedure(constants.SCHEMA_NAME,procName);
        procCreateTempTab();
        conn.commit();
        conn.close();

    }
}

/**
 *
 */
dataManagementService.getConfiguration = function() {
    var sqlGet = "SELECT * FROM \"sap.tm.trp.db.archive::t_archive_configuration\"";
    var sqlEnableEdit = "SELECT COUNT(1) AS COUNT FROM \"sap.tm.trp.db.archive::t_archive_execution_detail\"";
    var sqlSupportedAdapters = "SELECT ID,ADAPTER_NAME,DB_NAME FROM \"sap.tm.trp.db.archive::t_data_archive_adapters\"";

    var conn,
        pstmt,
        rs,
        row;
    var result = {};
    try {
        conn = $.hdb.getConnection();

        rs = conn.executeQuery(sqlGet);
        for (row in rs) {
            result[rs[row]["KEY"]] = rs[row]["VALUE"];
        }

        rs = conn.executeQuery(sqlEnableEdit);
        result["ENABLED"] = rs[0]["COUNT"] > 0 ? false : true;

        var adapters = [];
        rs = conn.executeQuery(sqlSupportedAdapters);
        for (row in rs) {
            adapters.push({
                "ID": rs[row]["ID"],
                "ADAPTER_NAME": rs[row]["ADAPTER_NAME"],
                "DB_NAME": rs[row]["DB_NAME"] == 0 ? false : true
            });
        }
        result["ADAPTERS"] = adapters;
        logger.success("CONFIG_LOAD")

    } catch (e) {
        logger.error("CONFIG_LOAD_FAIL", e);
        throw new lib.InternalError(messages.MSG_ARCHIVE_CONFIG_LOAD_FAIL, e);
    } finally {
        conn.close();
    }
    return result;
}

/**
 *
 * @param tableId
 * @returns
 */
function getMetadata(tableId) {
    var connect,
        ps,
        result,
        row,
        rs,
        schemaName,
        cols = Object.create(null),
        items = Object.create(null),
        dType,
        index;

    try {

        var query =
            "select TABLE_NAME,PRIMARY_KEY_COL,DATE_COLUMN_NAME,IS_TM from \"sap.tm.trp.db.archive::t_archive_metadata\" where ID=?";

        connect = $.hdb.getConnection();
        rs = connect.executeQuery(query, tableId);

        for (row in rs) {
            output = {
                tableName: rs[row]["TABLE_NAME"],
                PKeys: rs[row]["PRIMARY_KEY_COL"],
                dateField: rs[row]["DATE_COLUMN_NAME"],
                search_fields: [],
                is_tm: rs[row]["IS_TM"]
            };
        }
        if (output.is_tm === 0) {

            output.tableName = output.tableName + "_warm";

        } else {
            output.tableName = output.tableName + "_warm";
        }

        schemaName = constants.SCHEMA_NAME;

        query = "select COLUMN_NAME,DATA_TYPE_NAME from \"SYS\".\"TABLE_COLUMNS\" where SCHEMA_NAME=? and TABLE_NAME=?";
        rs = connect.executeQuery(query, schemaName, output.tableName);
        for (row in rs) {
            cols[rs[row]["COLUMN_NAME"]] = rs[row]["DATA_TYPE_NAME"];
        }

        var primaryKeys = output.PKeys.split();
        primaryKeys.push("TRP_RULE_ID");
        primaryKeys.push("TRP_EXECUTION_ID");
        var i;
        for (i in primaryKeys) {

            delete cols[primaryKeys[i]];
        }
        for (var index in cols) {
            dType = cols[index];
            if ((dType === "NVARCHAR") || (dType === "VARCHAR")) {
                output.search_fields.push(index);
            }
        }
        if (output.search_fields.length === 0) {
            output.isSearchable = false;
        } else {
            output.isSearchable = true;
        }
        output.columns = cols;
    } catch (e) {
        logger.error("METADATA_GET_FAILED",
            tableId,
            e);
        throw e;
    } finally {
        connect.close();
    }
    return cols;
}

/**
 *
 * @param type
 * @param position
 * @param resultSet
 */
function getScalar(type, position, resultSet) {
    var value;
    switch (type) {
        case xsruntime.db.types.BIGINT:
            let
                v = resultSet.getBigInt(position);
            value = v === null ? null : String(v); // not make null to "null"
            break;
        case xsruntime.db.types.BINARY:
            value = resultSet.getBString(position);
            break;
        case xsruntime.db.types.BLOB:
            value = resultSet.getBlob(position);
            break;
        case xsruntime.db.types.CHAR:
        case xsruntime.db.types.VARCHAR:
            value = resultSet.getString(position);
            break;
        case xsruntime.db.types.CLOB:
            value = resultSet.getClob(position);
            break;
        case xsruntime.db.types.DECIMAL:
            value = resultSet.getDecimal(position);
            break;
        case xsruntime.db.types.DOUBLE:
            value = resultSet.getDouble(position);
            break;
        case xsruntime.db.types.INT:
        case xsruntime.db.types.INTEGER:
        case xsruntime.db.types.SMALLINT:
        case xsruntime.db.types.TINYINT:
            value = resultSet.getInteger(position);
            break;
        case xsruntime.db.types.NCHAR:
            value = resultSet.getNString(position);
            break;
        case xsruntime.db.types.NCLOB:
            value = resultSet.getNClob(position);
            break;
        case xsruntime.db.types.NVARCHAR:
            value = resultSet.getNString(position);
            break;
        case xsruntime.db.types.REAL:
            value = resultSet.getReal(position);
            break;
        case xsruntime.db.types.TIMESTAMP:
            // the native getTimestamp treat the UTC time as local time, so need to
            // minus the timezone info
            let
                t = resultSet.getTimestamp(position);
            value = t ? new Date(t.getTime() - t.getTimezoneOffset() * 60 * 1000) : null;
            break;
        case xsruntime.db.types.VARBINARY:
            value = resultSet.getBString(position);
            break;
        case 74: // maybe ST_GEOMETRY
            value = resultSet.getString(position);
            break;
        default:
            value = resultSet.getString(position);
            break;
    }
    return value;
}

/**
 *
 */
dataManagementService.getArchivedTables = function() {
    var sql,
        conn,
        rs,
        result = [],
        row;
    try {
        sql = "SELECT DISTINCT TABLE_ID,TABLE_CODE AS TABLE_NAME " + "FROM \"sap.tm.trp.db.archive::t_archive_rule\" T1 " +
            "INNER JOIN \"sap.tm.trp.db.archive::t_archive_metadata\" T2 " + "ON T1.TABLE_ID = T2.ID WHERE T1.TYPE=1 AND T1.ACTIVE=1";
        conn = $.hdb.getConnection();
        rs = conn.executeQuery(sql);
        for (row in rs) {
            result.push({
                ID: rs[row]["TABLE_ID"],
                NAME: rs[row]["TABLE_NAME"]
            });
        }
    } catch (e) {
        logger.error("ARCHIVE_TABLES_GET_FAILED", e);
        throw new lib.InternalError(messages.MSG_GET_ARCHIVED_TABLES_FAIL, e);
    } finally {
        conn.close();
    }
    return result;
}

/**
 *
 */
dataManagementService.getArchiveRules = function(params) {
    var sql,
        conn,
        rs,
        result = [],
        tableId,
        row;
    try {
        tableId = params.obj.tableId
        sql = "SELECT RULE_NAME,ID FROM \"sap.tm.trp.db.archive::t_archive_rule\" WHERE TABLE_ID=? AND ACTIVE=1 AND TYPE=1";
        conn = $.hdb.getConnection();
        rs = conn.executeQuery(sql, tableId);
        for (row in rs) {
            result.push({
                Id: rs[row]["ID"],
                ruleName: rs[row]["RULE_NAME"]
            });
        }
    } catch (e) {
        logger.error("ARCHIVE_RULES_GET_FAILED", e);
        throw new lib.InternalError(messages.MSG_GET_ARCHIVE_RULES_BY_TABLE, e);
    } finally {
        conn.close();
    }
    return result;
}

function setScalar(type, position, value, statement) {
    if (value === null || value === undefined) {
        statement.setNull(position);
        return;
    }

    switch (type) {
        case "BIGINT":
            statement.setBigInt(position, value);
            break;
        case "INTEGER":
        case "TINYINT":
        case "SMALLINT":
            statement.setInteger(position, parseInt(value, 10));
            break;
        case "NVARCHAR":
        case "VARCHAR":
        case "CHAR":
            statement.setString(position, String(value));
            break;
        case "TIMESTAMP":
            // auto convert if the value is of string type
            // if(typeof(value) === "string") value = new Date(Date.parse(value));
            // local time need convert to UTC time
            //let t = new Date(value.getTime() + value.getTimezoneOffset() * 60 * 1000);
            statement.setTimestamp(position, value);
            break;
        case "DATE":
            statement.setDate(position, value);
            break;
        case "DECIMAL":
            statement.setDecimal(position, value);
            break;
        default: // fallback
            statement.setString(position, String(value));
            break;
    }
};

/**
 * get archived data
 */
dataManagementService.getArchivedData = function(params) {
    var tableId, ruleId, dateFrom, dateTo, searchText, pageNumber, pageSize;
    tableId = $.request.parameters.get("tableId");
    ruleId = $.request.parameters.get("ruleId");
    dateFrom = $.request.parameters.get("dateFrom");
    dateTo = $.request.parameters.get("dateTo");
    if (!dateFrom) {
        dateFrom = '';
    } else {
        dateFrom = new Date(Date.parse(dateFrom));
    }
    if (!dateTo) {
        dateTo = '';
    } else {
        dateTo = dateTo = new Date(Date.parse(dateTo));
    }
    searchText = $.request.parameters.get("searchText");
    pageNumber = $.request.parameters.get("pageNumber");
    pageSize = $.request.parameters.get("pageSize");
    var metaData = getMetadata(tableId);

    var query, conn, ps, result, items = Object.create(null),
        j, r, colNames = [],
        oOut = {
            totalCount: 0,
            finalSet: []
        };

    pageNumber -= 1;
    try {
        var offsetVal = parseInt((pageNumber == 0) ? 0 : ((pageNumber * pageSize) + 1), 10);
        // construct select
        var where_clause = [],
            where_vals = [],
            where_types = [];
        var whereClause = "";

        if ((ruleId !== -1) && (ruleId !== 0)) {
            where_clause.push("TRP_RULE_ID = ?");
            where_vals.push(ruleId);
            where_types.push("BIGINT");
        }

        if (dateFrom !== '') {
            where_clause.push(output.dateField + ">= ? ");
            where_vals.push(dateFrom);
            where_types.push("TIMESTAMP");
        };
        if (dateTo !== '') {
            where_clause.push(output.dateField + "<  ?");
            where_vals.push(dateTo);
            where_types.push("TIMESTAMP");
        }
        var j = 0;
        var searchWhereStr = "";
        var searchVal = searchText;
        if ((output.isSearchable) && (searchVal !== "")) {
            var searchFieldList = output.search_fields;
            if (searchFieldList.length == 1) {
                where_clause.push(" LOWER(" + searchFieldList[j] + ") like ?");
                where_vals.push("%" + searchVal.toLowerCase() + "%");
                where_types.push("NVARCHAR");
            } else {

                for (var j = 0; j < searchFieldList.length; j++) {

                    switch (j) {
                        case 0:
                            {
                                searchWhereStr = searchWhereStr + "( ";
                                searchWhereStr = searchWhereStr + " LOWER(" + searchFieldList[j] + ") like ? or ";
                                break;
                            }
                        case searchFieldList.length - 1:
                            {
                                searchWhereStr = searchWhereStr + " LOWER(" + searchFieldList[j] + ") like ?";
                                searchWhereStr = searchWhereStr + " )";
                                break;
                            }
                        default:
                            {
                                searchWhereStr = searchWhereStr + " LOWER(" + searchFieldList[j] + ") like ? or ";
                            }
                    }
                    where_vals.push("%" + searchVal.toLowerCase() + "%");
                    where_types.push("NVARCHAR");
                }
                where_clause.push(searchWhereStr);

            }

        }

        if (where_clause.length > 0) {
            whereClause = " where " + where_clause.join(" and ");

        }

        colNames = Object.keys(metaData);
        conn = $.db.getConnection();
        var countQuery = 'select count(1),\'total\' as "totalRows" from "' + constants.SCHEMA_NAME + '"."' + output.tableName + '" ' +
            whereClause;
        ps = conn.prepareStatement(countQuery);
        var k;
        for (k = 0; k < where_vals.length; k++) {
            setScalar(where_types[k], k + 1, where_vals[k], ps);
        }

        result = ps.executeQuery();
        while (result.next()) {
            oOut.totalCount = result.getInteger(1);
        }

        whereClause += (whereClause !== "") ? " ) where rownum between ? and ? " : " ) where rownum between ? and ?";
        where_vals.push(offsetVal);
        where_types.push("INTEGER");
        where_vals.push(offsetVal + pageSize - 1);
        where_types.push("INTEGER");

        query = 'select ' + colNames +
            ' from (select * from (select *,row_number() over () as rownum from  "' + constants.SCHEMA_NAME +
            '"."' + output.tableName + '" ' + whereClause + ')';

        ps = conn.prepareStatement(query);
        for (k = 0; k < where_vals.length; k++) {
            setScalar(where_types[k], k + 1, where_vals[k], ps);
        }

        result = ps.executeQuery();

        while (result.next()) {
            r = {};
            for (j = 0; j < colNames.length; j++) {
                r[colNames[j]] = getScalar(metaData[colNames[j]],
                    j + 1, result);

            }

            oOut.finalSet.push(r);
        }
        ps.close();

        oOut.metaInfo = output;
        logger.success("ARCHIVE_DATA_RETRIEVED", JSON.stringify(params));
    } catch (e) {
        logger.error("ARCHIVE_DATA_RETRIEVE_FAILED",
            JSON.stringify(params),
            e);

        throw new lib.InternalError(messages.MSG_RETRIEVE_ARCHIVE_DATA_FAIL, e);
    } finally {
        conn.close();
    }
    return oOut;
},

/**
 *
 */
dataManagementService.facetFilter = function(params) {

    var filterProc = new proc.procedure(constants.SCHEMA_NAME, [
                'sap.tm.trp.db.archive', 'sp_archive_facet_filter']
        .join('::'));
    var filteredData = filterProc(params.obj.search,
        params.obj.PAGE_TYPE, params.obj.TYPE_LIST_INPUT,
        params.obj.STATUS_LIST_INPUT).FILTERED_OUTPUT;
    var typeList = filteredData.map(function(row) {
        return {
            key: row.TYPE,
            text: row.TYPE,
        };
    }).filter(facetFilterUtils.createUniqueFilterFunction());
    var statusList = filteredData.map(function(row) {
        return {
            key: row.STATUS,
            text: row.STATUS,
        };
    }).filter(facetFilterUtils.createUniqueFilterFunction());
    return {
        TYPE: typeList,
        STATUS: statusList

    }
};

/**
 *
 */
dataManagementService.setFilters({
    filter: function() {
        if ($.session.hasAppPrivilege(DATA_ARCHIVE_NO_ACCESS)) {

            logger.error("DATA_ARCHIVE_NO_ACCESS",
                DATA_ARCHIVE_NO_ACCESS);
            throw new lib.NotAuthorizedError(DATA_ARCHIVE_NO_ACCESS);
        } else if (!$.session.hasAppPrivilege(DATA_ARCHIVE_READ_MODE)) {
            logger.error("DATA_ARCHIVE_READ",
                DATA_ARCHIVE_READ_MODE);
            throw new lib.NotAuthorizedError(DATA_ARCHIVE_READ_MODE);
        }

        return true;

    },
    only: ["facetFilter", "getArchivedTables", "getArchiveRules",
        "getConfiguration"]
}, {
    filter: function() {
        if ($.session.hasAppPrivilege(DATA_ARCHIVE_NO_ACCESS)) {

            logger.error("DATA_ARCHIVE_NO_ACCESS",
                DATA_ARCHIVE_NO_ACCESS);
            throw new lib.NotAuthorizedError(DATA_ARCHIVE_NO_ACCESS);
        } else if (!$.session.hasAppPrivilege(DATA_ARCHIVE_RULE_CREATION_MODE)) {

            logger.error("DATA_ARCHIVE_RULE_CREATION", DATA_ARCHIVE_RULE_CREATION_MODE);
            throw new lib.NotAuthorizedError(DATA_ARCHIVE_RULE_CREATION_MODE);
        }

        return true;
    },
    only: ["createRule", "deleteRule"]
}, {
    filter: function() {
        if ($.session.hasAppPrivilege(DATA_ARCHIVE_NO_ACCESS)) {
            logger.error("DATA_ARCHIVE_NO_ACCESS",
                DATA_ARCHIVE_NO_ACCESS);
            throw new lib.NotAuthorizedError(DATA_ARCHIVE_NO_ACCESS);
        } else if (!$.session.hasAppPrivilege(DATA_ARCHIVE_CONFIGURE_MODE)) {
            logger.error("DATA_ARCHIVE_CONFIGURE",
                DATA_ARCHIVE_CONFIGURE_MODE);
            throw new lib.NotAuthorizedError(DATA_ARCHIVE_CONFIGURE_MODE);
        }

        return true;
    },
    only: ["configure"]
}, {
    filter: function() {
        if ($.session.hasAppPrivilege(DATA_ARCHIVE_NO_ACCESS)) {
            throw new lib.NotAuthorizedError(DATA_ARCHIVE_NO_ACCESS);
            logger.error("DATA_ARCHIVE_NO_ACCESS",
                DATA_ARCHIVE_NO_ACCESS);
            throw new lib.NotAuthorizedError(DATA_ARCHIVE_NO_ACCESS);
        } else if (!$.session.hasAppPrivilege(DATA_ARCHIVE_RULE_EXECUTION_MODE)) {
            logger.error("DATA_ARCHIVE_RULE_EXECUTION",
               DATA_ARCHIVE_RULE_EXECUTION_MODE);
            throw new lib.NotAuthorizedError(DATA_ARCHIVE_RULE_EXECUTION_MODE);
        }

        return true;
    },
    only: ["executeRule", "validateExecute"]
});

/**
 *
 */
dataManagementService.setRoutes([
    {
        method: $.net.http.GET,
        scope: 'collection',
        action: 'executeRule',
        response: $.net.http.NO_CONTENT
    }, {
        method: $.net.http.POST,
        scope: 'collection',
        action: 'createRule'
    }, {
        method: $.net.http.GET,
        scope: 'collection',
        action: 'deleteRule'
    }, {
        method: $.net.http.GET,
        scope: 'collection',
        action: 'getArchivedData'
    }, {
        method: $.net.http.POST,
        scope: 'collection',
        action: 'configure'
    }, {
        method: $.net.http.GET,
        scope: 'collection',
        action: 'getConfiguration'
    }, {
        method: $.net.http.GET,
        scope: 'collection',
        action: 'validateExecute'
    }, {
        method: $.net.http.GET,
        scope: 'collection',
        action: 'getArchivedTables'
    }, {
        method: $.net.http.GET,
        scope: 'collection',
        action: 'getArchiveRules'
    }, {
        method: $.net.http.POST,
        scope: 'collection',
        action: 'facetFilter'
    },
]);

try {
    dataManagementService.handle();
} finally {
    logger.close();
}