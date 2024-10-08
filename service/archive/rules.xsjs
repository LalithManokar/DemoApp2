var jobManager = $.import("/sap/tm/trp/service/xslib/jobManagement.xsjslib");
var xsJob = "/sap/tm/trp/service/archive/executor.xsjob";
var connSqlcc = "sap.tm.trp.service.xslib::JobUser";
var jobSqlcc = "/sap/tm/trp/service/xslib/JobUser.xssqlcc";
var uri = "sap.tm.trp.service.xslib:deleteSchedules.xsjs";
var functionName = "deleteSchedule";

var lib = $.import('/sap/tm/trp/service/xslib/railxs.xsjslib');
var proc = $.import('/sap/tm/trp/service/xslib/procedures.xsjslib');
var messages = $.import('/sap/tm/trp/service/xslib/messages.xsjslib');
var constants = $.import('/sap/tm/trp/service/xslib/constants.xsjslib');
var model = $.import("/sap/tm/trp/service/model/ruleManagement.xsjslib");
var remote = $.import("/sap/tm/trp/service/xslib/remote.xsjslib");
var facetFilterUtils = $.import('/sap/tm/trp/service/xslib/utils.xsjslib').facetFilterUtils;
var logger = new($.import("/sap/tm/trp/service/xslib/applog.xsjslib")).AppLog();
var jobFactory=$.import("/sap/tm/trp/service/common/job/JobFactory.xsjslib");
var ruleExecutor = $.import('/sap/tm/trp/service/archive/executeRule.xsjslib');
var utils = $.import("sap.tm.trp.service.xslib", "utils");
var timeFormatHelper = $.import("sap.tm.trp.service.xslib", "timeFormatHelper");

var DATA_ARCHIVE_READ_MODE = "sap.tm.trp.service::DataArchiveRead";
var DATA_ARCHIVE_CONFIGURE_MODE = "sap.tm.trp.service::DataArchiveConfigure";
var DATA_ARCHIVE_RULE_CREATION_MODE = "sap.tm.trp.service::DataArchiveRuleCreation";
var DATA_ARCHIVE_RULE_EXECUTION_MODE = "sap.tm.trp.service::DataArchiveRuleExecution";
var DATA_ARCHIVE_NO_ACCESS = "sap.tm.trp.service::DataArchiveNoAccess";
var output = {};

var ruleManagementService = new lib.SimpleRest({
    name : "Rules Management",
    desc : "Manages archiving rules",
    model : new model.RuleManagement()
});

function doesRuleExist(ruleName){
    var sqlGet = "SELECT COUNT(1) AS COUNT FROM \"sap.tm.trp.db.archive::t_archive_rule\" WHERE RULE_NAME=? ";
    var conn,rs,count;
    var doesRuleNameExist = false;
    try {
        conn = $.hdb.getConnection();
        rs = conn.executeQuery(sqlGet,ruleName);
        count = rs[0]["COUNT"];
        if(count>0) {
            doesRuleNameExist = true;
        }
        logger.success("RULE_NAME_VALIDATED", ruleName);
    }catch (e) {
        logger.error("RULE_NAME_VALIDATION_FAILURE",
            ruleName,
            e);
        throw e;
    }
    finally {
        conn.close();
    }
    return doesRuleNameExist;
}

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

