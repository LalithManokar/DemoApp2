var model = $.import('/sap/tm/trp/service/model/pickupreturn.xsjslib');
var lib = $.import('/sap/tm/trp/service/xslib/railxs.xsjslib');
var constants = $.import('/sap/tm/trp/service/xslib/constants.xsjslib');
var proc = $.import('/sap/tm/trp/service/xslib/procedures.xsjslib');
var messages = $.import('/sap/tm/trp/service/xslib/messages.xsjslib');
var facetFilterUtils = $.import('/sap/tm/trp/service/xslib/utils.xsjslib').facetFilterUtils;
var logger = new ($.import("/sap/tm/trp/service/xslib/applog.xsjslib")).AppLog();
var geoCheckLib = $.import('/sap/tm/trp/service/xslib/geoCheck.xsjslib');
var xsJob = '/sap/tm/trp/service/pickupreturn/executor.xsjob';
var jobManager = $.import("/sap/tm/trp/service/xslib/jobManagement.xsjslib");
var SCHEDULE_TYPE = 'LOCATION_RULE';
var connSqlcc = 'sap.tm.trp.service.xslib::JobUser';
var jobSqlcc = '/sap/tm/trp/service/xslib/JobUser.xssqlcc';
var uri = "sap.tm.trp.service.xslib:deleteSchedules.xsjs";
var functionName = "deleteSchedule";
var utils = $.import("sap.tm.trp.service.xslib", "utils");
var timeFormatHelper = $.import("sap.tm.trp.service.xslib", "timeFormatHelper");

var prLogger = new ($.import("/sap/tm/trp/service/xslib/applog.xsjslib")).AppLog("pickupreturn/executor");

var SCHEMA = constants.SCHEMA_NAME;
var PACKAGE = constants.SP_PKG_PICKUP_RETURN;
var SERVICE_PKG = "sap.tm.trp.service";

var conn=$.hdb.getConnection();
var locationRuleService = new lib.SimpleRest({
    name: 'Location Rule',
    desc: 'operations about Location Rule',
    model: new model.LocationRule()
});
function generateServiceReturnObj(procReturnObj, outputInfoList){
        var serviceReturnObj = {};
        var obj = {};
        outputInfoList.forEach(function(outputInfo){
        	obj = procReturnObj[outputInfo.varName];
            serviceReturnObj[outputInfo.field] = 
            	//procReturnObj[outputInfo.varName].map(function(row)
            	Object.keys(obj).map(function(row)
            	{
                return {
                    key: obj[row].KEY?obj[row].KEY.toString():obj[row].KEY,
                    text: obj[row].TEXT
                };
            });
        });
        return serviceReturnObj;
    }
function getUserInfoAuthCheck(id) {
    var checkUserTypeProc = "sap.tm.trp.db.pickupreturn::p_get_user_info_for_auth_check_location_rule";
    var getUserType = conn.loadProcedure(constants.SCHEMA_NAME, checkUserTypeProc);
    var userType = getUserType(id);
    if (userType.USER_TYPE !== 99) {
        if (userType.CREATOR !== $.session.getUsername()) {
            throw new lib.InternalError(messages.MSG_ERROR_AUTH_CHECK);
        }
    }
    return true;
}

