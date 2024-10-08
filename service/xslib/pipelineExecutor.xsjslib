var proc = $.import("/sap/tm/trp/service/xslib/procedures.xsjslib");
var InternalError = ($.import("/sap/tm/trp/service/xslib/railxs.xsjslib")).InternalError;
var logger = new ($.import("/sap/tm/trp/service/xslib/applog.xsjslib")).AppLog("xslib/pipelineExecutor");

var Pipeline = function() {
    this.connection = $.hdb.getConnection();
    this.connection.setAutoCommit(false);
};

Pipeline.prototype.execute = function(planId, equipmentFilterId, timeFiterId, locationFilterId, calculationModelId, alertRuleGroupId, attributeGroupId, usage) {
    var connection = this.connection;

    function addLog(success, execId, planId, timestamp) {
        var result = connection.loadProcedure("SAP_TM_TRP", "sap.tm.trp.db.pipeline::p_add_execution_log")(planId, success? "SUCCESS" : "ERROR", timestamp, execId);
    }

    var metadata = {
    		planId:planId,
    		equipmentFilterId:equipmentFilterId,
    		timeFiterId:timeFiterId,
    		locationFilterId:locationFilterId,
    		calculationModelId:calculationModelId,
    		alertRuleGroupId:alertRuleGroupId,
    		attributeGroupId:attributeGroupId,
    		usage:usage,
    };
    this.executionId = null;
    this.executionTime = null;
    try {
    	var result = connection.loadProcedure("SAP_TM_TRP", "sap.tm.trp.db.supplydemand::p_supply_demand_result_executor")(planId, locationFilterId, equipmentFilterId, timeFiterId, calculationModelId, attributeGroupId, alertRuleGroupId, usage);
    	this.executionId = Number(ctypes.Int64(result.EXEC_ID));
        this.executionTime = result.EXEC_TIMESTAMP;
        logger.success("MSG_PIPELINE_PREPARE_FOR_SCHEDULE_PLAN", metadata, planId);
        logger.success("MSG_PIPELINE_EXECUTE_SUCESS", this.executionId, this.executionTime);
    	addLog(true, this.executionId, planId, this.executionTime);
    	return {
        	EXEC_ID: this.executionId,
        	EXEC_TIMESTAMP: this.executionTime,
        };
    } catch (e) {
        connection.rollback();
        logger.error("MSG_PIPELINE_EXECUTE_FAILED", metadata, e);

        addLog(false, this.executionId, planId, this.executionTime);

        if ($.hasOwnProperty("request")) { // not invoked by background job
            throw new InternalError("MSG_ERROR_EXECUTE_PLAN_MODEL", e); // need to notify the invoker
        }
    } finally {
        if (connection) {
            connection.commit();
            connection.setAutoCommit(true);
            connection.close();
        }
    }
};


function execute(planId, equipmentFilterId, timeFiterId, locationFilterId, calculationModelId, alertRuleGroupId, attributeGroupId, usage) {
    try {
        var pipeline = new Pipeline();
        return pipeline.execute(planId, equipmentFilterId, timeFiterId, locationFilterId, calculationModelId, alertRuleGroupId, attributeGroupId, usage);
    } finally {
        logger.close();
    }
}
