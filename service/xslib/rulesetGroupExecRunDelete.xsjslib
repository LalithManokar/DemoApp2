var constants = $.import('/sap/tm/trp/service/xslib/constants.xsjslib');

function execute(ruleId, conn, logger) {

	if (!logger) {
		logger = new($.import("/sap/tm/trp/service/xslib/applog.xsjslib")).AppLog();
		logger.internal = true;
	}

	try {

		try {
			var deleteExecRunProc = conn.loadProcedure(
				constants.SCHEMA_NAME, [constants.SP_PKG_PICKUP_RETURN+ '.rulesetgroup',
                                   'p_ruleset_group_execution_run_delete'].join('::'))
				;
				
			deleteExecRunProc(ruleId);
			
		} catch (e) {
			logger.error("PR_DELETE_RULESET_GROUP_EXEC_RUNS_FAILED", ruleId, e);
		}
	} finally {
		if (logger.internal) {
			logger.close();
		}
	}
}