locationRuleService.create = function(params) {
    var procName, createProc, result,  job, schedule, parameters = {};

    var exec_run,exec_work_hour, start_working_hour_time, end_working_hour_time, start_working_hour_time_DST, end_working_hour_time_DST, timezone,start_datetime,end_datetime;

    if(params.obj.hasOwnProperty("KEEP_EXECUTION_RUNS")){
    	if (params.obj.KEEP_EXECUTION_RUNS === null || params.obj.KEEP_EXECUTION_RUNS === "" || params.obj.KEEP_EXECUTION_RUNS === ''){
    		exec_run = null;
        }
    	else {
    		exec_run = params.obj.KEEP_EXECUTION_RUNS
    	}
    }
    else{
    	exec_run = null;
    }

//    if(params.obj.hasOwnProperty("EXECUTE_WORKING_HOUR")){
//        exec_work_hour = params.obj.EXECUTE_WORKING_HOUR;
//    }
//
//    if(params.obj.hasOwnProperty("TIMEZONES")){
//        timezone = params.obj.TIMEZONES;
//    }
//
//    if(params.obj.hasOwnProperty("START_DATETIME") && params.obj.START_DATETIME && timezone ){
//        start_datetime = utils.localToUtcByHana(params.obj.START_DATETIME,timezone);
//        if(start_datetime){
//            start_datetime= start_datetime.toISOString();
//        }
//    }
//
//    if(params.obj.hasOwnProperty("END_DATETIME") && params.obj.END_DATETIME && timezone){
//        end_datetime = utils.localToUtcByHana(params.obj.END_DATETIME,timezone);
//        if(end_datetime){
//            end_datetime= end_datetime.toISOString();
//        }
//    }
//
//    if(params.obj.hasOwnProperty("START_WORKING_HOUR_TIME") && timezone && params.obj.START_WORKING_HOUR_TIME){
//        start_working_hour_time = utils.localToUtcByHana(params.obj.START_WORKING_HOUR_TIME,timezone);
//    }
//
//    if(params.obj.hasOwnProperty("START_WK_HOUR_TIME_DST")){
//        start_working_hour_time_DST = params.obj.START_WK_HOUR_TIME_DST;
//    }else if(params.obj.hasOwnProperty("START_WORKING_HOUR_TIME") && timezone && exec_work_hour === 'X'){
//        var startLocalTimestamp = utils.utcToLocalByHana( params.obj.START_WORKING_HOUR_TIME,timezone);
//        start_working_hour_time_DST = timeFormatHelper.dateFormat('HH:mm',startLocalTimestamp)+':00';
//    }
//
//    if(params.obj.hasOwnProperty("END_WORKING_HOUR_TIME") && timezone && params.obj.END_WORKING_HOUR_TIME){
//        end_working_hour_time = utils.localToUtcByHana(params.obj.END_WORKING_HOUR_TIME,timezone);
//    }
//
//    if(params.obj.hasOwnProperty("END_WK_HOUR_TIME_DST")){
//        end_working_hour_time_DST = params.obj.END_WK_HOUR_TIME_DST;
//    }else if(params.obj.hasOwnProperty("END_WORKING_HOUR_TIME") && timezone && exec_work_hour === 'X'){
//        var endLocalTimestamp = utils.utcToLocalByHana( params.obj.END_WORKING_HOUR_TIME,timezone);
//        end_working_hour_time_DST = timeFormatHelper.dateFormat('HH:mm',endLocalTimestamp)+':00';
//    }
    
    //Replacing undefined with null to solve $.hdb issue
      params.obj.NAME = params.obj.NAME===undefined?null:params.obj.NAME;
      params.obj.DESCRIPTION = params.obj.DESCRIPTION===undefined?null:params.obj.DESCRIPTION;
      params.obj.TYPE = params.obj.TYPE===undefined?null:params.obj.TYPE;
      params.obj.TIME_RANGE_INTERVAL = params.obj.TIME_RANGE_INTERVAL===undefined?null:params.obj.TIME_RANGE_INTERVAL;
      params.obj.TIME_RANGE_UNIT   = params.obj.TIME_RANGE_UNIT===undefined?null:params.obj.TIME_RANGE_UNIT;
      params.obj.EQUIPMENT_FILTER_ID = params.obj.EQUIPMENT_FILTER_ID===undefined?null:params.obj.EQUIPMENT_FILTER_ID;
      params.obj.LOCATION_FILTER_ID = params.obj.LOCATION_FILTER_ID===undefined?null:params.obj.LOCATION_FILTER_ID;
      params.obj.SD_PLAN_ID= params.obj.SD_PLAN_ID===undefined?null:params.obj.SD_PLAN_ID;
      params.obj.NETWORK_SETTING_GROUP_ID= params.obj.NETWORK_SETTING_GROUP_ID===undefined?null:params.obj.NETWORK_SETTING_GROUP_ID;
      params.obj.SCHEDULE_TIME_TYPE=  params.obj.SCHEDULE_TIME_TYPE===undefined?null: params.obj.SCHEDULE_TIME_TYPE;
      params.obj.RECURRENCE_INTERVAL = params.obj.RECURRENCE_INTERVAL===undefined?null:params.obj.RECURRENCE_INTERVAL;
      params.obj.RECURRENCE_TYPE = params.obj.RECURRENCE_TYPE===undefined?null:params.obj.RECURRENCE_TYPE;
      params.obj.RECURRENCE_DAY = params.obj.RECURRENCE_DAY===undefined?null:params.obj.RECURRENCE_DAY;
      params.obj.OP_SETTING_TYPE = params.obj.OP_SETTING_TYPE===undefined?null:params.obj.OP_SETTING_TYPE;
      params.obj.LOCATION_DETERMIN_ID = params.obj.LOCATION_DETERMIN_ID===undefined?null:params.obj.LOCATION_DETERMIN_ID;
      params.obj.OPTIMIZATION= params.obj.OPTIMIZATION===undefined?null:params.obj.OPTIMIZATION;
      params.obj.ALLOWED_USAGE = params.obj.ALLOWED_USAGE===undefined?null:params.obj.ALLOWED_USAGE;
      params.obj.FILTER_EXECUTION = params.obj.FILTER_EXECUTION===undefined?null:params.obj.FILTER_EXECUTION;
      params.obj.EXCLUSIVE_RULE_ID =  params.obj.EXCLUSIVE_RULE_ID===undefined?null: params.obj.EXCLUSIVE_RULE_ID;
      params.obj.TIME_WINDOW = params.obj.TIME_WINDOW===undefined?null:params.obj.TIME_WINDOW;
      params.obj.RANK_NUMBER = params.obj.RANK_NUMBER===undefined?null:params.obj.RANK_NUMBER;
      params.obj.RESOURCE_CATEGORY =params.obj.RESOURCE_CATEGORY===undefined?null:params.obj.RESOURCE_CATEGORY;
      params.obj.SELECTION_DATE = params.obj.SELECTION_DATE===undefined?null:params.obj.SELECTION_DATE;
        start_datetime = start_datetime===undefined?null:start_datetime;
       end_datetime = end_datetime===undefined?null:end_datetime;
       exec_run = exec_run===undefined?null:exec_run;
       exec_work_hour = exec_work_hour===undefined?null:exec_work_hour;
       start_working_hour_time = start_working_hour_time===undefined?null:start_working_hour_time;
       end_working_hour_time = end_working_hour_time===undefined?null:end_working_hour_time;
       timezone = timezone===undefined?null:timezone;

    //conn = $.hdb.getConnection();
    try {
        procName = PACKAGE + '::p_location_rule_create';
        createProc = conn.loadProcedure(SCHEMA, procName);
        result = createProc(
                params.obj.NAME,
                params.obj.DESCRIPTION,
                params.obj.TYPE,
                params.obj.TIME_RANGE_INTERVAL,
                params.obj.TIME_RANGE_UNIT,
                params.obj.EQUIPMENT_FILTER_ID,
                params.obj.LOCATION_FILTER_ID,
                params.obj.SD_PLAN_ID,
                params.obj.NETWORK_SETTING_GROUP_ID,
                params.obj.SCHEDULE_TIME_TYPE,
                params.obj.RECURRENCE_INTERVAL,
                params.obj.RECURRENCE_TYPE,
                params.obj.RECURRENCE_DAY,
                start_datetime,
                end_datetime,
                params.obj.OP_SETTING_TYPE,
                params.obj.LOCATION_DETERMIN_ID,
                params.obj.OPTIMIZATION,
                params.obj.ALLOWED_USAGE,
                params.obj.FILTER_EXECUTION,
                params.obj.EXCLUSIVE_RULE_ID,
                params.obj.TIME_WINDOW,
                params.obj.RANK_NUMBER,
                params.obj.RESOURCE_CATEGORY,
                params.obj.SELECTION_DATE,
                exec_run,
                exec_work_hour,
                start_working_hour_time,
                end_working_hour_time,
                timezone);

//        if(params.obj.SCHEDULE_TIME_TYPE === 1) {
//             parameters.xsJob = xsJob;
//            parameters.scheduleType = SCHEDULE_TYPE;
//            parameters.startTime = start_datetime;
//            parameters.expiryTime = end_datetime;
//            parameters.recurrence = {
//                TYPE : params.obj.RECURRENCE_TYPE,
//                INTERVAL : params.obj.RECURRENCE_INTERVAL,
//                DAY : params.obj.RECURRENCE_DAY
//            };
//            parameters.execWorkHour = exec_work_hour;
//            parameters.startWorkHour = start_working_hour_time_DST;
//            parameters.endWorkHour = end_working_hour_time_DST;
//            parameters.timezone = timezone;
//            parameters.resourceCategory = params.obj.RESOURCE_CATEGORY;
//            parameters.modelId = result.RULE_ID;
//            parameters.connSqlcc = connSqlcc;
//            parameters.jobSqlcc = jobSqlcc;
//            job = new jobManager.Job(parameters);
//            schedule = new job.schedule();
//            schedule.create(1);
//        }

        if (result.MESSAGE !== 'MSG_SUCCESS_STATUS') {
            throw new lib.InternalError(result.MESSAGE);
        }
        logger.success(
            "LOC_RULE_CREATE_SUCCESS",
            parseInt(result.RULE_ID.toString())
        );
        conn.commit();
        return {
            ID: parseInt(result.RULE_ID.toString())
        };
    } catch (e) {
        conn.rollback();
        logger.error(
                "LOC_RULE_CREATE_FAILED",
                e
        );
        if (result || e instanceof lib.WebApplicationError) {
            throw e;
        } else {
            throw new lib.InternalError(
                messages.MSG_ERROR_CREATE_LOCATION_RULE, e);
        }
    } finally {
        if (conn) {
            conn.close();
        }
    }

};

