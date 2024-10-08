var model = $.import('/sap/tm/trp/service/model/pickupreturn.xsjslib');
var lib = $.import('/sap/tm/trp/service/xslib/railxs.xsjslib');
var constants = $.import('/sap/tm/trp/service/xslib/constants.xsjslib');
var proc = $.import('/sap/tm/trp/service/xslib/procedures.xsjslib');
var messages = $.import('/sap/tm/trp/service/xslib/messages.xsjslib');
//var facetFilterUtils = $.import('/sap/tm/trp/service/xslib/utils.xsjslib').facetFilterUtils;
var logger = new ($.import("/sap/tm/trp/service/xslib/applog.xsjslib")).AppLog();
var geoCheckLib = $.import('/sap/tm/trp/service/xslib/geoCheck.xsjslib');
var xsJob = '/sap/tm/trp/service/pickupreturn/executor.xsjob';
var fetchTUJob = '/sap/tm/trp/service/pickupreturn/rulesetgroup/fetchTU/executor.xsjob';
var optimizeTUJob = '/sap/tm/trp/service/pickupreturn/rulesetgroup/optimizeTU/executor.xsjob';
var finalizeTUJob = '/sap/tm/trp/service/pickupreturn/rulesetgroup/finalizeTU/executor.xsjob';
var jobManager = $.import("/sap/tm/trp/service/xslib/jobManagement.xsjslib");
// var SCHEDULE_TYPE = 'LOCATION_RULE';
var connSqlcc = 'sap.tm.trp.service.xslib::JobUser';
var jobSqlcc = '/sap/tm/trp/service/xslib/JobUser.xssqlcc';
var uri = "sap.tm.trp.service.xslib:deleteSchedules.xsjs";
var functionName = "deleteSchedule";
var utils = $.import("sap.tm.trp.service.xslib", "utils");
var timeFormatHelper = $.import("sap.tm.trp.service.xslib", "timeFormatHelper");

var prLogger = new ($.import("/sap/tm/trp/service/xslib/applog.xsjslib")).AppLog("pickupreturn/executor");

var SCHEMA = constants.SCHEMA_NAME;
var PACKAGE = constants.SP_PKG_PICKUP_RETURN + '.rulesetgroup';
var SERVICE_PKG = "sap.tm.trp.service";

//service for rulesetgroup
var rulesetGroupService = new lib.SimpleRest({
    name: 'Ruleset Group',
    desc: 'operations about Ruleset Group',
    model: new model.RulesetGroup()
});
var conn = $.hdb.getConnection();

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
    // var getUserType = new proc.procedure(constants.SCHEMA_NAME, checkUserTypeProc);
    // var conn = $.hdb.getConnection();
    var getUserType = conn.loadProcedure(
			constants.SCHEMA_NAME, checkUserTypeProc);
    var userType = getUserType(id);
    if (userType.USER_TYPE !== 99) {
        if (userType.CREATOR !== $.session.getUsername()) {
            throw new lib.InternalError(messages.MSG_ERROR_AUTH_CHECK);
        }
    }
    return true;
}

