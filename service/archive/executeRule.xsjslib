var lib = $.import('/sap/tm/trp/service/xslib/railxs.xsjslib');
var proc = $.import('/sap/tm/trp/service/xslib/procedures.xsjslib');
var messages = $.import('/sap/tm/trp/service/xslib/messages.xsjslib');
var remote = $.import("/sap/tm/trp/service/xslib/remote.xsjslib");
var logger = new($.import("/sap/tm/trp/service/xslib/applog.xsjslib")).AppLog();
var constants = $.import('/sap/tm/trp/service/xslib/constants.xsjslib');

var STATUS_ENUMS = {
    SUCCESS: 1,
    ERROR: 2,
    IN_PROGRESS: 3,
    WARNING: 4,
    PARTIAL: 5
};

var ARCHIVE_FLAG = {
    ARCHIVE: 1,
    UNARCHIVE: 0
};

var EXECUTION_TYPE = {
    ARCHIVE_INSERT_WARM: 1,
    ARCHIVE_DELETE_HOT: 2,
    UNARCHIVE_INSERT_HOT: 3,
    UNARCHIVE_DELETE_WARM: 4,
    DELETE_HOT: 5,
    DELETE_WARM: 6
}

var user;

function getConfiguration() {
    var sqlGet = "SELECT * FROM \"sap.tm.trp.db.archive::t_archive_configuration\"";
    var conn, pstmt, rs, row;
    var result = {};
    try {
        conn = $.hdb.getConnection();
        rs = conn.executeQuery(sqlGet);
        for (row in rs) {
            result[rs[row]["KEY"]] = rs[row]["VALUE"];
        }
        logger.success("CONFIG_LOAD");
    } catch (e) {
        logger.error("CONFIG_LOAD_FAIL", e);
        throw new lib.InternalError("Failed to load Data Archiving configuration", e);
    } finally {
        conn.close();
    }
    return result;
}

function checkArchiveSetup(tableCode) {
    var procName, procHandle, config, results;
    try {
        config = getConfiguration();
        var configuration_type = config.CONFIGURATION_TYPE,
            datasource_name = config.DATASOURCE_NAME,
            database_name = config.DATABASE_NAME,
            schema_name = config.SCHEMA_NAME;
        procName = "sap.tm.trp.db.archive::p_archive_config_setup";
        procHandle = new proc.procedure(constants.SCHEMA_NAME, procName);
        results = procHandle(configuration_type, datasource_name, database_name, schema_name, tableCode);
        logger.success("ARCHIVE_SETUP");
    } catch (e) {
        logger.error("ARCHIVE_SETUP_FAIL", e);
        throw e;
    }
    return results;
}

function genExecutionDetailSeq() {
    var sqlGet = "SELECT \"sap.tm.trp.db.archive::s_archive_execution_detail\".NEXTVAL AS EXECUTION_ID FROM DUMMY";
    var conn, rs;
    var executionId;
    try {
        conn = $.hdb.getConnection();
        rs = conn.executeQuery(sqlGet);
        executionId = rs[0].EXECUTION_ID;
        logger.success("EXECUTION_ID_GEN");
    } catch (e) {
        logger.error("EXECUTION_ID_GEN_FAIL",  e);
        throw new lib.InternalError("Failed to load Data Archiving configuration", e);
    } finally {
        conn.close();
    }
    return executionId;
}

/**
 * Generates the handle for failure management
 *
 * @param conn
 * @returns {result}
 */
function generateHandle() {
    var conn, rs, result, connId;

    conn = $.hdb.getConnection();
    conn.executeQuery('SELECT CURRENT_CONNECTION AS CONNECTION_ID FROM DUMMY');

    try {

        rs = conn.executeQuery('SELECT CURRENT_CONNECTION AS CONNECTION_ID FROM DUMMY');
        connId = rs[0].CONNECTION_ID;
        result = {
            connectionId: Number(connId)
        }
        logger.success("HANDLE_GEN");
    } catch (e) {
        logger.error("HANDLE_GEN_FAIL", e);
        throw new lib.InternalError("Unable to generate the handle", e);
    } finally {
        conn.close();
    }
    return result;
}


/**
 *
 * @param ruleId
 * @returns {rule}
 */