locationRuleService.update = function(params) {
    var procName, updateProc, result, job, schedule, parameters = {};
    var exec_run,exec_work_hour, start_working_hour_time, end_working_hour_time, start_working_hour_time_DST, end_working_hour_time_DST, timezone,start_datetime,end_datetime;

    if(params.obj.hasOwnProperty("KEEP_EXECUTION_RUNS")){
    	if (params.obj.KEEP_EXECUTION_RUNS === null || params.obj.KEEP_EXECUTION_RUNS === "" || params.obj.KEEP_EXECUTION_RUNS === ''){
    		exec_run = null;
        }
    	else {
    		exec_run = params.obj.KEEP_EXECUTION_RUNS
    	}
    }
    else{
    	exec_run = null;
    }

//    if(params.obj.hasOwnProperty("EXECUTE_WORKING_HOUR")){
//        exec_work_hour = params.obj.EXECUTE_WORKING_HOUR;
//    }
//
//    if(params.obj.hasOwnProperty("TIMEZONES")){
//        timezone = params.obj.TIMEZONES;
//    }
//
//    if(params.obj.hasOwnProperty("START_DATETIME") && params.obj.START_DATETIME && timezone ){
//        start_datetime = utils.localToUtcByHana(params.obj.START_DATETIME,timezone);
//        if(start_datetime){
//            start_datetime= start_datetime.toISOString();
//        }
//    }
//
//    if(params.obj.hasOwnProperty("END_DATETIME") && params.obj.END_DATETIME && timezone){
//        end_datetime = utils.localToUtcByHana(params.obj.END_DATETIME,timezone);
//        if(end_datetime){
//            end_datetime= end_datetime.toISOString();
//        }
//    }
//
//    if(params.obj.hasOwnProperty("START_WORKING_HOUR_TIME") && timezone && params.obj.START_WORKING_HOUR_TIME ){
//        start_working_hour_time = utils.localToUtcByHana(params.obj.START_WORKING_HOUR_TIME,timezone);
//    }
//
//    if(params.obj.hasOwnProperty("START_WK_HOUR_TIME_DST")){
//        start_working_hour_time_DST = params.obj.START_WK_HOUR_TIME_DST;
//    }else if(params.obj.hasOwnProperty("START_WORKING_HOUR_TIME") && timezone && exec_work_hour === 'X'){
//        var startLocalTimestamp = utils.utcToLocalByHana( params.obj.START_WORKING_HOUR_TIME,timezone);
//        start_working_hour_time_DST = timeFormatHelper.dateFormat('HH:mm',startLocalTimestamp)+':00';
//    }
//
//    if(params.obj.hasOwnProperty("END_WORKING_HOUR_TIME") && timezone && params.obj.END_WORKING_HOUR_TIME){
//        end_working_hour_time =  utils.localToUtcByHana(params.obj.END_WORKING_HOUR_TIME,timezone);
//    }
//
//    if(params.obj.hasOwnProperty("END_WK_HOUR_TIME_DST")){
//        end_working_hour_time_DST = params.obj.END_WK_HOUR_TIME_DST;
//    }else if(params.obj.hasOwnProperty("END_WORKING_HOUR_TIME") && timezone && exec_work_hour === 'X'){
//        var endLocalTimestamp = utils.utcToLocalByHana( params.obj.END_WORKING_HOUR_TIME,timezone);
//        end_working_hour_time_DST = timeFormatHelper.dateFormat('HH:mm',endLocalTimestamp)+':00';
//    }
    
        //Replacing undefined with null to solve $.hdb issue
      params.obj.NAME = params.obj.NAME===undefined?null:params.obj.NAME;
      params.obj.DESCRIPTION = params.obj.DESCRIPTION===undefined?null:params.obj.DESCRIPTION;
      params.obj.TYPE = params.obj.TYPE===undefined?null:params.obj.TYPE;
      params.obj.TIME_RANGE_INTERVAL = params.obj.TIME_RANGE_INTERVAL===undefined?null:params.obj.TIME_RANGE_INTERVAL;
      params.obj.TIME_RANGE_UNIT   = params.obj.TIME_RANGE_UNIT===undefined?null:params.obj.TIME_RANGE_UNIT;
      params.obj.EQUIPMENT_FILTER_ID = params.obj.EQUIPMENT_FILTER_ID===undefined?null:params.obj.EQUIPMENT_FILTER_ID;
      params.obj.LOCATION_FILTER_ID = params.obj.LOCATION_FILTER_ID===undefined?null:params.obj.LOCATION_FILTER_ID;
      params.obj.SD_PLAN_ID= params.obj.SD_PLAN_ID===undefined?null:params.obj.SD_PLAN_ID;
      params.obj.NETWORK_SETTING_GROUP_ID= params.obj.NETWORK_SETTING_GROUP_ID===undefined?null:params.obj.NETWORK_SETTING_GROUP_ID;
      params.obj.SCHEDULE_TIME_TYPE=  params.obj.SCHEDULE_TIME_TYPE===undefined?null: params.obj.SCHEDULE_TIME_TYPE;
      params.obj.RECURRENCE_INTERVAL = params.obj.RECURRENCE_INTERVAL===undefined?null:params.obj.RECURRENCE_INTERVAL;
      params.obj.RECURRENCE_TYPE = params.obj.RECURRENCE_TYPE===undefined?null:params.obj.RECURRENCE_TYPE;
      params.obj.RECURRENCE_DAY = params.obj.RECURRENCE_DAY===undefined?null:params.obj.RECURRENCE_DAY;
      params.obj.OP_SETTING_TYPE = params.obj.OP_SETTING_TYPE===undefined?null:params.obj.OP_SETTING_TYPE;
      params.obj.LOCATION_DETERMIN_ID = params.obj.LOCATION_DETERMIN_ID===undefined?null:params.obj.LOCATION_DETERMIN_ID;
      params.obj.OPTIMIZATION= params.obj.OPTIMIZATION===undefined?null:params.obj.OPTIMIZATION;
      params.obj.ALLOWED_USAGE = params.obj.ALLOWED_USAGE===undefined?null:params.obj.ALLOWED_USAGE;
      params.obj.FILTER_EXECUTION = params.obj.FILTER_EXECUTION===undefined?null:params.obj.FILTER_EXECUTION;
      params.obj.EXCLUSIVE_RULE_ID =  params.obj.EXCLUSIVE_RULE_ID===undefined?null: params.obj.EXCLUSIVE_RULE_ID;
      params.obj.TIME_WINDOW = params.obj.TIME_WINDOW===undefined?null:params.obj.TIME_WINDOW;
      params.obj.RANK_NUMBER = params.obj.RANK_NUMBER===undefined?null:params.obj.RANK_NUMBER;
      params.obj.RESOURCE_CATEGORY =params.obj.RESOURCE_CATEGORY===undefined?null:params.obj.RESOURCE_CATEGORY;
      params.obj.SELECTION_DATE = params.obj.SELECTION_DATE===undefined?null:params.obj.SELECTION_DATE;
        start_datetime = start_datetime===undefined?null:start_datetime;
       end_datetime = end_datetime===undefined?null:end_datetime;
       exec_run = exec_run===undefined?null:exec_run;
       exec_work_hour = exec_work_hour===undefined?null:exec_work_hour;
       start_working_hour_time = start_working_hour_time===undefined?null:start_working_hour_time;
       end_working_hour_time = end_working_hour_time===undefined?null:end_working_hour_time;
       timezone = timezone===undefined?null:timezone;

    //conn = $.hdb.getConnection();
    try {
        procName = PACKAGE + '::p_location_rule_update';
        updateProc = conn.loadProcedure(SCHEMA, procName);
        result = updateProc(
                params.id,
                params.obj.NAME,
                params.obj.DESCRIPTION,
                params.obj.TIME_RANGE_INTERVAL,
                params.obj.TIME_RANGE_UNIT,
                params.obj.EQUIPMENT_FILTER_ID,
                params.obj.LOCATION_FILTER_ID,
                params.obj.SD_PLAN_ID,
                params.obj.NETWORK_SETTING_GROUP_ID,
                params.obj.SCHEDULE_TIME_TYPE,
                params.obj.RECURRENCE_INTERVAL,
                params.obj.RECURRENCE_TYPE,
                params.obj.RECURRENCE_DAY,
                start_datetime,
                end_datetime,
                params.obj.OP_SETTING_TYPE,
                params.obj.LOCATION_DETERMIN_ID,
                params.obj.OPTIMIZATION,
                params.obj.ALLOWED_USAGE,
                params.obj.FILTER_EXECUTION,
                params.obj.EXCLUSIVE_RULE_ID,
                params.obj.TIME_WINDOW,
                params.obj.RANK_NUMBER,
                params.obj.SELECTION_DATE,
                exec_run,
                exec_work_hour, start_working_hour_time, end_working_hour_time, timezone);

//        parameters.xsJob = xsJob;
//        parameters.scheduleType = SCHEDULE_TYPE;
//        parameters.connSqlcc = connSqlcc;
//        parameters.jobSqlcc = jobSqlcc;
//        parameters.modelId = params.id;
//        parameters.execWorkHour = exec_work_hour;
//        parameters.startWorkHour = start_working_hour_time_DST;
//        parameters.endWorkHour = end_working_hour_time_DST;
//        parameters.resourceCategory = params.obj.RESOURCE_CATEGORY;
//        parameters.timezone = params.obj.TIMEZONES
//        if(params.obj.SCHEDULE_TIME_TYPE === 1) {
//            parameters.startTime = start_datetime;
//            parameters.expiryTime = end_datetime;
//            parameters.recurrence = {
//                TYPE : params.obj.RECURRENCE_TYPE,
//                INTERVAL : params.obj.RECURRENCE_INTERVAL,
//                DAY : params.obj.RECURRENCE_DAY
//            };
//            job = new jobManager.Job(parameters);
//            schedule = new job.schedule();
//            schedule.update();
//        } else {
//            parameters.uri = uri;
//            parameters.functionName = functionName;
//            job = new jobManager.Job(parameters);
//            schedule = new job.schedule();
//            schedule.cancel();
//        }

        if (result.MESSAGE !== 'MSG_SUCCESS_STATUS') {
            throw new lib.InternalError(result.MESSAGE);
        }
        logger.success(
            "LOC_RULE_UPDATE_SUCCESS",
            params.id
        );
        conn.commit();
    } catch (e) {
        conn.rollback();
        if (result) {
            logger.error(
                "LOC_RULE_UPDATE_FAILED",
                params.id,
                ["Message: " + e.message, "Cause: " + e.cause].join("; ")
            );
             throw e;
        } else {
            logger.error(
                "LOC_RULE_UPDATE_FAILED",
                params.id,
                e
            );
            throw new lib.InternalError(
                    messages.MSG_ERROR_UPDATE_LOCATION_RULE, e);
        }
    } finally {
        if (conn) {
            conn.close();
        }
    }
};

