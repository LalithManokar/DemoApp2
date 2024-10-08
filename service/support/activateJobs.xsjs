var lib = $.import("/sap/tm/trp/service/plan/plan.xsjslib");
var libRequest = $.import("/sap/tm/trp/service/xslib/railxs.xsjslib");
var xslib = lib.xslib;
var constants = lib.constants;
var jobManager = lib.jobManager;


var activateJob = new libRequest.SimpleRest({
    name: "ActivateJob",
    desc: "Job activation service"
});

activateJob.getInactivePlans = function(){
    var conn, plans, result = {};
	
	conn = $.db.getConnection();
    //conn.setAutoCommit(true);
    
	try {
		var getPlanId = new lib.Procedure(constants.SCHEMA_NAME,
				"sap.tm.trp.db.consistencycheck::p_scheduled_plan_job_activation", {
                    connection : conn
                });
		
		plans = getPlanId();
		
		if(plans.PLAN_OUTPUT.length !== 0){
		    result.NO_OF_PLANS = plans.PLAN_OUTPUT.length;
		    result.PLANS =  plans.PLAN_OUTPUT;
			return result;
		}else{
			return "All the jobs for scheduled plans are active";
		}
	}catch(e){
		if (e instanceof xslib.WebApplicationError) {
            throw e;
        }
        throw new xslib.InternalError(
                lib.messages.MSG_ERROR_EXECUTE_PLAN_MODEL, e);
	}
};

activateJob.activatePlans = function(){
    var conn, result = {}, plans, output = [];
	
	conn = $.db.getConnection();
    
	try {
		var getPlanId = new lib.Procedure(constants.SCHEMA_NAME,
				"sap.tm.trp.db.consistencycheck::p_scheduled_plan_job_activation", {
                    connection : conn
                });
		
		plans = getPlanId();
		if(plans.PLAN_OUTPUT.length !==0){
			plans.PLAN_OUTPUT.forEach(function(item){
			    var plan = {};
                
                var parametersUpdate = {
                xsJob : lib.xsJob,
                scheduleType : lib.SCHEDULE_TYPE,
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
                connSqlcc : lib.connSqlcc,
                jobSqlcc : lib.jobSqlcc
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
        return result;
    } catch (e) {
        if (e instanceof xslib.WebApplicationError) {
            throw e;
        }
        throw new xslib.InternalError(
                lib.messages.MSG_ERROR_EXECUTE_PLAN_MODEL, e);
    }
};

activateJob.getInactiveRuleSets = function(){
    return 'success getInactiveRuleSets';
};

activateJob.activateRuleSets = function(){
    return 'success activateRuleSets';
};

activateJob.setRoutes([{
    method: $.net.http.GET,
    scope: "collection",
    action: "getInactivePlans"
},{
    method: $.net.http.GET,
    scope: "collection",
    action: "activatePlans"
},{
    method: $.net.http.GET,
    scope: "collection",
    action: "getInactiveRuleSets"
},{
    method: $.net.http.GET,
    scope: "collection",
    action: "activateRuleSets"
}]);

try {
    activateJob.handle();
} catch(e){
    $.response.setBody("Failed to execute action: " + e.toString());
}