rulesetGroupService.create = function(params) {
    var procName, createProc, result, parameters, schedule, job = {}; 

    var SCHEDULE = params.obj.SCHEDULE;

    var exec_work_hour, start_working_hour_time, start_working_hour_time_simple, end_working_hour_time, end_working_hour_time_simple,has_schedule, timezone,start_time,expiry_time;

    if(params.obj.SCHEDULE.hasOwnProperty("TIMEZONES")){
        timezone = params.obj.SCHEDULE.TIMEZONES;
    }else{
        timezone = null;
	}

    if(params.obj.SCHEDULE.hasOwnProperty("START_TIME") && timezone){
        start_time = utils.localToUtcByHana(params.obj.SCHEDULE.START_TIME,timezone);
    }

    if(params.obj.SCHEDULE.hasOwnProperty("EXPIRY_TIME") && timezone){
        expiry_time = utils.localToUtcByHana(params.obj.SCHEDULE.EXPIRY_TIME,timezone);
    }

	if(params.obj.SCHEDULE.hasOwnProperty("EXECUTE_WORKING_HOUR")){
	    exec_work_hour = params.obj.SCHEDULE.EXECUTE_WORKING_HOUR;
	}

    if(params.obj.SCHEDULE.hasOwnProperty("START_WORKING_HOUR_TIME") && timezone && params.obj.SCHEDULE.START_WORKING_HOUR_TIME){
        start_working_hour_time = utils.localToUtcByHana(params.obj.SCHEDULE.START_WORKING_HOUR_TIME,timezone);
    }

    if(params.obj.SCHEDULE.hasOwnProperty("START_WK_HOUR_TIME_DST")){
        start_working_hour_time_simple = params.obj.SCHEDULE.START_WK_HOUR_TIME_DST;
    }else if(params.obj.SCHEDULE.hasOwnProperty("START_WORKING_HOUR_TIME") && timezone && exec_work_hour === 'X'){
        var startLocalTimestamp = utils.utcToLocalByHana( params.obj.SCHEDULE.START_WORKING_HOUR_TIME,timezone);
        start_working_hour_time_simple= timeFormatHelper.dateFormat('HH:mm',startLocalTimestamp)+':00';
    }

    if(params.obj.SCHEDULE.hasOwnProperty("END_WORKING_HOUR_TIME") && timezone && params.obj.SCHEDULE.END_WORKING_HOUR_TIME){
        end_working_hour_time = utils.localToUtcByHana(params.obj.SCHEDULE.END_WORKING_HOUR_TIME,timezone);
    }

    if(params.obj.SCHEDULE.hasOwnProperty("END_WK_HOUR_TIME_DST")){
        end_working_hour_time_simple = params.obj.SCHEDULE.END_WK_HOUR_TIME_DST;
    }else if(params.obj.SCHEDULE.hasOwnProperty("END_WORKING_HOUR_TIME") && timezone && exec_work_hour === 'X'){
        var endLocalTimestamp = utils.utcToLocalByHana( params.obj.SCHEDULE.END_WORKING_HOUR_TIME,timezone);
        end_working_hour_time_simple= timeFormatHelper.dateFormat('HH:mm',endLocalTimestamp)+':00';
    }

    
    try {
        procName = PACKAGE + '::p_ruleset_group_create';
        // createProc = new proc.procedure(SCHEMA, procName, {
        //     connection: conn
        // });
        createProc = conn.loadProcedure(SCHEMA, procName);
        //add schedule parameters to this procedure for updating the schedule table
        var rulesetList = [];
    	for(var i in params.obj.RULESET_LIST){
    		rulesetList.push({ID:params.obj.RULESET_LIST[i]});
    	}
        result = createProc(
                params.obj.NAME,
                params.obj.DESCRIPTION||null,
                params.obj.RULESET_TYPE,
                params.obj.JOB_PROCESS_ID,
                params.obj.RESOURCE_CATEGORY,
                rulesetList,
                new Date(start_time.getTime() + start_time.getTimezoneOffset() * 60 * 1000),
                new Date(expiry_time.getTime() + expiry_time.getTimezoneOffset() * 60 * 1000),
                params.obj.SCHEDULE.RECURRENCE_TYPE,
                params.obj.SCHEDULE.RECURRENCE_INTERVAL,
                params.obj.SCHEDULE.RECURRENCE_DAY,
                exec_work_hour,
                start_working_hour_time===undefined?null:new Date(start_working_hour_time.getTime() + start_working_hour_time.getTimezoneOffset() * 60 * 1000),
                end_working_hour_time===undefined?null:new Date(end_working_hour_time.getTime() + end_working_hour_time.getTimezoneOffset() * 60 * 1000),
                params.obj.SCHEDULE.TIMEZONES
                );

        
        if (result.MESSAGE !== 'MSG_SUCCESS_STATUS') {
            throw new lib.InternalError(result.MESSAGE);
        }
        
            parameters = {};    
             switch (params.obj.JOB_PROCESS_ID) {
                 case '1': 
                     parameters.xsJob = fetchTUJob;
                     parameters.scheduleType = 'FETCH_TU'
                     break;

                 case '2':
                     parameters.xsJob = optimizeTUJob;
                     parameters.scheduleType = 'OPTIMIZE_TU'
                     break;
                 
                 case '3':
                     parameters.xsJob = finalizeTUJob;
                     parameters.scheduleType = 'FINALIZE_TU'
                     break;
             }

                parameters.startTime = start_time;
                parameters.expiryTime = expiry_time;
                parameters.recurrence = {
                    TYPE : SCHEDULE.RECURRENCE_TYPE,
                    INTERVAL : SCHEDULE.RECURRENCE_INTERVAL,
                    DAY : SCHEDULE.RECURRENCE_DAY
                };
                parameters.execWorkHour = exec_work_hour;
                parameters.startWorkHour = start_working_hour_time_simple;
                parameters.endWorkHour = end_working_hour_time_simple;
                parameters.timezone = timezone;
                parameters.resourceCategory = params.obj.RESOURCE_CATEGORY;
                parameters.modelId = parseInt(result.ID.toString());
                parameters.connSqlcc = connSqlcc;
                parameters.jobSqlcc = jobSqlcc;
                job = new jobManager.Job(parameters);
                schedule = new job.schedule();
                schedule.create(1);
                // exec_id = schedule.previousSchedule();
               
        logger.success(
            "RULESET_GROUP_CREATE_SUCCESS",
            parseInt(result.ID.toString())
        );
        conn.commit();
        return {
            ID: parseInt(result.ID.toString())
        };
    } catch (e) {
        conn.rollback();
        logger.error(
                "RULESET_GROUP_CREATE_FAILED",
                e
        );
        if (result || e instanceof lib.WebApplicationError) {
            throw e;
        } else {
            throw new lib.InternalError(messages.MSG_ERROR_CREATE_RULESET_GROUP, e);
        }
    } finally {
        if (conn) {
            conn.close();
        }
    }

};