locationRuleService.destroy = function(params) {
    var procName, deleteProc, result,  job, schedule, parameters = {};
    //conn = $.hdb.getConnection();
    try {
        procName = PACKAGE + '::p_location_rule_delete';
        deleteProc = conn.loadProcedure(SCHEMA, procName);
        result = deleteProc(params.id);
        if (result.MESSAGE !== 'MSG_SUCCESS_STATUS') {
            throw new lib.InternalError(result.MESSAGE);
        }
//        parameters.xsJob = xsJob;
//        parameters.scheduleType = SCHEDULE_TYPE;
//        parameters.modelId = params.id;
//        parameters.connSqlcc = connSqlcc;
//        parameters.jobSqlcc = jobSqlcc;
//        parameters.uri = uri;
//        parameters.functionName = functionName;
//        job = new jobManager.Job(parameters);
//        schedule = new job.schedule();
//        schedule.cancel();
        conn.commit();
        logger.success(
            "LOC_RULE_DELETE_SUCCESS",
            params.id
        );
    } catch (e) {
        conn.rollback();
        if (result) {
            logger.error(
                "LOC_RULE_DELETE_FAILED",
                params.id,
                ["Message: " + e.message, "Cause: " + e.cause].join("; ")
            );
            throw e;
        } else {
            logger.error(
                "LOC_RULE_DELETE_FAILED",
                params.id,
                e
            );
            throw new lib.InternalError(
                messages.MSG_ERROR_DELETE_LOCATION_RULE, e);
        }
    } finally {
        if (conn) {
            conn.close();
        }
    }
};

