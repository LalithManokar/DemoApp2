var jobManager = $.import("/sap/tm/trp/service/xslib/jobManagement.xsjslib");
var optimizeTUJob = '/sap/tm/trp/service/pickupreturn/rulesetgroup/optimizeTU/executor.xsjob';
var constants = $.import("/sap/tm/trp/service/xslib/constants.xsjslib");
var logger = new ($.import("/sap/tm/trp/service/xslib/applog.xsjslib")).AppLog("pickupreturn/executor");
var procLib = $.import('/sap/tm/trp/service/xslib/procedures.xsjslib');
var getTUCostGroup = $.import("/sap/tm/trp/service/xslib/getTUCostGroup.xsjslib");

function executeOptimizeTU(ruleGroupId, executionId) {
    var conn;
    
    
    var sql = "SELECT COUNT(NAME) as count FROM \"sap.tm.trp.db.systemmanagement.customization::t_general_parameters\" where NAME = 'LANE_TRP' AND VALUE = 'X'";
    var connection1 = $.hdb.getConnection();
    var rs = connection1.executeQuery(sql);
    connection1.close();
    var count = parseInt(rs[0].COUNT);	

    try {
        

        conn = $.hdb.getConnection();
        conn.setAutoCommit(false);
        
        if(count==0){
        var lane  = [];
		var laneList = [];
		var carrierList = [];
		var executionGroup = [];
		
		try {
			lane = getTUCostGroup.execute(ruleGroupId, conn); 
			laneList = lane.basicConnection;
			carrierList = lane.connectionCarrier;
			executionGroup = lane.executionId;
		// } catch (e) {
		// 	logger.error("PR_EXECUTE_DETERMINATION_FAILED", ruleGroupId, e);
		// }
        
        //give the name of the new procedure 
		// try{

         var setStageTable = conn.loadProcedure(constants.SCHEMA_NAME, 
         [constants.SP_PKG_PICKUP_RETURN + '.rulesetgroup','p_ext_determination_for_facet_filter_lane_rulegroup'].join('::'));
         setStageTable(ruleGroupId,executionId,laneList,carrierList,executionGroup);

        logger.info("PR_RULE_GROUP_OPTIMIZE_TU_EXECUTION", ruleGroupId);
        conn.commit();
        
    } catch (e) {
        conn.rollback();
        logger.error("PR_RULE_GROUP_OPTIMIZE_TU_EXECUTION_ERROR", ruleGroupId, e);
    } }
        else{
        	//give the name of the new procedure 
    		try{

             var setStageTable = conn.loadProcedure(constants.SCHEMA_NAME, [constants.SP_PKG_PICKUP_RETURN + '.rulesetgroup',
                                       'p_ext_determination_for_facet_filter_rulegroup'].join('::'));
             setStageTable(ruleGroupId,executionId);

            logger.info("PR_RULE_GROUP_OPTIMIZE_TU_EXECUTION", ruleGroupId);
            conn.commit();
            
        } catch (e) {
            conn.rollback();
            logger.error("PR_RULE_GROUP_OPTIMIZE_TU_EXECUTION_ERROR", ruleGroupId, e);
        }	
        
        }
    }
        finally {
        
        logger.close();
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
    parameters.xsJob = optimizeTUJob;
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
                    executeOptimizeTU(params.MODEL_ID, parseInt(eventId));
                  }
                  conn.close();
          } catch (e) {
              conn.close();
          }
}