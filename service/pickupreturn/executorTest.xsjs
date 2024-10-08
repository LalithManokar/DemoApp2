var jobManager = $.import("/sap/tm/trp/service/xslib/jobManagement.xsjslib");
var xsJob = '/sap/tm/trp/service/pickupreturn/executor.xsjob';
var constants = $.import("/sap/tm/trp/service/xslib/constants.xsjslib");
var locationRuleExecRunDelete = $.import('/sap/tm/trp/service/xslib/locationRuleExecRunDelete.xsjslib').execute;
var determinationExecute = $.import('/sap/tm/trp/service/xslib/determinationExecutor.xsjslib').execute;
var finalizeExecute = $.import('/sap/tm/trp/service/xslib/finalize.xsjslib').execute;
var logger = new ($.import("/sap/tm/trp/service/xslib/applog.xsjslib")).AppLog("pickupreturn/executor");

function executeLocationRule(ruleId, resourceCategory) {
    var conn;
    try {
        logger.info("PR_LOCATION_RULE_EXECUTION", ruleId);

        conn = $.db.getConnection();
        conn.setAutoCommit(false);

        determinationExecute(ruleId, logger, conn);
        logger.success("PR_LOCATION_DETERMINATION_RULE_EXECUTE_SUCCEED", ruleId);

        finalizeExecute (ruleId, [], resourceCategory, logger, conn);
        logger.success("PR_FINALIZE_EXECUTE_SUCCEED", ruleId);
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
            if (rs.length === 0) {    //no schedule running
                executeLocationRule(parseInt(params.MODEL_ID), params.RESOURCE_CATEGORY);
            }
            conn.close();
    } catch (e) {
    	conn.close();
    }

}

var para = {
    "CONN_SQLCC":"sap.tm.trp.service.xslib::JobUser",
    "JOB_SQLCC":"/sap/tm/trp/service/xslib/JobUser.xssqlcc",
    "MODEL_ID":644,
    "START_TIME":"2019-10-09T22:00:00.000Z",
    "EXPIRE_TIME":"2028-10-15T02:00:00.000Z",
    "RECURRENCE":{"TYPE":"MINUTE","INTERVAL":6,"DAY":null},
    "SCHEDULE_TYPE":"LOCATION_RULE",
    "RESOURCE_CATEGORY":"CONTAINER",
    "EXECWORKHOUR":"X",
    "STARTWORKHOUR":"09:30:00",
    "ENDWORKHOUR":"22:00:00",
    "TIMEZONE":"Asia/Shanghai"
};

run(para);