locationRuleService.facetFilter = function(params){
    var facetFilterProc =conn.loadProcedure(
        SCHEMA,
        [PACKAGE, 'p_location_rule_facet_filter_get'].join('::')
    );
    try {
        var filteredData = facetFilterProc(
            params.obj.search,
            params.obj.RULE_TYPE_LIST,
            params.obj.SD_PLAN_ID_LIST,
            params.obj.TIME_RANGE_UNIT_LIST,
            params.obj.RESOURCE_FILTER_ID_LIST,
            params.obj.LOCATION_FILTER_ID_LIST,
            params.obj.NETWORK_SETTING_GROUP_ID_LIST,
            params.obj.LOC_DET_ID_LIST,
            params.obj.SCHEDULE_TIME_TYPE_LIST,
            params.obj.OPT_LIST,
            params.obj.RESOURCE_CATEGORY
        );

        var nullStr = 'NULL';
        var facetFilterResult = generateServiceReturnObj(
            filteredData,
            [
                {field: "RULE_TYPE", varName: "RULE_TYPE_LIST_OUTPUT"},
                {field: "SD_PLAN_ID", varName: "SD_PLAN_ID_LIST_OUTPUT"},
                {field: "RESOURCE_FILTER_ID", varName: "RESOURCE_FILTER_ID_LIST_OUTPUT"},
                {field: "LOCATION_FILTER_ID", varName: "LOCATION_FILTER_ID_LIST_OUTPUT"},
                {field: "NETWORK_SETTING_GROUP_ID", varName: "NETWORK_SETTING_GROUP_ID_LIST_OUTPUT"},
                {field: "LOCATION_DETERMIN_ID", varName: "LOC_DET_ID_LIST_OUTPUT"},
                {field: "OPTIMIZATION", varName: "OPTIMIZATION_LIST_OUTPUT"},
                {field: "SCHEDULE_TIME_TYPE", varName: "SCHEDULE_TIME_TYPE_LIST_OUTPUT"},
                {field: "TIME_RANGE_UNIT", varName: "TIME_RANGE_UNIT_LIST_OUTPUT"}
            ]
        );
        return facetFilterResult;
    } catch (e) {
        logger.error("LOCATION_RULE_FACET_FILTER_GET_FAILED",
            JSON.stringify(params),
            e);
        throw e;
    }
};

