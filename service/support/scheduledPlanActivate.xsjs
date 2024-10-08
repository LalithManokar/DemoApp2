var xslib = $.import("/sap/tm/trp/service/xslib/railxs.xsjslib");
var constants = $.import("/sap/tm/trp/service/xslib/constants.xsjslib");
var jobManager = $.import("/sap/tm/trp/service/xslib/jobManagement.xsjslib");
var SCHEDULE_TYPE = "PLAN";
var xsJob = "/sap/tm/trp/service/supplydemand/executor.xsjob";
var connSqlcc = "sap.tm.trp.service.xslib::JobUser";
var jobSqlcc = "/sap/tm/trp/service/xslib/JobUser.xssqlcc";
var Procedure = $.import("/sap/tm/trp/service/xslib/procedures.xsjslib").Procedure;
var messages = $.import("/sap/tm/trp/service/xslib/messages.xsjslib");

function run(){
    var conn, result = {}, plans, output = [];
	
	conn = $.db.getConnection();
    
	try {
		var getPlanId = new Procedure(constants.SCHEMA_NAME,
				"sap.tm.trp.db.consistencycheck::p_scheduled_plan_job_activation", {
                    connection : conn
                });
		
		plans = getPlanId();
		if(plans.PLAN_OUTPUT.length !==0){
			plans.PLAN_OUTPUT.forEach(function(item){
			    var plan = {};
                
                var parametersUpdate = {
                xsJob : xsJob,
                scheduleType : SCHEDULE_TYPE,
                startTime : item.START_TIME,
                expiryTime : item.EXPIRY_TIME,
                recurrence : {
                    TYPE : item.RECURRENCE_TYPE,
                    INTERVAL : item.RECURRENCE_INTERVAL,
                    DAY : item.RECURRENCE_DAY
                },
                execWorkHour: item.EXECUTE_WORKING_HOUR,
                startWorkHour: item.START_WORKING_HOUR_TIME,
                endWorkHour: item.END_WORKING_HOUR_TIME,
                modelId : item.ID,
                connSqlcc : connSqlcc,
                jobSqlcc : jobSqlcc
                };
                
                var jobUpdate = new jobManager.Job(parametersUpdate);
                var scheduleUpdate = new jobUpdate.schedule();
                scheduleUpdate.update();

                
                plan.ID = item.ID;
                plan.NAME = item.NAME;
				output.push(plan);
			});

            result.NO_OF_PLANS = output.length;
            result.PLANS = output;
			
			conn.commit();
		}else{
            result = 'No inactive jobs found for scheduled plans ';
        }
    } catch (e) {
        if (e instanceof xslib.WebApplicationError) {
            throw e;
        }
        throw new xslib.InternalError(
                messages.MSG_ERROR_EXECUTE_PLAN_MODEL, e);
    }
}