function fetchRule(ruleId) {
    var conn, sql, rs, rule;
    
    conn = $.hdb.getConnection();
    try {
        sql = "SELECT TYPE,TABLE_ID,TABLE_NAME,DATE_FROM,DATE_TO,IS_TM FROM \"_SYS_BIC\".\"sap.tm.trp.db.archive/cv_archive_rule\" WHERE ID=?";
        
        rs = conn.executeQuery(sql, ruleId);
        if (rs.length === 0) {
            throw new lib.InternalError("No such rule");
        }
        rule = {
            ruleId: ruleId,
            type: rs[0].TYPE,
            tableId: rs[0].TABLE_ID,
            fromDate: rs[0].DATE_FROM,
            toDate: rs[0].DATE_TO,
            tableName: rs[0].TABLE_NAME,
            isTM: rs[0].IS_TM === 1 ? true : false
        };
        logger.success("RULE_FETCH", ruleId);
    } catch (e) {
        logger.error("RULE_FETCH_FAIL",
            ruleId,
            e
        );
        throw new lib.InternalError("Unable to fetch the rule", e);
    } finally {
        conn.close();
    }
    return rule;
}

/**
 * executes the rollback
 *
 * @param executionId
 * @param executionLogId
 */
function executeRollback(executionId, executionLogId) {
    var procName, procHandle;
    try {
        procName = "sap.tm.trp.db.archive::sp_data_archive_rollback";
        procHandle = new proc.procedure(constants.SCHEMA_NAME, procName);
        procHandle(executionId, executionLogId);
        logger.success("ROLLBACK", executionId);
    } catch (e) {
        logger.error("ROLLBACK_FAIL",
            executionId,
            e);
        throw e;
    } finally {
        logger.close();
    }
}

function insertExecutionDetail(id,ruleId, tableId, handleId) {
    var procName, procHandle, result, conn;
    
    conn = $.hdb.getConnection();
    conn.setAutoCommit(false);
    try {
        //username = $.session.getUsername();
        procName = "sap.tm.trp.db.archive::p_archive_insert_execution_detail";
        procHandle = conn.loadProcedure(constants.SCHEMA_NAME, procName);
        result = procHandle(id,ruleId, tableId, handleId);
        logger.success("EXECUTION_DETAIL_INSERT", ruleId);
        
        conn.commit();
        return result.EXECUTION_ID;
        
        
    } catch (e) {
        logger.error("EXECUTION_DETAIL_INSERT_FAIL",
            ruleId,
            e);
        throw e;
    } finally {
        
        conn.close();
        logger.close();
    }
}

/**
 *
 * @param executionId
 * @param status
 */
function updateExecutionDetail(executionId, status, recordCount, message) {
    var procName, procHandle, conn;
    
    conn = $.hdb.getConnection();
    conn.setAutoCommit(false);
    try {
        
        procName = "sap.tm.trp.db.archive::p_archive_update_execution_detail";
        procHandle = conn.loadProcedure(constants.SCHEMA_NAME, procName);
        procHandle(executionId, status, recordCount, message);
        logger.success("EXECUTION_DETAIL_UPDATE", executionId);
        conn.commit();
    } catch (e) {
        logger.error("EXECUTION_DETAIL_UPDATE_FAIL",
            executionId,
            e);
        throw e;
    } finally {
        
        conn.close();
        logger.close();
    }
}

/**
 *
 * @param executionId
 * @param tableId
 * @param type
 */
function insertExecutionLog(executionId, tableId, type) {
    var procName, procHandle, result;
    try {
        procName = "sap.tm.trp.db.archive::p_archive_insert_execution_log";
        procHandle = new proc.procedure(constants.SCHEMA_NAME, procName);
        result = procHandle(executionId, tableId, type);
        logger.success("EXECUTION_LOG_INSERT", executionId);
        return result.EXECUTION_LOG_ID;
    } catch (e) {
        logger.error("EXECUTION_LOG_INSERT_FAIL",
            executionId,
            e);
        throw e;
    } finally {
        logger.close();
    }
}

/**
 *
 * @param logId
 * @param status
 * @param noRecords
 * @param message
 */
function updateExecutionLog(logId, status, noRecords, message) {
    var procName, procHandle, config;
    try {
        procName = "sap.tm.trp.db.archive::p_archive_update_execution_log";
        procHandle = new proc.procedure(constants.SCHEMA_NAME, procName);
        procHandle(logId, status, noRecords, message);
        logger.success("EXECUTION_LOG_UPDATE", logId);
    } catch (e) {
        logger.error("EXECUTION_LOG_UPDATE_FAIL",
            logId,
            e);
        throw e;
    } finally {
        logger.close();
    }
}

/**
 *
 * @param rule
 * @returns {result status}
 */
