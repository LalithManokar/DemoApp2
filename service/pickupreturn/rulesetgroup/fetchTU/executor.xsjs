var jobManager = $.import("/sap/tm/trp/service/xslib/jobManagement.xsjslib");
var fetchTUJob = '/sap/tm/trp/service/pickupreturn/rulesetgroup/fetchTU/executor.xsjob';
var constants = $.import("/sap/tm/trp/service/xslib/constants.xsjslib");
var logger = new ($.import("/sap/tm/trp/service/xslib/applog.xsjslib")).AppLog("pickupreturn/executor");
var procLib = $.import('/sap/tm/trp/service/xslib/procedures.xsjslib');


function executefetchTU(ruleGroupId, executionId) {
    var conn;
    // conn = $.db.getConnection();
    try {
        

        conn = $.hdb.getConnection();
        conn.setAutoCommit(false);
        
        var setStageTable = conn.loadProcedure(constants.SCHEMA_NAME, 
        [constants.SP_PKG_PICKUP_RETURN + '.rulesetgroup','p_ext_get_tu_for_location_assignment_rulegroup'].join('::'));
        
        setStageTable(ruleGroupId,executionId);

        logger.info("PR_RULE_GROUP_FETCH_TU_EXECUTION", ruleGroupId);
        conn.commit();
        
    } catch (e) {
        conn.rollback();
        logger.error("PR_RULE_GROUP_FETCH_TU_EXECUTION_ERROR", ruleGroupId, e);
    } finally {
        
        logger.close();
        conn.close();
    }
    
    
}



function run(params) {
    var job, schedule, parameters, eventId = {};
    var status_running = "RUNNING";
    
    parameters = {};
    //set the next schedule
    parameters.scheduleType = params.SCHEDULE_TYPE;
    parameters.startTime = params.START_TIME;
    parameters.expiryTime = params.EXPIRE_TIME;

    parameters.recurrence = params.RECURRENCE;
    parameters.modelId = params.MODEL_ID;
    parameters.xsJob = fetchTUJob;
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
    




    var conn = $.hdb.getConnection();
    
  
    //create next schedule
    job = new jobManager.Job(parameters);
    schedule = new job.schedule()
	eventId = schedule.currentScheduleId();
	schedule.next();     
    

          try {
                  var sql = "SELECT B.ID FROM \"SAP_TM_TRP\".\"sap.tm.trp.db.job::t_job_schedule\" A INNER JOIN \"_SYS_XS\".\"JOB_LOG\" B ON A.SCHEDULE_ID = B.ID WHERE A.SCHEDULE_TYPE = ? AND A.MODEL_ID = ? AND B.STATUS =?";
                  var rs = conn.executeQuery(sql,  params.SCHEDULE_TYPE, params.MODEL_ID, status_running);
                  if (rs.length === 1) {    //no schedule running
                    executefetchTU(params.MODEL_ID, parseInt(eventId));
                  }
                  conn.close();
          } catch (e) {
              conn.close();
          }
}