locationRuleService.sdPlanFacetFilter = function(params){
    var facetFilterProc = conn.loadProcedure(
        SCHEMA,
        [PACKAGE, 'p_sd_plan_facet_filter_get'].join('::')
    );
    
    try {
        var filteredData = facetFilterProc(
            params.obj.search,
            params.obj.LOCATION_FILTER_ID,
            params.obj.EQUIPMENT_FILTER_ID,
            params.obj.PLAN_TYPE_LIST,
            params.obj.TIME_FILTER_LIST,
            params.obj.VISIBILITY_LIST
        );
        var facetFilterResult = generateServiceReturnObj(
            filteredData,
            [
                {field: "PLAN_TYPE_ID", varName: "PLAN_TYPE_LIST_OUTPUT" },
                {field: "EQUIPMENT_FILTER_ID", varName: "EQUIP_FILTER_LIST_OUTPUT" },
                {field: "LOCATION_FILTER_ID", varName: "LOC_FILTER_LIST_OUTPUT" },
                {field: "TIME_FILTER_ID", varName: "TIME_FILTER_LIST_OUTPUT" },
                {field: "VISIBILITY", varName: "VISIBILITY_LIST_OUTPUT" },
            ]
        );
        return facetFilterResult;
    } catch (e) {
        logger.error("SUPPLY_DEMAND_FACET_FILTER_GET_FAILED",
            JSON.stringify(params),
            e);
        throw e;
    }
};