function remoteDelete(rule) {
    try {
        var client = new remote.RemoteClient();
        var settings = {};
        settings.url = "/sap/bc/rest_trp/reshist";
        settings.method = $.net.http.DEL;
        settings.data = {
            "FROM_TIME": rule.fromDate,
            "TO_TIME": rule.toDate
        }
        var requestResult = {};
        settings.success = function(data) {
            requestResult.success = 1;
            requestResult.noOfRecords = parseInt(data.MESSAGES[0].MESSAGE);
            logger.success("DELETE_SUCCESS");
        }
        settings.error = function(error) {
            requestResult.success = 0;
            requestResult.message = data.MESSAGES[0].MESSAGE;
            logger.error("DELETE_FAILED", data.MESSAGES[0].MESSAGE);
        }
        client.request(settings);
    } catch (e) {
        requestResult.success = 0;
        requestResult.message = e.message;
        logger.error("DELETE_FAILED", e);

    } finally {
        logger.close();
    }
    return requestResult;
}

/**
 *
 * @param rule
 */
function archiveData(rule, executionId) {
    var procName, procHandle, result, conn;

    conn = $.hdb.getConnection();
    conn.setAutoCommit(true);
    try {
        procName = "sap.tm.trp.db.archive::p_get_table_id";
        procHandle = conn.loadProcedure('SAP_TM_TRP', procName);
        result = procHandle(rule.ruleId);
        
        if (result.TABLE_ID == 3)
        {
        procName = "sap.tm.trp.db.archive::sp_manual_archive_rulegroup";
        procHandle = conn.loadProcedure('SAP_TM_TRP', procName);
        logger.info("DATA_ARCHIVE_STARTED",
            rule.ruleId,
            user);
        }
        else
        {
        procName = "sap.tm.trp.db.archive::sp_manual_archive";
        procHandle = conn.loadProcedure('SAP_TM_TRP', procName);
        logger.info("DATA_ARCHIVE_STARTED",
            rule.ruleId,
            user);
        }
        result = procHandle(rule.ruleId, executionId);

        if (result.STATUS_CODE == 0) { // success and the table is
            
            logger.info("DATA_ARCHIVE_FINISHED",
                rule.ruleId);
            conn.commit();

        } else {
            logger.error("ARCHIVE_DATA_FAILED",
                rule.ruleId,
                "Refer execution log table for the reason");
            conn.rollback();
        }

    } catch (e) {
        logger.error("ARCHIVE_DATA_FAILED",
            rule.ruleId,
            e);
        throw new lib.InternalError("Unsuccessfull data archive", e);
    } finally {
        conn.close();
        logger.close();
    }
    return result;
}

/**
 *
 * @param rule
 */
function scheduleOptionData(rule, executionId) {
    var procName, procHandle, result, conn;

    conn = $.hdb.getConnection();
    conn.setAutoCommit(true);
    try {
        procName = "sap.tm.trp.db.archive::p_get_table_id";
        procHandle = conn.loadProcedure('SAP_TM_TRP', procName);
        result = procHandle(rule.ruleId);
        
        if (result.TABLE_ID == 3)
        {
            procName = "sap.tm.trp.db.archive::sp_schedule_archive_rulegroup";
            procHandle = conn.loadProcedure('SAP_TM_TRP', procName);
            logger.info("DATA_ARCHIVE_STARTED",
                rule.ruleId,
                user);

            result = procHandle(rule.ruleId, executionId);
        }
        else 
        {
            procName = "sap.tm.trp.db.archive::sp_schedule_archive";
            procHandle = conn.loadProcedure('SAP_TM_TRP', procName);
            logger.info("DATA_ARCHIVE_STARTED",
                rule.ruleId,
                user);

            result = procHandle(rule.ruleId, executionId);
        }
        
        if (result.STATUS_CODE == 0) { // success and the table is
            
            logger.info("DATA_ARCHIVE_FINISHED",
                rule.ruleId);
            conn.commit();

        } else {
            logger.error("ARCHIVE_DATA_FAILED",
                rule.ruleId,
                "Refer execution log table for the reason");
            conn.rollback();
        }

    } catch (e) {
        logger.error("ARCHIVE_DATA_FAILED",
            rule.ruleId,
            e);
        throw new lib.InternalError("Unsuccessfull data archive", e);
    } finally {
        conn.close();
        logger.close();
    }
    return result;
}

/**
 *
 * @param rule
 */
