var logger = new ($.import("/sap/tm/trp/service/xslib/applog.xsjslib")).AppLog();
var xsJob = "/sap/tm/trp/service/archive/executor.xsjob";
var constants = $.import('/sap/tm/trp/service/xslib/constants.xsjslib');
var jobFactory=$.import("/sap/tm/trp/service/common/job/JobFactory.xsjslib");
var lib = $.import('/sap/tm/trp/service/xslib/railxs.xsjslib');
var messages = $.import('/sap/tm/trp/service/xslib/messages.xsjslib');
var jobManager = $.import("/sap/tm/trp/service/xslib/jobManagement.xsjslib");

function executeArchiving(ruleId){

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

}

function run(params) {
    var job, schedule, parameters = {};

  //set next schedule
    parameters.scheduleType = params.SCHEDULE_TYPE;
    parameters.startTime = params.START_TIME;
    parameters.expiryTime = params.EXPIRE_TIME;
    parameters.recurrence = params.RECURRENCE;
    parameters.modelId = params.MODEL_ID;
    parameters.xsJob = xsJob;
    parameters.connSqlcc = params.CONN_SQLCC;
    parameters.jobSqlcc = params.JOB_SQLCC;

    if(params.hasOwnProperty("TIMEZONE")){
      parameters.timezone = params.TIMEZONE;
    }
    //parameters.resourceCategory = params.RESOURCE_CATEGORY;
    job = new jobManager.Job(parameters);
    schedule = new job.schedule();
    schedule.next();

    //execute
    executeArchiving(params.MODEL_ID);
}