locationRuleService.setRoutes([
    {
        method: $.net.http.POST,
        scope: 'collection',
        action: 'facetFilter'
    },
    {
        method: $.net.http.POST,
        scope: 'collection',
        action: 'sdPlanFacetFilter'
    }
]);

var filterObjectList = [
    {service: ["create"], privilege: "CreateLocationRule"},
    {service: ["update"], privilege: "UpdateLocationRule"},
    {service: ["destroy"], privilege: "DeleteLocationRule"},
    {service: ["facetFilter"], privilege: "QueryLocationRule"}
].map(function(checkPrivInfo){
    return {
        filter: function(params){
            var privilege = [SERVICE_PKG, checkPrivInfo.privilege].join("::");

            if (!$.session.hasAppPrivilege(privilege)) {
                logger.error(
                    "LOC_RULE_UNAUTHORIZED",
                    privilege
                );
                throw new lib.NotAuthorizedError(privilege);
            }
            return true;
        },
        only: checkPrivInfo.service
    }
}).concat([
    {
        filter: function(params){
            try {
                return geoCheckLib.authorizeReadByPlanIdList([{ID: params.obj.SD_PLAN_ID}]);
            } catch (e) {
                logger.error(
                    "LOC_RULE_GEO_CHECK_READ_PLAN_FAILED",
                    e
                );
                throw e;
            }
        },
        only: ["create", "update"]
    },
    {
        filter: function(params){
            if (params.obj.hasOwnProperty("LOCATION_FILTER_ID") && [-999, 0].indexOf(params.obj.LOCATION_FILTER_ID) === -1) {
                try {
                    return geoCheckLib.authorizeReadByLocationFilterIdList([{ID: params.obj.LOCATION_FILTER_ID}]);
                } catch (e) {
                    logger.error(
                        "LOC_RULE_GEO_CHECK_READ_LOC_FILTER_FAILED",
                        e
                    );
                    throw e;
                }
            }

            return true;
        },
        only: ["create", "update", "facetFilter", "sdPlanFacetFilter"]
    },
]);

