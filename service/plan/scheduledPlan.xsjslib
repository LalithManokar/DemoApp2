var model = $.import("/sap/tm/trp/service/model/scheduledPlans.xsjslib");
var lib = $.import("/sap/tm/trp/service/plan/plan.xsjslib");
var utils = $.import("sap.tm.trp.service.xslib", "utils");
var timeFormatHelper = $.import("sap.tm.trp.service.xslib", "timeFormatHelper");
var xslib = lib.xslib;
var constants = lib.constants;
var plan = lib.plan;
var jobManager = lib.jobManager;
var logger = lib.logger;
var SCHEDULED_PLAN_TYPE = lib.constants.PLAN_TYPE.SCHEDULED;

plan.setModel(model.Plans);

function getTrkSupplyDemandByExecId(execId) {
    var getTrkSD, result;
    getTrkSD = new lib.Procedure(constants.SCHEMA_NAME,
            "sap.tm.trp.db.supplydemand::p_cal_tracking_supply_demand");
    result = getTrkSD(execId);

    return {
        SD_LOC : result.TRK_SD_BY_LOC,
        SD_LOC_EQUIP : result.TRK_SD_DRILL_DOWN,
        SD_EQUIP : result.TRK_SD_BY_EQUIP
    };
}

plan.create = function(params) {
    var conn = $.db.getConnection();
    
    var exec_run, exec_work_hour, start_working_hour_time, start_working_hour_time_simple, end_working_hour_time, end_working_hour_time_simple,has_schedule, timezone,start_time,expiry_time;
    
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
        var createPlanProc, procName, createResult;
        procName = constants.SP_PKG_PIPELINE + "::p_schedule_plan_create";
        createPlanProc = new lib.Procedure(constants.SCHEMA_NAME, procName, {
            connection : conn
        });
        createResult = createPlanProc(params.obj.NAME,
                params.obj.RESOURCE_FILTER_ID, params.obj.TIME_FILTER_ID,
                params.obj.LOCATION_FILTER_ID, params.obj.CALCULATION_MODEL_ID,
                SCHEDULED_PLAN_TYPE, params.obj.DESC, params.obj.VISIBILITY,
                params.obj.ALERT_RULE_GROUP_ID, params.obj.ATTRIBUTE_GROUP_ID,
                params.obj.RESOURCE_CATEGORY, exec_run, params.obj.USAGE, params.obj.USAGE_CODE);
        //only create scheduling when Scheduling Job Settings are complete  
        if(expiry_time && expiry_time!== ''
           && expiry_time && expiry_time !== ''
           && params.obj.SCHEDULE.RECURRENCE_TYPE && params.obj.SCHEDULE.RECURRENCE_TYPE !== ''
           && params.obj.SCHEDULE.RECURRENCE_INTERVAL && params.obj.SCHEDULE.RECURRENCE_INTERVAL !== ''
            && params.obj.SCHEDULE.TIMEZONES &&  params.obj.SCHEDULE.TIMEZONES !== ''
           ){
	        	if( (params.obj.SCHEDULE.RECURRENCE_TYPE === 'MONTH' || params.obj.SCHEDULE.RECURRENCE_TYPE === 'WEEK')
	        		&& (params.obj.SCHEDULE.RECURRENCE_DAY === null || params.obj.SCHEDULE.RECURRENCE_DAY === '') ){        		
	        		has_schedule = '';
	        	} else {
	        	
		        	if(exec_work_hour&& exec_work_hour === 'X'){
		        		if (start_working_hour_time && start_working_hour_time !== '' && end_working_hour_time&&end_working_hour_time !== ''
			        	   &&start_working_hour_time_simple && start_working_hour_time_simple !== ''
			        	   &&end_working_hour_time_simple && end_working_hour_time_simple !== '' 
			        	   ){
			        		has_schedule = 'X';
			        	 }else{
			        		   has_schedule = '';
			        	 }
		        	} else {	           	
		        	   has_schedule = 'X';
		        	 }
	        	}
           } else {
           	has_schedule = '';
           }
        
      if(has_schedule === 'X'){
        var scheduleProcName = "sap.tm.trp.db.job::p_create_model_schedule_detail";
        var createScheduleProc = new lib.Procedure(constants.SCHEMA_NAME,
                scheduleProcName, {
                    connection : conn
                });
        createScheduleProc(createResult.PLAN_MODEL_ID,
                start_time,
                expiry_time,
                params.obj.SCHEDULE.RECURRENCE_TYPE,
                params.obj.SCHEDULE.RECURRENCE_INTERVAL,
                params.obj.SCHEDULE.RECURRENCE_DAY,
                lib.SCHEDULE_TYPE,
                exec_work_hour,
                start_working_hour_time,
                end_working_hour_time,
                params.obj.SCHEDULE.TIMEZONES
                );

        var parameters = {
            xsJob : lib.xsJob,
            scheduleType : lib.SCHEDULE_TYPE,
            startTime : start_time,
            expiryTime : expiry_time,
            recurrence : {
                TYPE : params.obj.SCHEDULE.RECURRENCE_TYPE,
                INTERVAL : params.obj.SCHEDULE.RECURRENCE_INTERVAL,
                DAY : params.obj.SCHEDULE.RECURRENCE_DAY
            },
            execWorkHour: exec_work_hour,
            startWorkHour: start_working_hour_time_simple,
            endWorkHour: end_working_hour_time_simple,
            timezone:timezone,
            modelId : createResult.PLAN_MODEL_ID,
            connSqlcc : lib.connSqlcc,
            jobSqlcc : lib.jobSqlcc
        };

        var job = new jobManager.Job(parameters);
        var schedule = new job.schedule();
        schedule.create();
       }
        conn.commit();

        logger.success("SCHEDULE_PLAN_CREATE", createResult.PLAN_MODEL_ID,
                params.obj.NAME, params.obj.RESOURCE_FILTER_ID.toString(),
                params.obj.LOCATION_FILTER_ID.toString(),
                params.obj.CALCULATION_MODEL_ID.toString(),
                params.obj.ALERT_RULE_GROUP_ID.toString(),
                params.obj.ATTRIBUTE_GROUP_ID.toString(),
                params.obj.RESOURCE_CATEGORY.toString(),
                params.obj.KEEP_EXECUTION_RUNS.toString(),
                params.obj.USAGE.toString(), params.obj.USAGE_CODE.toString());

        return {
            ID : createResult.PLAN_MODEL_ID
        };
    } catch (e) {
        logger.error("SCHEDULE_PLAN_CREATE_FAILED", params.obj.NAME,
                params.obj.RESOURCE_FILTER_ID.toString(),
                params.obj.LOCATION_FILTER_ID.toString(),
                params.obj.CALCULATION_MODEL_ID.toString(),
                params.obj.ALERT_RULE_GROUP_ID.toString(),
                params.obj.ATTRIBUTE_GROUP_ID.toString(),
                params.obj.RESOURCE_CATEGORY.toString(),
                params.obj.KEEP_EXECUTION_RUNS.toString(),
                params.obj.USAGE.toString(), params.obj.USAGE_CODE.toString(), e);

        conn.rollback();
        throw e;
    } finally {
        if (conn) {
            conn.close();
        }
    }
};

