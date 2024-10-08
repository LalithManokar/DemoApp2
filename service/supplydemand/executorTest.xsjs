var executor = $.import("/sap/tm/trp/service/xslib/pipelineExecutor.xsjslib");
var jobManager = $.import("/sap/tm/trp/service/xslib/jobManagement.xsjslib");
var xsJob = '/sap/tm/trp/service/supplydemand/executor.xsjob';

function executePipeline(planId) {
    return executor.execute(planId, null, null, null, null, null, null,null);
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
            var rs = conn.executeQuery(sql, params.SCHEDULE_TYPE, params.MODEL_ID, status_running);
            if (rs.length === 1) {    //no schedule running
                executePipeline(params.MODEL_ID);
            }
            conn.close();
    } catch (e) { 
    	conn.close();
    }
}

var para = {
    "CONN_SQLCC":"sap.tm.trp.service.xslib::JobUser",
    "JOB_SQLCC":"/sap/tm/trp/service/xslib/JobUser.xssqlcc",
    "MODEL_ID":2,
    "START_TIME":"2020-02-20T23:00:00.000Z",
    "EXPIRE_TIME":"2022-01-20T23:00:00.000Z",
    "RECURRENCE":{"TYPE":"MINUTE","INTERVAL":8,"DAY":null},
    "SCHEDULE_TYPE":"PLAN",
    "RESOURCE_CATEGORY":null,
    "EXECWORKHOUR":"X",
    "STARTWORKHOUR":"09:30:00",
    "ENDWORKHOUR":"21:00:00",
    "TIMEZONE":"Asia/Shanghai"
};

run(para);