function unarchiveData(rule) {
    var procName, procHandle, result, conn;
    
    conn = $.hdb.getConnection();
    conn.setAutoCommit(false);
    try {
        procName = "sap.tm.trp.db.archive::sp_archive_unarchivedata";
        procHandle = conn.loadProcedure('SAP_TM_TRP', procName);

        logger.info("DATA_UNARCHIVE_STARTED",
            rule.ruleId,
            user);

        //execute un-archive
        result = procHandle(rule.ruleId);

        if (result.STATUS_CODE == 0) {
            logger.info("DATA_UNARCHIVE_FINISHED",
                rule.ruleId);
            conn.commit();
        } else {
            logger.error("UNARCHIVE_DATA_FAIL",
                rule.ruleId,
                "Refer execution log table for the reason");
            conn.rollback();
        }

    } catch (e) {
        logger.error("UNARCHIVE_DATA_FAIL",
            rule.ruleId,
            e);
        throw new lib.InternalError("Unsuccessfull data un-archive", e);
    } finally {
        conn.close();
        logger.close();
    }
    return result;
}

/**
 *
 * @param rule
 */
function deleteData(rule) {
    var procName, procHandle, result, conn;
    
    conn = $.hdb.getConnection();
    conn.setAutoCommit(false);
    try {
		if (result.TABLE_ID == 3)
        {
        procName = "sap.tm.trp.db.archive::sp_archive_removedata_rulegroup";
        procHandle = conn.loadProcedure('SAP_TM_TRP', procName);
        logger.info("DATA_DELETION_STARTED",
            rule.ruleId,
            user);

        result = procHandle(rule.ruleId);
        }
		else
		{
        procName = "sap.tm.trp.db.archive::sp_archive_removedata";
        procHandle = conn.loadProcedure('SAP_TM_TRP', procName);
        logger.info("DATA_DELETION_STARTED",
            rule.ruleId,
            user);

        result = procHandle(rule.ruleId);
		}
        if (result.STATUS_CODE == 0) {
            logger.info("DATA_DELETION_FINISHED",
                rule.ruleId);
            conn.commit();
        } else {
            logger.error("DELETE_ARCHIVE_DATA_FAIL",
                rule.ruleId,
                "Refer execution log table for the reason");
            conn.close();
        }

    } catch (e) {
        logger.error("DELETE_ARCHIVE_DATA_FAIL",
            rule.ruleId,
            e);
        throw new lib.InternalError("Unsuccessfull data deletion", e);
    } finally {
        conn.close();
        logger.close();
    }
    return result;
}

/**
 *
 * @param params
 */
function execute(id,params) {

    var result;
    var executionId, rule, handleId;
    var ruleId = params.ruleId;
    user = params.user;

    try {
        //fetch the rule
        rule = fetchRule(ruleId);

        //generate the handle to the execution
        //conn = $.hdb.getConnection();

        var handle = generateHandle();
        handleId = handle.connectionId;

        //insert the execution detail
        executionId = insertExecutionDetail(id,rule.ruleId, rule.tableId, handleId);

        try {
            //validate the execution
            //var setUpResult = checkArchiveSetup(rule.tableName); //this is the table code

            //if (setUpResult.P_SUCCESS===0) {//set up is a failure

            //   updateExecutionDetail(executionId, STATUS_ENUMS.ERROR,setUpResult.P_MESSAGE);

            //} else {                    
            switch (rule.type) {
                case 1:
                    result = archiveData(rule, executionId);
                    break;
                case 2:
                    result = unarchiveData(rule);
                    break;
                case 3:
                    result = deleteData(rule);
                    break;
                case 4:
                    result = scheduleOptionData(rule, executionId);
                    break;
            }
            
            if (rule.type == 2 || rule.type == 3) {
	            if (result.STATUS_CODE == 0)
	            {
	                updateExecutionDetail(executionId, STATUS_ENUMS.SUCCESS,result.RECORD_COUNT, result.MESSAGE);
	            }
	            else
	            {
	              updateExecutionDetail(executionId, STATUS_ENUMS.ERROR, 0, result.MESSAGE);
	            }
           }
            
            //  }
        } catch (e) { //logging is alredy taken care in the individual procedures
            logger.error("RULE_EXECUTION_FAILURE",
                ruleId,
                e);

            updateExecutionDetail(executionId, STATUS_ENUMS.ERROR,0, e.message);
        }
    } catch (e) {
        logger.error("RULE_EXECUTION_FAILURE",
            ruleId,
            e);
        throw e;
    } finally {
        logger.close();
    }
    return result;
}