plan.update = function(params) {

    var conn, exec_run, exec_work_hour, start_working_hour_time, start_working_hour_time_simple, end_working_hour_time, end_working_hour_time_simple, timezone;
    var start_time,expiry_time,recurrence_type, recurrence_interval,recurrence_day;
    
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
    
   if(params.obj.SCHEDULE){

	   recurrence_type = params.obj.SCHEDULE.RECURRENCE_TYPE;
	   recurrence_interval = params.obj.SCHEDULE.RECURRENCE_INTERVAL;
	   recurrence_day = params.obj.SCHEDULE.RECURRENCE_DAY;

	   if(params.obj.SCHEDULE.hasOwnProperty("TIMEZONES")){
	        timezone = params.obj.SCHEDULE.TIMEZONES;
	   }else{
	    	timezone = null;
	   }

       if(params.obj.SCHEDULE.hasOwnProperty("START_TIME") && timezone){
    	   if(params.obj.SCHEDULE.START_TIME){	   
    	       start_time = utils.localToUtcByHana(params.obj.SCHEDULE.START_TIME,timezone);
    	   }else{
    		   start_time = null;
    	   }
       }

       if(params.obj.SCHEDULE.hasOwnProperty("EXPIRY_TIME") && timezone){
    	   if(params.obj.SCHEDULE.EXPIRY_TIME){
    		   expiry_time = utils.localToUtcByHana(params.obj.SCHEDULE.EXPIRY_TIME,timezone);  
    	   }else{
    		   expiry_time = null;
    	   }
           
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

	   // full filled undefined data
       if(!recurrence_interval||recurrence_interval === ''){
       	recurrence_interval = null;
       }
       start_time = start_time===undefined?null:start_time;
       expiry_time = expiry_time===undefined?null:expiry_time;
       recurrence_type = recurrence_type===undefined?null:recurrence_type;
       recurrence_day = recurrence_day===undefined?null:recurrence_day;
       exec_work_hour = exec_work_hour===undefined?null:exec_work_hour;
       start_working_hour_time = start_working_hour_time===undefined?null:start_working_hour_time;
       end_working_hour_time = end_working_hour_time===undefined?null:end_working_hour_time;
       timezone = timezone===undefined?null:timezone;
   }else{
	   start_time = null;
	   expiry_time = null;
	   recurrence_type = null;
	   recurrence_interval = null;
	   recurrence_day = null;
	   exec_work_hour = null;
	   start_working_hour_time = null;
	   end_working_hour_time = null;
	   timezone = null;	 
   }
   
    try {
        conn = $.db.getConnection();

        var procName = constants.SP_PKG_PIPELINE + "::p_schedule_plan_update";
        var updatePlanProc = new lib.Procedure(constants.SCHEMA_NAME, procName,
                {
                    connection : conn
                });

        var updateMessage = updatePlanProc(params.id, params.obj.NAME,
                params.obj.RESOURCE_FILTER_ID, params.obj.TIME_FILTER_ID,
                params.obj.LOCATION_FILTER_ID, params.obj.CALCULATION_MODEL_ID,
                SCHEDULED_PLAN_TYPE, params.obj.DESC, params.obj.VISIBILITY,
                params.obj.ALERT_RULE_GROUP_ID, params.obj.ATTRIBUTE_GROUP_ID,
                exec_run, params.obj.USAGE, params.obj.USAGE_CODE,
                start_time,
                expiry_time,
                recurrence_type,
                recurrence_interval,
                recurrence_day,
                timezone,
                lib.SCHEDULE_TYPE);

        if(updateMessage.MESSAGE !== "MSG_SUCCESS_STATUS") {
            throw new xslib.InternalError(updateMessage.MESSAGE);
        }

        var scheduleProcName = "sap.tm.trp.db.job::p_update_model_schedule_detail";
        var updateScheduleProc = new lib.Procedure(constants.SCHEMA_NAME,
                scheduleProcName, {
                    connection : conn
                });
        var updateResult;
        updateResult = updateScheduleProc(params.id, start_time,
        		expiry_time,
        		recurrence_type,
        		recurrence_interval,
        		recurrence_day, lib.SCHEDULE_TYPE,
                exec_work_hour,
                start_working_hour_time,
                end_working_hour_time,
                timezone
                );
       
       if(updateResult.JOB_ACTION ==='NO_ACTION' || updateResult.JOB_ACTION === null || updateResult.JOB_ACTION === undefined){
    	  
       } else {
    	  var parameters,job,schedule;
    	  if (updateResult.JOB_ACTION === 'JOB_CANCEL'){
    		  parameters = {
    		            xsJob : lib.xsJob,
    		            scheduleType : lib.SCHEDULE_TYPE,
    		            modelId : params.id,
    		            connSqlcc : lib.connSqlcc,
    		            jobSqlcc : lib.jobSqlcc,
    		            uri : lib.uri,
    		            functionName : lib.functionName
    		        };

		        job = new jobManager.Job(parameters);
		        schedule = new job.schedule();
		        
		        schedule.cancel();
    	  } else {
		       if (updateResult.JOB_ACTION === 'JOB_UPDATE') {       
		         parameters = {
		            xsJob : lib.xsJob,
		            scheduleType : lib.SCHEDULE_TYPE,
		            startTime : start_time,
		            expiryTime : expiry_time,
		            recurrence : {
		                TYPE : params.obj.SCHEDULE.RECURRENCE_TYPE,
		                INTERVAL : params.obj.SCHEDULE.RECURRENCE_INTERVAL,
		                DAY : params.obj.SCHEDULE.RECURRENCE_DAY
		            },
		            execWorkHour: exec_work_hour,
		            startWorkHour: start_working_hour_time_simple,
		            endWorkHour: end_working_hour_time_simple,
		            timezone:timezone,
		            modelId : params.id,
		            connSqlcc : lib.connSqlcc,
		            jobSqlcc : lib.jobSqlcc
		        };
		        job = new jobManager.Job(parameters);
		        schedule = new job.schedule();
		
		        schedule.update();
		        
		       } else if(updateResult.JOB_ACTION === 'JOB_CREATE'){
		    	   parameters = {
		    	            xsJob : lib.xsJob,
		    	            scheduleType : lib.SCHEDULE_TYPE,
		    	            startTime : start_time,
		    	            expiryTime : expiry_time,
		    	            recurrence : {
		    	                TYPE : params.obj.SCHEDULE.RECURRENCE_TYPE,
		    	                INTERVAL : params.obj.SCHEDULE.RECURRENCE_INTERVAL,
		    	                DAY : params.obj.SCHEDULE.RECURRENCE_DAY
		    	            },
		    	            execWorkHour: exec_work_hour,
		    	            startWorkHour: start_working_hour_time_simple,
		    	            endWorkHour: end_working_hour_time_simple,
		    	            modelId : params.id,
		    	            connSqlcc : lib.connSqlcc,
		    	            jobSqlcc : lib.jobSqlcc
		    	        };

		    	        job = new jobManager.Job(parameters);
		    	        schedule = new job.schedule();
		    	        
		    	        schedule.create();
		       }
    	  }           
 
       }
        
       conn.commit();
       logger.success("SCHEDULE_PLAN_UPDATE", params.id, params.obj.NAME,
               params.obj.RESOURCE_FILTER_ID.toString(),
               params.obj.LOCATION_FILTER_ID.toString(),
               params.obj.CALCULATION_MODEL_ID.toString(),
               params.obj.ALERT_RULE_GROUP_ID.toString(),
               params.obj.ATTRIBUTE_GROUP_ID.toString(),
               params.obj.KEEP_EXECUTION_RUNS.toString(),
               params.obj.USAGE.toString(), params.obj.USAGE_CODE.toString());
    } catch (e) {
        conn.rollback();
        logger.error("SCHEDULE_PLAN_UPDATE_FAILED", params.id, params.obj.NAME,
                params.obj.RESOURCE_FILTER_ID.toString(),
                params.obj.LOCATION_FILTER_ID.toString(),
                params.obj.CALCULATION_MODEL_ID.toString(),
                params.obj.ALERT_RULE_GROUP_ID.toString(),
                params.obj.ATTRIBUTE_GROUP_ID.toString(),
                params.obj.KEEP_EXECUTION_RUNS.toString(),
                params.obj.USAGE.toString(), params.obj.USAGE_CODE.toString(),e);
        if (e instanceof xslib.WebApplicationError) {
            throw e;
        }
        throw new xslib.InternalError(lib.messages.MSG_ERROR_UPDATE_PLAN_MODEL,
                e);
    } finally {
        if (conn) {
            conn.close();
        }
    }
};

plan.destroy = function(params) {
    var conn = $.db.getConnection();
    try {
        var procName, destroyPlanProc, cancelScheduleProc, job, schedule, parameters = {};
        procName = constants.SP_PKG_PIPELINE + "::p_schedule_plan_delete";
        destroyPlanProc = new lib.Procedure(constants.SCHEMA_NAME, procName, {
            connection : conn
        });
        destroyPlanProc(params.id);

        cancelScheduleProc = new lib.Procedure(constants.SCHEMA_NAME,
                "sap.tm.trp.db.job::p_cancel_model_schedule_detail", {
                    connection : conn
                });
        cancelScheduleProc(params.id, lib.SCHEDULE_TYPE);

        parameters.xsJob = lib.xsJob;
        parameters.scheduleType = lib.SCHEDULE_TYPE;
        parameters.modelId = params.id;
        parameters.connSqlcc = lib.connSqlcc;
        parameters.jobSqlcc = lib.jobSqlcc;
        parameters.uri = lib.uri;
        parameters.functionName = lib.functionName;

        job = new jobManager.Job(parameters);
        schedule = new job.schedule();
        schedule.cancel();
        conn.commit();
        logger.success("SCHEDULE_PLAN_DELETE", params.id);
    } catch (e) {
        conn.rollback();
        logger.error('SCHEDULE_PLAN_DELETE_FAILED', params.id, e);
        throw new xslib.InternalError(lib.messages.MSG_ERROR_DELETE_PLAN_MODEL,
                e);
    } finally {
        if (conn) {
            conn.close();
        }
    }
};

plan.toTemplate = function(params) {
    var conn = $.db.getConnection();
    try {
        var procName = constants.SP_PKG_PIPELINE
                + "::p_schedule_plan_to_template_plan";
        var toTemplatePlanProc = new lib.Procedure(constants.SCHEMA_NAME,
                procName, {
                    connection : conn
                });
        toTemplatePlanProc(params.id);

        var cancelScheduleProc = new lib.Procedure(constants.SCHEMA_NAME,
                "sap.tm.trp.db.job::p_cancel_model_schedule_detail", {
                    connection : conn
                });
        cancelScheduleProc(params.id, lib.SCHEDULE_TYPE);

        var parameters = {
            xsJob : lib.xsJob,
            scheduleType : lib.SCHEDULE_TYPE,
            modelId : params.id,
            connSqlcc : lib.connSqlcc,
            jobSqlcc : lib.jobSqlcc,
            uri : lib.uri,
            functionName : lib.functionName
        };

        var job = new jobManager.Job(parameters);
        var schedule = new job.schedule();
        schedule.cancel();
        conn.commit();
        logger.success("SCHEDULE_PLAN_TRANSFER", params.id);
    } catch (e) {
        conn.rollback();
        logger.error("SCHEDULE_PLAN_TRANSFER_FAILED", params.id, e);
        throw new xslib.InternalError(
                lib.messages.MSG_ERROR_SCHEDULE_PLAN_TO_TEMPLATE_PLAN, e);
    } finally {
        if (conn) {
            conn.close();
        }
    }
};

plan.exec = function(params) {
    try {
        return lib.executor.execute(params.id, null, null, null, null, null,
                null, null);
    } catch (e) {
        if (e instanceof xslib.WebApplicationError) {
            throw e;
        }
        throw new xslib.InternalError(
                lib.messages.MSG_ERROR_EXECUTE_PLAN_MODEL, e);
    }
};

plan.supplyDemandByLocation = function(params) {
    try {
        var result;
        if (params.obj.resourceType === 'all_types') {
            result = lib.getSupplyDemandExecutionResultByLocation( 
                    params.id,params.obj.timezone,params.obj.execId, params.obj.nodeId, params.obj.locations);
        } else {
            result = lib.getSupplyDemandExecutionResultByLocationOfResource(
                    params.obj.execId, params.obj.nodeId, params.obj.locations,
                    params.obj.resourceType);
        }
        return lib.reviseSDArraylib.reviseArraySD(result, false);
    } catch (e) {
        if (e instanceof xslib.WebApplicationError) {
            throw e;
        }
        throw new xslib.InternalError(lib.messages.MSG_ERROR_GET_PLAN_RESULTS,
                e);
    }
};

plan.supplyDemandByResource = function(params) {
    try {
        var result;
        result = lib.getSupplyDemandExecutionResultByResource(
                params.id,params.obj.timezone,params.obj.execId, params.obj.nodeId, params.obj.locations);
        return lib.reviseSDArraylib.reviseArraySD(result, true);
    } catch (e) {
        if (e instanceof xslib.WebApplicationError) {
            throw e;
        }
        throw new xslib.InternalError(lib.messages.MSG_ERROR_GET_PLAN_RESULTS,
                e);
    }
};

plan.trkSupplyDemand = function(params) {
    try {
        var result;
        result = getTrkSupplyDemandByExecId(params.obj.execId);
        return {
            SD_LOC : lib.reviseSDArraylib.reviseArraySD(result.SD_LOC, false),
            SD_LOC_EQUIP : lib.reviseSDArraylib
                    .reviseArraySDForTrackingData(result.SD_LOC_EQUIP),
            SD_EQUIP : lib.reviseSDArraylib
                    .reviseArraySD(result.SD_EQUIP, true)
        };
    } catch (e) {
        if (e instanceof xslib.WebApplicationError) {
            throw e;
        }
        throw new xslib.InternalError(lib.messages.MSG_ERROR_GET_PLAN_RESULTS,
                e);
    }
};

plan.locationSupplyDemand = function(params) {
    try {
        var result;
        result = lib.getLocationSupplyDemandExecutionResult(params.id,params.obj.timezone,params.obj.execId,
                params.obj.nodeId, params.obj.locations);
        return lib.reviseSDArraylib.reviseArraySD(result, true);
    } catch (e) {
        if (e instanceof xslib.WebApplicationError) {
            throw e;
        }
        throw new xslib.InternalError(lib.messages.MSG_ERROR_GET_PLAN_RESULTS,
                e);
    }
};

plan.locationSupplyDemandByPlanId = function(params) {
    try {
        var result;
        var obj = params.obj;
        result = lib.getLocationSupplyDemandResultByPlanId(params.id,
                obj.resourceTypeCode, obj.geoId, obj.nodeId);
        return lib.reviseSDArraylib.reviseArraySD(result, true);
    } catch (e) {
        if (e instanceof xslib.WebApplicationError) {
            throw e;
        }
        throw new xslib.InternalError(lib.messages.MSG_ERROR_GET_PLAN_RESULTS,
                e);
    }
};

plan.resourceSupplyDemand = function(params) {
    try {
        var result;
        result = lib.getResourceSupplyDemandExecutionResult(params.id,params.obj.timezone,params.obj.execId,
                params.obj.nodeId, params.obj.resourceTypeCode,
                params.obj.locations);
        return lib.reviseSDArraylib.reviseArraySD(result, false);
    } catch (e) {
        if (e instanceof xslib.WebApplicationError) {
            throw e;
        }
        throw new xslib.InternalError(lib.messages.MSG_ERROR_GET_PLAN_RESULTS,
                e);
    }
};

plan.locations = function(params) {
    try {
        return lib
                .getFilters(params.id, params.obj.timezone, params.obj.execId, params.obj.nodeId);
    } catch (e) {
        if (e instanceof xslib.WebApplicationError) {
            throw e;
        }
        throw new xslib.InternalError(lib.messages.MSG_ERROR_GET_LOCATIONS, e);
    }
};

plan.detailsByLocation = function(params) {
    try {
        var obj = params.obj;
        return lib.getExecutionSupplyDemandDetailsByLocation(params.id,params.obj.timezone,obj.execId,
                obj.nodeId, obj.type, obj.geoId, obj.resourceTypeCode,
                obj.sequence, obj.outputKeys);
    } catch (e) {
        if (e instanceof xslib.WebApplicationError) {
            throw e;
        }
        throw new xslib.InternalError(lib.messages.MSG_ERROR_GET_DETAILS, e);
    }
};

plan.detailsByResource = function(params) {
    try {
        var obj = params.obj;
        return lib.getExecutionSupplyDemandDetailsByResource(params.id,params.obj.timezone,obj.execId,
                obj.nodeId, obj.type, obj.resourceTypeCode, obj.locations,
                obj.sequence, obj.outputKeys);
    } catch (e) {
        if (e instanceof xslib.WebApplicationError) {
            throw e;
        }
        throw new xslib.InternalError(lib.messages.MSG_ERROR_GET_DETAILS, e);
    }
};

plan.allDetailsByLocation = function(params) {
    try {
        var obj = params.obj;
        var result = lib.getAllExecutionSupplyDemandDetailsByLocation(
                params.id,params.obj.timezone,obj.execId, obj.nodeId, obj.locations);
        var formated = lib.reviseSDArraylib.reviseArraySDAllDetails(result, false,
                obj.nodeId);
        for(var i in formated.results){
        	if(formated.results[i].SUPPLY){
        		for(var j in formated.results[i].SUPPLY){
        			if(j!=='TOTAL'&&j!=='POS_STOCK'){delete formated.results[i].SUPPLY[j];}
        		}
        	}
        	if(formated.results[i].DEMAND){
        		for(var j in formated.results[i].DEMAND){
        			if(j!=='TOTAL'&&j!=='POS_STOCK'){delete formated.results[i].DEMAND[j];}
        		}
        	}
        	if(formated.results[i].STOCK){
        		for(var j in formated.results[i].STOCK){
        			if(j!=='TOTAL'&&j!=='POS_STOCK'){delete formated.results[i].STOCK[j];}
        		}
        	}
        }
        return formated;
    } catch (e) {
        if (e instanceof xslib.WebApplicationError) {
            throw e;
        }
        throw new xslib.InternalError(lib.messages.MSG_ERROR_GET_DETAILS, e);
    }
};

plan.allDetailsByResource = function(params) {
    try {
        var obj = params.obj;
        var result = lib.getAllExecutionSupplyDemandDetailsByResource(
        		params.id,params.obj.timezone,obj.execId, obj.nodeId, obj.locations);
        var formated = lib.reviseSDArraylib.reviseArraySDAllDetails(result, true,
                obj.nodeId);
        for(var i in formated.results){
        	if(formated.results[i].SUPPLY){
        		for(var j in formated.results[i].SUPPLY){
        			if(j!=='TOTAL'&&j!=='POS_STOCK'){delete formated.results[i].SUPPLY[j];}
        		}
        	}
        	if(formated.results[i].DEMAND){
        		for(var j in formated.results[i].DEMAND){
        			if(j!=='TOTAL'&&j!=='POS_STOCK'){delete formated.results[i].DEMAND[j];}
        		}
        	}
        	if(formated.results[i].STOCK){
        		for(var j in formated.results[i].STOCK){
        			if(j!=='TOTAL'&&j!=='POS_STOCK'){delete formated.results[i].STOCK[j];}
        		}
        	}
        }
        return formated;
    } catch (e) {
        if (e instanceof xslib.WebApplicationError) {
            throw e;
        }
        throw new xslib.InternalError(lib.messages.MSG_ERROR_GET_DETAILS, e);
    }
};

plan.allDetailsExpandByLocation = function(params) {
    try {
        var obj = params.obj;
        var result = lib.getAllExecutionSupplyDemandDetailsExpandByLocation(
        		params.id, params.obj.execId, params.obj.timezone, obj.nodeId, obj.locations);
        return lib.reviseSDArraylib.reviseArraySDAllDetails(result, true,
                obj.nodeId);
    } catch (e) {
        if (e instanceof xslib.WebApplicationError) {
            throw e;
        }
        throw new xslib.InternalError(lib.messages.MSG_ERROR_GET_DETAILS, e);
    }
};

plan.allDetailsExpandByResource = function(params) {
    try {
        var obj = params.obj;
        var result = lib.getAllExecutionSupplyDemandDetailsExpandByResource(
        		params.id, params.obj.execId, params.obj.timezone, obj.nodeId, obj.resourceTypeCode, obj.locations);
        return lib.reviseSDArraylib.reviseArraySDAllDetails(result, false,
                obj.nodeId);
    } catch (e) {
        if (e instanceof xslib.WebApplicationError) {
            throw e;
        }
        throw new xslib.InternalError(lib.messages.MSG_ERROR_GET_DETAILS, e);
    }
};

plan.alertsOnMap = function(params) {
    try {
        var obj = params.obj, alertsOnMap;
        if (obj.resourceType === 'all_types') {
            alertsOnMap = lib.getAlertOnMapByExecId(obj.execId, obj.nodeId,
                    obj.startTime, obj.polygon);
        } else {
            alertsOnMap = lib.getAlertOnMapByResourceType(obj.execId,
                    obj.nodeId, obj.startTime, obj.polygon, obj.resourceType);
        }
        return alertsOnMap;
    } catch (e) {
        if (e instanceof xslib.WebApplicationError) {
            throw e;
        }
        throw new xslib.InternalError(lib.messages.MSG_ERROR_ALERTS_ON_MAP, e);
    }
};

plan.bubbleOnMap = function(params) {
    try {
        var obj = params.obj, bubbleOnMap;
        if (obj.resourceType === 'all_types') {
            bubbleOnMap = lib.getBubbleOnMapByExecId(params.id, params.obj.timezone, obj.execId, obj.nodeId,
                    obj.sequence, obj.polygon);
        } else {
            bubbleOnMap = lib.getBubbleOnMapByResourceType(params.id, params.obj.timezone, obj.execId,
                    obj.nodeId, obj.sequence, obj.polygon, obj.resourceType);
        }
        return bubbleOnMap;
    } catch (e) {
        if (e instanceof xslib.WebApplicationError) {
            throw e;
        }
        throw new xslib.InternalError(lib.messages.MSG_ERROR_BUBBLE_ON_MAP, e);
    }
};

plan.pieOnMap = function(params) {
    try {
        var obj = params.obj, pieOnMap;
        if (obj.resourceType === 'all_types') {
            pieOnMap = lib.getPieOnMapByExecId(params.id, params.obj.timezone, obj.execId, obj.nodeId,
                    obj.sequence, obj.polygon);
        } else {
            pieOnMap = lib.getPieOnMapByResourceType(params.id, params.obj.timezone, obj.execId, obj.nodeId,
                    obj.sequence, obj.polygon, obj.resourceType);
        }
        return pieOnMap;
    } catch (e) {
        if (e instanceof xslib.WebApplicationError) {
            throw e;
        }
        throw new xslib.InternalError(lib.messages.MSG_ERROR_PIE_ON_MAP, e);
    }
};

plan.download = function(params) {
    try {
        // get the csv result
        var result = lib.getDownloadCSVArray(params.obj.downloadType,
                params.id, params.obj.execId, params.obj.timezone, params.obj.nodeId, params.obj.locations);
        // format the array according to the csv
        var reviseResult = lib.reviseCsvFormat(result.CSVARRAY,
                params.obj.downloadType);
        // Export as CSV
        lib.zipperCSV(result.CSVNAME, reviseResult.formatArray,
                reviseResult.columnArray);
    } catch (e) {
        throw new xslib.InternalError(
                lib.messages.MSG_ERROR_SUPPLY_DEMAND_DOWNLOAD, e);
    }
};

plan
        .setFilters([
                {
                    filter : function(params) {
                        try {
                            var checkProc = new lib.Procedure(
                                    constants.SCHEMA_NAME,
                                    "sap.tm.trp.db.pipeline::p_plan_delete_check");
                            var checkResult = checkProc(params.id).WHEREUSED;

                            if (checkResult.length > 0) {
                                throw new xslib.InternalError(
                                        lib.messages.MSG_ERROR_CANCEL_SCHEDULE_PLAN);
                            }
                            return true;
                        } catch (e) {
                            logger.error("PLAN_CHECK_FAILED", e, params.id);
                            if (e instanceof xslib.WebApplicationError) {
                                throw e;
                            }
                            throw new xslib.InternalError(
                                    lib.messages.MSG_PLAN_CHECK_USED_FAILED, e);
                        }
                    },
                    only : [ "toTemplate" ]
                },
                {
                    filter : function() {
                        var privilege = "sap.tm.trp.service::CreateScheduledPlan";

                        if (!$.session.hasAppPrivilege(privilege)) {
                            logger.error("PLAN_CREATE_AUTHORIZE_FAILED",
                                    privilege);
                            throw new xslib.NotAuthorizedError(privilege);
                        }
                        return true;
                    },
                    only : [ "create" ]
                },
                {
                    filter : function() {
                        var privilege = "sap.tm.trp.service::UpdateScheduledPlan";

                        if (!$.session.hasAppPrivilege(privilege)) {
                            logger.error("PLAN_UPDATE_AUTHORIZE_FAILED",
                                    privilege);
                            throw new xslib.NotAuthorizedError(privilege);
                        }

                        return true;
                    },
                    only : [ "update" ]
                },
                {
                    filter : function(params) {
                        var conn, sql, rs1, usageCode;
                        conn = $.hdb.getConnection();
                        sql = "SELECT USAGE_CODE FROM \"SAP_TM_TRP\".\"sap.tm.trp.db.pipeline::t_plan_model\" WHERE ID=?";
                        rs1 = conn.executeQuery(sql, params.obj.ID);
                        usageCode = rs1[0].USAGE_CODE;
                        var privilege = "sap.tm.trp.service::ExecuteScheduledPlan";
                        var privilege_earu = "sap.tm.trp.service::ExecuteScheduledPlan_Eac_Ruleset";
                        var privilege_gene = "sap.tm.trp.service::ExecuteScheduledPlan_Gen_SDPlan";
                        var privilege_reso = "sap.tm.trp.service::ExecuteScheduledPlan_Res_Balancing";
                        var privilege_othr = "sap.tm.trp.service::ExecuteScheduledPlan_Oth_Category";

                        if (!$.session.hasAppPrivilege(privilege)) {
                            if(usageCode === "EARU" && $.session.hasAppPrivilege(privilege_earu)) {
                                return true;
                            } else if (usageCode === "GENE" && $.session.hasAppPrivilege(privilege_gene)) {
                                return true;
                            } else if (usageCode === "RESO" && $.session.hasAppPrivilege(privilege_reso)) {
                                return true;
                            } else if (usageCode === "OTHR" && $.session.hasAppPrivilege(privilege_othr)) {
                                return true;
                            } else {
                                logger.error("PLAN_EXECUTE_AUTHORIZE_FAILED",
                                    privilege);
                                throw new xslib.NotAuthorizedError(privilege);
                            }
                        } 
                        return true;
                    },
                    only : [ "exec" ]
                },
                {
                    filter : function() {
                        var privilege = "sap.tm.trp.service::DeleteScheduledPlan";

                        if (!$.session.hasAppPrivilege(privilege)) {
                            logger.error("PLAN_DELETE_AUTHORIZE_FAILED",
                                    privilege);
                            throw new xslib.NotAuthorizedError(privilege);
                        }
                        return true;
                    },
                    only : [ "destroy" ]
                },
                {
                    filter : function(params) {
                        try {
                            lib.geoCheck.authorizeReadByPlanIdList([ {
                                ID : params.id
                            } ]);

                            return true;
                        } catch (e) {
                            logger.error("PLAN_AUTHORIZE_FAILED", e);
                            throw e;
                        }
                    },
                    only : [ "supplyDemandByLocation",
                            "supplyDemandByResource", "locationSupplyDemand",
                            "locationSupplyDemandByPlanId",
                            "resourceSupplyDemand", "detailsByLocation",
                            "detailsByResource", "alertsOnMap", "bubbleOnMap",
                            "pieOnMap", "locations", "allDetailsByLocation",
                            "allDetailsByResource",
                            "allDetailsExpandByLocation ",
                            "allDetailsExpandByResource" ]
                },
                {
                    filter : function(params) {
                        return lib.checkPipelineByAttrGroup(
                                params.obj.ATTRIBUTE_GROUP_ID,
                                params.obj.CALCULATION_MODEL_ID);
                    },
                    only : [ "create", "update" ]
                },
                {
                    filter : function(params) {
                        var checkResult, checkProc, errorMessage;
                        try {
                            checkProc = new lib.Procedure(
                                    constants.SCHEMA_NAME,
                                    'sap.tm.trp.db.pipeline::p_schedule_plan_save_check');
                            checkResult = checkProc(params.id,
                                    params.obj.RESOURCE_FILTER_ID,
                                    params.obj.TIME_FILTER_ID,
                                    params.obj.LOCATION_FILTER_ID,
                                    params.obj.ALERT_RULE_GROUP_ID,
                                    params.obj.VISIBILITY);

                            if (checkResult.CODE_LIST.length > 0) {
                                if (checkResult.MSG === 'VISIBILITY_CHECK_FAILED_ITEM') {
                                    errorMessage = lib.messages.MSG_VISIBILITY_CHECK_FAILED_ITEM;
                                } else {
                                    errorMessage = lib.messages.MSG_VISIBILITY_CHECK_FAILED_USED_LIST;
                                }
                                logger.error(errorMessage,
                                        checkResult.CODE_LIST, params.id);
                                throw new xslib.InternalError(errorMessage,
                                        checkResult.CODE_LIST);
                            }

                        } catch (e) {
                            if (e instanceof xslib.WebApplicationError) {
                                throw e;
                            }
                            logger.error("VISIBILITY_CHECK_FAILED", e,
                                    params.id);
                            throw new xslib.InternalError(
                                    lib.messages.MSG_VISIBILITY_CHECK_FAILED, e);
                        }

                        return true;
                    },
                    only : [ "create", "update" ]
                },
                {// add used-check before delete the schedule
                    filter : function(params) {
                        try {
                            var checkProc = new lib.Procedure(
                                    constants.SCHEMA_NAME,
                                    "sap.tm.trp.db.pipeline::p_plan_delete_check");
                            var checkResult = checkProc(params.id).WHEREUSED;

                            if (checkResult.length > 0) {
                                throw new xslib.InternalError(
                                        lib.messages.MSG_PLAN_IS_USED);
                            }
                            return true;
                        } catch (e) {
                            logger.error("PLAN_CHECK_FAILED", e, params.id);
                            if (e instanceof xslib.WebApplicationError) {
                                throw e;
                            }
                            throw new xslib.InternalError(
                                    lib.messages.MSG_PLAN_CHECK_USED_FAILED, e);
                        }
                    },
                    only : [ "destroy" ]
                } ]);

plan.setRoutes([ {
    method : $.net.http.POST,
    scope : "member",
    action : "exec",
    response : $.net.http.OK
}, {
    method : $.net.http.PUT,
    scope : "member",
    action : "toTemplate",
    response : $.net.http.NO_CONTENT
}, {
    method : $.net.http.GET,
    scope : "member",
    action : "supplyDemandByLocation",
    response : $.net.http.OK
}, {
    method : $.net.http.GET,
    scope : "member",
    action : "supplyDemandByResource",
    response : $.net.http.OK
}, {
    method : $.net.http.GET,
    scope : "member",
    action : "trkSupplyDemand",
    response : $.net.http.OK
}, {
    method : $.net.http.GET,
    scope : "member",
    action : "locationSupplyDemand",
    response : $.net.http.OK
}, {
    method : $.net.http.GET,
    scope : "member",
    action : "locationSupplyDemandByPlanId",
    response : $.net.http.OK
}, {
    method : $.net.http.GET,
    scope : "member",
    action : "resourceSupplyDemand",
    response : $.net.http.OK
}, {
    method : $.net.http.GET,
    scope : "member",
    action : "alertsOnMap",
    response : $.net.http.OK
}, {
    method : $.net.http.GET,
    scope : "member",
    action : "bubbleOnMap",
    response : $.net.http.OK
}, {
    method : $.net.http.GET,
    scope : "member",
    action : "pieOnMap",
    response : $.net.http.OK
}, {
    method : $.net.http.GET,
    scope : "member",
    action : "detailsByLocation",
    response : $.net.http.OK
}, {
    method : $.net.http.GET,
    scope : "member",
    action : "detailsByResource",
    response : $.net.http.OK
}, {
    method : $.net.http.GET,
    scope : "member",
    action : "locations",
    response : $.net.http.OK
}, {
    method : $.net.http.GET,
    scope : "member",
    action : "allDetailsByLocation",
    response : $.net.http.OK
}, {
    method : $.net.http.GET,
    scope : "member",
    action : "allDetailsByResource",
    response : $.net.http.OK
}, {
    method : $.net.http.GET,
    scope : "member",
    action : "allDetailsExpandByLocation",
    response : $.net.http.OK
}, {
    method : $.net.http.GET,
    scope : "member",
    action : "allDetailsExpandByResource",
    response : $.net.http.OK
}, {
    method : $.net.http.GET,
    scope : "member",
    action : "download",
    response : $.net.http.OK
} ]);

plan.handle();