var executor = $.import("/sap/tm/trp/service/xslib/pipelineExecutor.xsjslib");
var proc = $.import("/sap/tm/trp/service/xslib/procedures.xsjslib");
var constants = $.import("/sap/tm/trp/service/xslib/constants.xsjslib");
var logger = new ($.import("/sap/tm/trp/service/xslib/applog.xsjslib")).AppLog();

function execute(params) {
    var executeId;
    try {
        executeId = executor.execute(params.schedulePlanId, null, null, null,
                null, null, null, null).EXEC_ID;
    } catch (e) {
        logger.error("VIRTUAL_PLAN_INCLUDE_SCHEDULE_PLAN_FAILED",
                params.virtualPlanId, params.schedulePlanId, e);
    } finally {
        var conn = $.db.getConnection();
        try {
            var addVirtualPlanResultProc = new proc.procedure(
                    constants.SCHEMA_NAME,
                    'sap.tm.trp.db.pipeline::p_ext_add_virtual_plan_result', {
                        connection : conn
                    });
            addVirtualPlanResultProc(params.virtualPlanId,
                    params.schedulePlanId, executeId || -1, params.executeTime,
                    params.executeDate);
            conn.commit();
        } catch (e) {
            conn.rollback();
            logger.error("LOG_VIRTUAL_PLAN_EXECUTE_FAILED",
                    params.virtualPlanId, params.schedulePlanId, e);
        } finally {
            if (conn) {
                conn.close();
            }
        }
    }
}