rulesetGroupService.update = function(params) {
    var procName, updateProc, result, job, schedule, parameters = {};
    
    var SCHEDULE = params.obj.SCHEDULE;

    var exec_work_hour, start_working_hour_time, start_working_hour_time_simple, end_working_hour_time, end_working_hour_time_simple,has_schedule, timezone,start_time,expiry_time;

    if(params.obj.SCHEDULE.hasOwnProperty("TIMEZONES")){
        timezone = params.obj.SCHEDULE.TIMEZONES;
    }else{
        timezone = null;
	}

    if(params.obj.SCHEDULE.hasOwnProperty("START_TIME") && timezone){
        start_time = utils.localToUtcByHana(params.obj.SCHEDULE.START_TIME,timezone);
    }

    if(params.obj.SCHEDULE.hasOwnProperty("EXPIRY_TIME") && timezone){
        expiry_time = utils.localToUtcByHana(params.obj.SCHEDULE.EXPIRY_TIME,timezone);
    }

	if(params.obj.SCHEDULE.hasOwnProperty("EXECUTE_WORKING_HOUR")){
	    exec_work_hour = params.obj.SCHEDULE.EXECUTE_WORKING_HOUR;
	}

    if(params.obj.SCHEDULE.hasOwnProperty("START_WORKING_HOUR_TIME") && timezone && params.obj.SCHEDULE.START_WORKING_HOUR_TIME){
        start_working_hour_time = utils.localToUtcByHana(params.obj.SCHEDULE.START_WORKING_HOUR_TIME,timezone);
    }

    if(params.obj.SCHEDULE.hasOwnProperty("START_WK_HOUR_TIME_DST")){
        start_working_hour_time_simple = params.obj.SCHEDULE.START_WK_HOUR_TIME_DST;
    }else if(params.obj.SCHEDULE.hasOwnProperty("START_WORKING_HOUR_TIME") && timezone && exec_work_hour === 'X'){
        var startLocalTimestamp = utils.utcToLocalByHana( params.obj.SCHEDULE.START_WORKING_HOUR_TIME,timezone);
        start_working_hour_time_simple= timeFormatHelper.dateFormat('HH:mm',startLocalTimestamp)+':00';
    }

    if(params.obj.SCHEDULE.hasOwnProperty("END_WORKING_HOUR_TIME") && timezone && params.obj.SCHEDULE.END_WORKING_HOUR_TIME){
        end_working_hour_time = utils.localToUtcByHana(params.obj.SCHEDULE.END_WORKING_HOUR_TIME,timezone);
    }

    if(params.obj.SCHEDULE.hasOwnProperty("END_WK_HOUR_TIME_DST")){
        end_working_hour_time_simple = params.obj.SCHEDULE.END_WK_HOUR_TIME_DST;
    }else if(params.obj.SCHEDULE.hasOwnProperty("END_WORKING_HOUR_TIME") && timezone && exec_work_hour === 'X'){
        var endLocalTimestamp = utils.utcToLocalByHana( params.obj.SCHEDULE.END_WORKING_HOUR_TIME,timezone);
        end_working_hour_time_simple= timeFormatHelper.dateFormat('HH:mm',endLocalTimestamp)+':00';
    }
    
    
    try {
        procName = PACKAGE + '::p_ruleset_group_update';
        // updateProc = new proc.procedure(SCHEMA, procName, {
        //     connection: conn
        // });
        updateProc = conn.loadProcedure(SCHEMA, procName);
        var rulesetList = [];
    	for(var i in params.obj.RULESET_LIST){
    		rulesetList.push({ID:params.obj.RULESET_LIST[i]});
    	}
        result = updateProc(
        		params.id,
                params.obj.NAME,
                params.obj.DESCRIPTION||null,
                params.obj.JOB_PROCESS_ID,
                params.obj.RESOURCE_CATEGORY,
                rulesetList,
                new Date(start_time.getTime() + start_time.getTimezoneOffset() * 60 * 1000),
                new Date(expiry_time.getTime() + expiry_time.getTimezoneOffset() * 60 * 1000),
                params.obj.SCHEDULE.RECURRENCE_TYPE,
                params.obj.SCHEDULE.RECURRENCE_INTERVAL,
                params.obj.SCHEDULE.RECURRENCE_DAY,
                exec_work_hour,
                start_working_hour_time===undefined?null:new Date(start_working_hour_time.getTime() + start_working_hour_time.getTimezoneOffset() * 60 * 1000),
                end_working_hour_time===undefined?null:new Date(end_working_hour_time.getTime() + end_working_hour_time.getTimezoneOffset() * 60 * 1000),
                params.obj.SCHEDULE.TIMEZONES);

        parameters = {};    
        switch (result.JOB_PROCESS_ID) {
            case 1: 
                parameters.xsJob = fetchTUJob;
                parameters.scheduleType = 'FETCH_TU'
                break;

            case 2:
                parameters.xsJob = optimizeTUJob;
                parameters.scheduleType = 'OPTIMIZE_TU'
                break;
                 
            case 3:
                parameters.xsJob = finalizeTUJob;
                parameters.scheduleType = 'FINALIZE_TU'
                break;
        }
                
        parameters.connSqlcc = connSqlcc;
        parameters.jobSqlcc = jobSqlcc;
        parameters.modelId = params.id;
        parameters.execWorkHour = exec_work_hour;
        parameters.startWorkHour = start_working_hour_time_simple;
        parameters.endWorkHour = end_working_hour_time_simple;
        parameters.resourceCategory = params.obj.RESOURCE_CATEGORY;
        parameters.timezone = params.obj.SCHEDULE.TIMEZONES
        
        parameters.startTime = start_time;
        parameters.expiryTime = expiry_time;
        parameters.recurrence = {
            TYPE : params.obj.SCHEDULE.RECURRENCE_TYPE,
            INTERVAL : params.obj.SCHEDULE.RECURRENCE_INTERVAL,
            DAY : params.obj.SCHEDULE.RECURRENCE_DAY
        };
        job = new jobManager.Job(parameters);
        schedule = new job.schedule();
        schedule.update();
            
        if (result.MESSAGE !== 'MSG_SUCCESS_STATUS') {
            throw new lib.InternalError(result.MESSAGE);
        }
        logger.success(
            "RULESET_GROUP_UPDATE_SUCCESS",
            params.id
        );
        conn.commit();
    } catch (e) {
        conn.rollback();
        if (result) {
            logger.error(
                "RULESET_GROUP_UPDATE_FAILED",
                params.id,
                ["Message: " + e.message, "Cause: " + e.cause].join("; ")
            );
             throw e;
        } else {
            logger.error(
                "RULESET_GROUP_UPDATE_FAILED",
                params.id,
                e
            );
            throw new lib.InternalError(
                    messages.MSG_ERROR_UPDATE_RULESET_GROUP, e);
        }
    } finally {
        if (conn) {
            conn.close();
        }
    }
};