locationRuleService.setFilters.apply(
    locationRuleService,
    filterObjectList
);

locationRuleService.setFilters([
{
    filter : function(params) {
        try {
            return getUserInfoAuthCheck(params.id);
        } catch (e) {
            logger.error("USER_INFO_CHECK_FAILED",
                messages.MSG_ERROR_UNAUTHORIZED_UPDATE,
                e);
            throw new lib.InternalError(
                    messages.MSG_ERROR_UNAUTHORIZED_UPDATE, e);
        }
    },
    only : [ "update" ]
},
{
    filter : function(params) {
        try {
            return getUserInfoAuthCheck(params.id);
        } catch (e) {
            logger.error("USER_INFO_CHECK_FAILED",
                messages.MSG_ERROR_UNAUTHORIZED_DELETE,
                e);
            throw new lib.InternalError(
                    messages.MSG_ERROR_UNAUTHORIZED_DELETE, e);
        }
    },
    only : [ "destroy" ]
},
{
    filter : function(params) {
        var checkResult, checkProc;
          try {
              checkProc = conn.loadProcedure(SCHEMA, 'sap.tm.trp.db.pickupreturn::p_location_rule_save_check');
              checkResult = checkProc(params.obj.EQUIPMENT_FILTER_ID, params.obj.LOCATION_FILTER_ID, params.obj.SD_PLAN_ID, params.obj.ALLOWED_USAGE);
              if(checkResult.CODE_LIST.length > 0) {
                  logger.error(messages.MSG_VISIBILITY_CHECK_FAILED_ITEM, checkResult.CODE_LIST, params.id);
                  throw new lib.InternalError(messages.MSG_VISIBILITY_CHECK_FAILED_ITEM, checkResult.CODE_LIST);
              }
          } catch (e) {
              if (e instanceof lib.WebApplicationError) {
                  throw e;
              }
              logger.error("VISIBILITY_CHECK_FAILED", e, params.id);
              throw new lib.InternalError(messages.MSG_VISIBILITY_CHECK_FAILED, e);
          }
        return true;
  },
  only : [ "create", "update" ]
}]);

try {
    locationRuleService.handle();
} finally {
    logger.close();
}