ruleManagementService.create = function (params) {
    var procName,
    createProc,
    procResult;
    var rule_name = params.obj.NAME,
    rule_desc = params.obj.DESC,
    table_id = params.obj.TABLE_ID,
    date_from = params.obj.DATE_FROM,
    date_to = params.obj.DATE_TO,
    type = params.obj.TYPE,
    // this needs to be deleted
    unarchive_type = 1, // params.obj.unarchive_type;
    sch_option = params.obj.SCHEDULE_TYPE,
    num_days = params.obj.NUM_DAYS,
    num_exec = params.obj.NUM_EXEC;

    try {
        if (doesRuleExist(rule_name)) {
            throw new lib.InternalError(messages.MSG_NAME_ALREADY_EXISTS);
        }
        procName = "sap.tm.trp.db.archive::p_archive_rule_create";
        createProc = new proc.procedure(constants.SCHEMA_NAME, procName);
        procResult = createProc(rule_name, rule_desc, table_id, date_from,
        		date_to, type, unarchive_type, sch_option, num_days, num_exec);  //, num_days, num_exec
        if (procResult.STATUS_CODE == 0) {

            logger.error("DATA_ARCHIVE_RULE_CREATION_FAILED", rule_name);
            throw new lib.InternalError(messages.MSG_RULE_CREATION_FAIL);
        }

        var result = {
            ID : procResult.RULE_ID
        }
        logger.success("DATA_ARCHIVE_RULE_CREATION_SUCCESS", rule_name);

        if (type == 4){

            var timezone,start_time,expiry_time;

            if(params.obj.SCHEDULE.hasOwnProperty("TIMEZONES")){
                timezone = params.obj.SCHEDULE.TIMEZONES;
            }else{
                timezone = null;
        	}

            if(params.obj.SCHEDULE.hasOwnProperty("START_TIME") && timezone){
                start_time = utils.localToUtcByHana(params.obj.SCHEDULE.START_TIME,timezone);
                if(start_time){
                    start_time= start_time.toISOString();
                }
            }

            if(params.obj.SCHEDULE.hasOwnProperty("EXPIRY_TIME") && timezone){
                expiry_time = utils.localToUtcByHana(params.obj.SCHEDULE.EXPIRY_TIME,timezone);
                if(expiry_time){
                    expiry_time= expiry_time.toISOString();
                }
            }

            var conn = $.db.getConnection();
            var archiveScheduleProcName = "sap.tm.trp.db.job::p_create_archive_schedule_detail";
            var createScheduleProc = new proc.Procedure(constants.SCHEMA_NAME,
                archiveScheduleProcName, {
                        connection : conn
                    });
            createScheduleProc(procResult.RULE_ID,
                    start_time,
                    expiry_time,
                    params.obj.SCHEDULE.RECURRENCE_TYPE,
                    params.obj.SCHEDULE.RECURRENCE_INTERVAL,
                    params.obj.SCHEDULE.RECURRENCE_DAY,
                    "ARCHIVE",
                    timezone);

            var parameters = {
                xsJob : xsJob,
                scheduleType : "ARCHIVE",
                startTime : start_time,
                expiryTime : expiry_time,
                recurrence : {
                    TYPE : params.obj.SCHEDULE.RECURRENCE_TYPE,
                    INTERVAL : params.obj.SCHEDULE.RECURRENCE_INTERVAL,
                    DAY : params.obj.SCHEDULE.RECURRENCE_DAY
                },
                modelId : procResult.RULE_ID,
                connSqlcc : connSqlcc,
                jobSqlcc : jobSqlcc
            };

            var job = new jobManager.Job(parameters);
            var schedule = new job.schedule();
            schedule.create();
        }
        return result;
    } catch (e) {
        logger.error("DATA_ARCHIVE_RULE_CREATION_FAILED",
            rule_name,
            e);

        if (e.message ==='MSG_NAME_ALREADY_EXISTS'){
            throw new lib.InternalError(e.message, e);
        }

        throw new lib.InternalError(messages.MSG_RULE_CREATION_FAIL, e);


    }
}

ruleManagementService.deactivate = function (params) {
    var procName,
    deactiveRuleProc,
    result;
    var ruleId = params.id;
    var status = 0;
    try {
        procName = "sap.tm.trp.db.archive::p_archive_rule_switch_status";
        deactiveRuleProc = new proc.procedure(constants.SCHEMA_NAME, procName);
        deactiveRuleProc(ruleId, status);
        result = {
        }
        logger.success("ARCHIVE_RULE_DELETED", ruleId);

        var rule = fetchRule(ruleId);

        if (rule.type === 4){

        	var parameters = {
                    xsJob : xsJob,
                    scheduleType : "ARCHIVE",
                    modelId : params.id,
                    connSqlcc : connSqlcc,
                    jobSqlcc : jobSqlcc,
                    uri : uri,
                    functionName : functionName
                };

	            var job = new jobManager.Job(parameters);
	            var schedule = new job.schedule();
	            schedule.cancel();
        }
    } catch (e) {
        logger.error("ARCHIVE_RULE_DELETE_FAILED",
            ruleId,
            e
            );
        throw new lib.InternalError(messages.MSG_RULE_DELETION_FAIL, e);
    }
    return result;
}

