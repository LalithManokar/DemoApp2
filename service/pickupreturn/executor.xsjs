var jobManager = $.import("/sap/tm/trp/service/xslib/jobManagement.xsjslib");
var xsJob = '/sap/tm/trp/service/pickupreturn/executor.xsjob';
var constants = $.import("/sap/tm/trp/service/xslib/constants.xsjslib");
var locationRuleExecRunDelete = $.import('/sap/tm/trp/service/xslib/locationRuleExecRunDelete.xsjslib').execute;
var determinationExecute = $.import('/sap/tm/trp/service/xslib/determinationExecutor.xsjslib').execute;
var finalizeExecute = $.import('/sap/tm/trp/service/xslib/finalize.xsjslib').execute;
var logger = new ($.import("/sap/tm/trp/service/xslib/applog.xsjslib")).AppLog("pickupreturn/executor");
var procLib = $.import('/sap/tm/trp/service/xslib/procedures.xsjslib');

function transferDateToTmTimeStr(dateObj) {
	var fixLengthStr = function(num, length) {
		var numStr = num.toString();
		while (numStr.length < length) {
			numStr = '0' + numStr;
		}
		return numStr;
	};

	return (
		dateObj.getUTCFullYear() +
		fixLengthStr(dateObj.getUTCMonth() + 1, 2) +
		fixLengthStr(dateObj.getUTCDate(), 2) +
		fixLengthStr(dateObj.getUTCHours(), 2) +
		fixLengthStr(dateObj.getUTCMinutes(), 2) +
		fixLengthStr(dateObj.getUTCSeconds(), 2)
	);
}

function executeLocationRule(ruleId, resourceCategory) {
    var conn;
    try {
        logger.info("PR_LOCATION_RULE_EXECUTION", ruleId);

        conn = $.hdb.getConnection();
        conn.setAutoCommit(false);
        
        var setStageTable = conn.loadProcedure(
				constants.SCHEMA_NAME, [constants.SP_PKG_PICKUP_RETURN,
                                   'p_ext_get_tu_for_location_assignment'].join('::'));

        setStageTable(ruleId,resourceCategory,''); /*This is to fetch new TUs from TM at starting of new job*/
        
        var query = "SELECT count(*) as tableCount FROM \"SAP_TM_TRP\".\"sap.tm.trp.db.pickupreturn::t_pickupreturn_global_stage\"";
        var qStatement = conn.executeQuery(query);
        var resultCount = qStatement.getIterator();
        
        var result = {
        	    records : [ ]   
        	}; 

        	while (resultCount.next()) { 
        	    var temp=resultCount.value();
        	  result.records.push({value: temp[1]}); 
        	}
        /*If no TUs fetched then below processes will be skipped*/	
        if (result.records[0].value>0){		
        determinationExecute(ruleId, logger, conn);
        logger.success("PR_LOCATION_DETERMINATION_RULE_EXECUTE_SUCCEED", ruleId);

        finalizeExecute (ruleId, [], resourceCategory, logger, conn);
        logger.success("PR_FINALIZE_EXECUTE_SUCCEED", ruleId);
        
        }
        
        else{
        	
        var writeLogProc = conn.loadProcedure(
        			constants.SCHEMA_NAME, [constants.SP_PKG_PICKUP_RETURN, 'p_scheduling_trace_create'].join('::')
        		);
        var startTime = new Date();
        var runIdName = "LocationRule_" + ruleId + "_Finalize_" + transferDateToTmTimeStr(startTime); 
        var endTime = new Date();
        writeLogProc(
    			runIdName,
    			ruleId,
    			startTime,
    			endTime,
    			1,
    			''
    		);
        logger.success("LOC_ASSIGNMENT_GET_TOTAL_TU_LIST_FROM_TM", 0);
        }
        conn.commit();
        
        
    } catch (e) {
        conn.rollback();
        logger.error("PR_LOCATION_RULE_EXECUTION_FAILED", e, ruleId);
    } finally {
        if (conn) {
        	
        	conn.setAutoCommit(true);
            
        	locationRuleExecRunDelete(ruleId, conn, logger);
            logger.success("PR_DELETE_LOCATION_RULE_EXEC_RUNS_SUCCEED", ruleId);
            
            conn.close();
        }
        logger.close();
    }
}
function run(params) {
    var job, schedule, parameters = {};
    var status_running = "RUNNING";

  //set next schedule
    parameters.scheduleType = params.SCHEDULE_TYPE;
    parameters.startTime = params.START_TIME;
    parameters.expiryTime = params.EXPIRE_TIME;
    parameters.recurrence = params.RECURRENCE;
    parameters.modelId = params.MODEL_ID;
    parameters.xsJob = xsJob;
    parameters.connSqlcc = params.CONN_SQLCC;
    parameters.jobSqlcc = params.JOB_SQLCC;
    parameters.resourceCategory = params.RESOURCE_CATEGORY;
    
    if(params.hasOwnProperty("EXECWORKHOUR")){
        parameters.execWorkHour = params.EXECWORKHOUR;
    }
      
	if(params.hasOwnProperty("STARTWORKHOUR")){
	   parameters.startWorkHour = params.STARTWORKHOUR;
	}
	  
	if(params.hasOwnProperty("ENDWORKHOUR")){
	   parameters.endWorkHour = params.ENDWORKHOUR;
	}

    if(params.hasOwnProperty("TIMEZONE")){
      parameters.timezone = params.TIMEZONE;
    }
    
	//create the next schedule
    job = new jobManager.Job(parameters);
    schedule = new job.schedule();
    schedule.next();
    
    //check if any schedule for the plan is already running, If schedule is running, do not run the current job
    var conn = $.hdb.getConnection();
    try {
            var sql = "SELECT B.ID FROM \"SAP_TM_TRP\".\"sap.tm.trp.db.job::t_job_schedule\" A INNER JOIN \"_SYS_XS\".\"JOB_LOG\" B ON A.SCHEDULE_ID = B.ID WHERE A.SCHEDULE_TYPE = ? AND A.MODEL_ID = ? AND B.STATUS =?";
            var rs = conn.executeQuery(sql,  params.SCHEDULE_TYPE, params.MODEL_ID, status_running);
            if (rs.length === 1) {    //no schedule running
                executeLocationRule(parseInt(params.MODEL_ID), params.RESOURCE_CATEGORY);
            }
            conn.close();
    } catch (e) {
    	conn.close();
    }
   
}