rulesetGroupService.destroy = function(params) {
    var procName, deleteProc, result, job, schedule, parameters = {};
    
    try {
        procName = PACKAGE + '::p_ruleset_group_delete';
        // deleteProc = new proc.procedure(SCHEMA, procName, {
        //     connection: conn
        // });
        deleteProc = conn.loadProcedure(SCHEMA, procName);
        result = deleteProc(params.id);
        if (result.MESSAGE !== 'MSG_SUCCESS_STATUS') {
            throw new lib.InternalError(result.MESSAGE);
        }

        parameters = {};    
        switch (result.JOB_PROCESS_ID) {
            case 1: 
                parameters.xsJob = fetchTUJob;
                parameters.scheduleType = 'FETCH_TU'
                break;

            case 2:
                parameters.xsJob = optimizeTUJob;
                parameters.scheduleType = 'OPTIMIZE_TU'
                break;
                 
            case 3:
                parameters.xsJob = finalizeTUJob;
                parameters.scheduleType = 'FINALIZE_TU'
                break;
        }


        parameters.modelId = params.id;
        parameters.connSqlcc = connSqlcc;
        parameters.jobSqlcc = jobSqlcc;
        parameters.uri = uri;
        parameters.functionName = functionName;
        job = new jobManager.Job(parameters);
        schedule = new job.schedule();
        schedule.cancel();
        
        conn.commit();
        logger.success(
            "RULESET_GROUP_DELETE_SUCCESS",
            params.id
        );
    } catch (e) {
        conn.rollback();
        if (result) {
            logger.error(
                "RULESET_GROUP_DELETE_FAILED",
                params.id,
                ["Message: " + e.message, "Cause: " + e.cause].join("; ")
            );
            throw e;
        } else {
            logger.error(
                "RULESET_GROUP_DELETE_FAILED",
                params.id,
                e
            );
            throw new lib.InternalError(
                messages.MSG_ERROR_DELETE_RULESET_GROUP, e);
        }
    } finally {
        if (conn) {
            conn.close();
        }
    }
};