ruleManagementService.activate = function (params) {
    var procName,
    activeRuleProc,
    result;
    var ruleId = params.id;
    var status = 1;
    var conn;

    conn = $.hdb.getConnection();

    try {
        procName = "sap.tm.trp.db.archive::p_archive_rule_switch_status";
        activeRuleProc = new proc.procedure(constants.SCHEMA_NAME, procName);
        activeRuleProc(ruleId,status);
        result = {
        }
        logger.success("ARCHIVE_RULE_DELETED", ruleId);

        var rule = fetchRule(ruleId);

        if (rule.type === 4){

            var sql = "SELECT * FROM \"SAP_TM_TRP\".\"sap.tm.trp.db.job::t_archive_schedule_detail\" where RULE_ID = ?" ;

            var rs = conn.executeQuery(sql, ruleId);
            if (rs.length === 0) {
                throw new lib.InternalError("No such rule");
            }
            var parameters = {
                xsJob : xsJob,
                scheduleType : "ARCHIVE",
                startTime : rs[0].START_TIME,
                expiryTime : rs[0].EXPIRY_TIME,
                recurrence : {
                    TYPE : rs[0].RECURRENCE_TYPE,
                    INTERVAL : rs[0].RECURRENCE_INTERVAL,
                    DAY : rs[0].RECURRENCE_DAY
                },
                timezones : rs[0].TIMEZONES,
                modelId : ruleId,
                connSqlcc : connSqlcc,
                jobSqlcc : jobSqlcc
            };

            var job = new jobManager.Job(parameters);
            var schedule = new job.schedule();
            schedule.create();
        }

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
 */

ruleManagementService.execute = function (params) {

   var configFlag;
   var ruleId = params.id;
   var conn = $.hdb.getConnection();
   var resultSet = conn.executeQuery('SELECT COUNT(*) AS CONFIG_FLAG FROM "sap.tm.trp.db.archive::t_archive_configuration"');

   configFlag = resultSet[0].CONFIG_FLAG;

   if (configFlag == 0)
   {
       throw new lib.InternalError(messages.MSG_ERROR_ARCHIVE_NOT_CONFIGURED);
   }


   try {
       jobFactory.create("executeRule",
                         "sap.tm.trp.service.archive",
                         "executeRule",
                         "execute",
                         {"ruleId":ruleId,"user":$.session.getUsername()});
       logger.success("RULE_JOB_CREATED", ruleId);
    var result = {}
   } catch (e) {
       logger.error("RULE_JOB_CREATION_FAIL",
                ruleId,
                e);

       throw new lib.InternalError(messages.MSG_RULE_EXECUTION_FAIL,e);
   }
   return result;


   /*
   var result = {};
   var ruleId = params.id;
   ruleExecutor.execute({"ruleId":ruleId,"user":$.session.getUsername()});
   return result;
   */

}

ruleManagementService.facetFilter = function (params) {

    var filterProc = new proc.procedure(constants.SCHEMA_NAME, [
                'sap.tm.trp.db.archive', 'sp_archive_rule_head_facet_filter']
            .join('::'));

    var filteredData = filterProc(params.obj.search,
            params.obj.filters).FILTERED_OUTPUT;
    var typeList = filteredData.map(function (row) {
            return {
                key : row.TYPE,
                text : row.TYPE_DESC
            };
        }).filter(facetFilterUtils.createUniqueFilterFunction());
    return {
        TYPE : typeList

    }
};

ruleManagementService.index = function (params) {
    var sql,
    conn,
    rs,
    result = [],
    tableId,
    row;
    try {
        tableId = $.request.parameters.get("tableId");
        sql = "SELECT RULE_NAME,ID FROM \"sap.tm.trp.db.archive::t_archive_rule\" WHERE TABLE_ID=? AND ( TYPE = ? OR TYPE = ? ) order by rule_name asc";
        conn = $.hdb.getConnection();
        rs = conn.executeQuery(sql, tableId, 1, 4);
        for (row in rs) {
            result.push({
                ID : rs[row]["ID"],
                NAME : rs[row]["RULE_NAME"]
            });
        }
    } catch (e) {
        logger.error("ARCHIVE_RULES_GET_FAILED", e);
        throw new lib.InternalError(messages.MSG_GET_ARCHIVE_RULES_BY_TABLE, e);
    }
    finally {
        conn.close();
    }
    return result;
};

ruleManagementService.setFilters({
    filter : function () {
        if ($.session.hasAppPrivilege(DATA_ARCHIVE_NO_ACCESS)) {

            logger.error("DATA_ARCHIVE_NO_ACCESS", DATA_ARCHIVE_NO_ACCESS);
            throw new lib.NotAuthorizedError(DATA_ARCHIVE_NO_ACCESS);
        } else if (!$.session.hasAppPrivilege(DATA_ARCHIVE_READ_MODE)) {
            logger.error("DATA_ARCHIVE_READ", DATA_ARCHIVE_READ_MODE);
            throw new lib.NotAuthorizedError(DATA_ARCHIVE_READ_MODE);
        }

        return true;

    },
    only : ["facetFilter"]
}, {
    filter : function () {
        if ($.session.hasAppPrivilege(DATA_ARCHIVE_NO_ACCESS)) {

            logger.error("DATA_ARCHIVE_NO_ACCESS", DATA_ARCHIVE_NO_ACCESS);
            throw new lib.NotAuthorizedError(DATA_ARCHIVE_NO_ACCESS);
        } else if (!$.session.hasAppPrivilege(DATA_ARCHIVE_RULE_CREATION_MODE)) {

            logger.error("DATA_ARCHIVE_RULE_CREATION", DATA_ARCHIVE_RULE_CREATION_MODE);
            throw new lib.NotAuthorizedError(DATA_ARCHIVE_RULE_CREATION_MODE);
        }

        return true;
    },
    only : ["create", "delete"]
});

/**
 *
 */
ruleManagementService.setRoutes([
     {
        method : $.net.http.POST,
        scope : 'member',
        action : 'execute'
    },
    {
        method : $.net.http.POST,
        scope : 'collection',
        action : 'facetFilter'
    },
    {
        method : $.net.http.POST,
        scope : 'member',
        action : 'activate'
    },
    {
        method : $.net.http.POST,
        scope : 'member',
        action : 'deactivate'
    }
]);

try {
    ruleManagementService.handle();
} finally {
    logger.close();
}