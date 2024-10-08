var messages = $.import('/sap/tm/trp/service/xslib/messages.xsjslib');
var xsJob = '/sap/tm/trp/service/pickupreturn/executor.xsjob';
var SCHEDULE_TYPE = 'LOCATION_RULE';
var connSqlcc = 'sap.tm.trp.service.xslib::JobUser';
var jobSqlcc = '/sap/tm/trp/service/xslib/JobUser.xssqlcc';
var uri = "sap.tm.trp.service.xslib:deleteSchedules.xsjs";
var functionName = "deleteSchedule";
var constants = $.import("/sap/tm/trp/service/xslib/constants.xsjslib");
var jobManager = $.import("/sap/tm/trp/service/xslib/jobManagement.xsjslib");
var Procedure = $.import("/sap/tm/trp/service/xslib/procedures.xsjslib").Procedure;
var xslib = $.import("/sap/tm/trp/service/xslib/railxs.xsjslib");
var SCHEMA = constants.SCHEMA_NAME;

function run(){
    var conn, getRules, rules, parameters = {};
    conn = $.db.getConnection();
    try {

        getRules = new Procedure(SCHEMA, "sap.tm.trp.db.consistencycheck::p_get_inactive_jobs_for_location_rules", {
            connection: conn
        });

        rules = getRules();

        if(rules.LOCATION_OUTPUT.length !== 0){

            rules.LOCATION_OUTPUT.forEach(function(item){
                parameters.xsJob = xsJob;
                parameters.scheduleType = SCHEDULE_TYPE;
                parameters.connSqlcc = connSqlcc;
                parameters.jobSqlcc = jobSqlcc;
                parameters.modelId = item.ID;
                parameters.resourceCategory = item.RESOURCE_CATEGORY;
                if(item.SCHEDULE_TIME_TYPE === 1) {
                    parameters.startTime = item.START_DATETIME;
                    parameters.expiryTime = item.END_DATETIME;
                    parameters.recurrence = {
                        TYPE : item.RECURRENCE_TYPE,
                        INTERVAL : item.RECURRENCE_INTERVAL,
                        DAY : item.RECURRENCE_DAY
                    };
                    var job = new jobManager.Job(parameters);
                    var schedule = new job.schedule();
                    schedule.update();
                }
            });
            
            conn.commit();
        }
    } catch (e) {
        conn.rollback();
        if (e instanceof xslib.WebApplicationError) {
            throw e;
        }
        throw new xslib.InternalError(
                messages.MSG_ERROR_CREATE_LOCATION_RULE, e);
    } finally {
        if (conn) {
            conn.close();
        }
    }
}