rulesetGroupService.facetFilter = function(params){
    // var facetFilterProc = new proc.procedure(
    //     SCHEMA,
    //     [PACKAGE, 'p_ruleset_group_facet_filter_get'].join('::')
    // );
    // var conn = $.hdb.getConnection();
    var facetFilterProc = conn.loadProcedure(SCHEMA,
         [PACKAGE, 'p_ruleset_group_facet_filter_get'].join('::'));
    try {
        var filteredData = facetFilterProc(
            params.obj.search,
            params.obj.RULESET_TYPE_LIST,
            params.obj.JOB_PROCESS_ID_LIST,
            params.obj.RESOURCE_CATEGORY
        );

        var nullStr = 'NULL';
        var facetFilterResult = generateServiceReturnObj(
            filteredData,
            [
                {field: "RULESET_TYPE", varName: "RULESET_TYPE_OUTPUT"},
                {field: "JOB_PROCESS_ID", varName: "JOB_PROCESS_ID_OUTPUT"}
            ]
        );
        return facetFilterResult;
    } catch (e) {
        logger.error("RULESET_GROUP_FACET_FILTER_GET_FAILED",
            JSON.stringify(params),
            e);
        throw e;
    }
};

rulesetGroupService.setRoutes([
    {
        method: $.net.http.POST,
        scope: 'collection',
        action: 'facetFilter'
    }
]);


var filterObjectList = [
    {service: ["create"], privilege: "CreateRulesetGroup"},
    {service: ["update"], privilege: "UpdateRulesetGroup"},
    {service: ["destroy"], privilege: "DeleteRulesetGroup"},
    {service: ["facetFilter"], privilege: "QueryRulesetGroup"}
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
});

rulesetGroupService.setFilters.apply(
    rulesetGroupService,
    filterObjectList
);

rulesetGroupService.setFilters([
{
    // only the creator can edit or delete a rulesetgroup that has been created
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
    only : [ "update"]
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
}]);

try {
    rulesetGroupService.handle();
} finally {
    logger.close();
}