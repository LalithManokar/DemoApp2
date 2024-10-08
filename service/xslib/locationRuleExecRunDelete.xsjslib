var constants = $.import('/sap/tm/trp/service/xslib/constants.xsjslib');
var procLib = $.import('/sap/tm/trp/service/xslib/procedures.xsjslib');

function execute(ruleId, conn, logger) {

	if (!logger) {
		logger = new($.import("/sap/tm/trp/service/xslib/applog.xsjslib")).AppLog();
		logger.internal = true;
	}

	try {

		try {
			var deleteExecRunProc = new procLib.procedure(
				constants.SCHEMA_NAME, [constants.SP_PKG_PICKUP_RETURN,
                                   'p_location_rule_execution_run_delete'].join('::'), {
					connection: conn
				});

			deleteExecRunProc(ruleId);
		} catch (e) {
			logger.error("PR_DELETE_LOCATION_RULE_EXEC_RUNS_FAILED", ruleId, e);
		}
	} finally {
		if (logger.internal) {
			logger.close();
		}
	}
}
