var constants = $.import('/sap/tm/trp/service/xslib/constants.xsjslib');
var procLib = $.import('/sap/tm/trp/service/xslib/procedures.xsjslib');
var getTUCost = $.import("/sap/tm/trp/service/xslib/getTUCost.xsjslib");

function execute(ruleId, logger, conn) {
	var lane = [];

	if (!logger) {
		logger = new($.import("/sap/tm/trp/service/xslib/applog.xsjslib")).AppLog();
		logger.internal = true;
	}

    var sql = "SELECT COUNT(NAME) as count FROM \"sap.tm.trp.db.systemmanagement.customization::t_general_parameters\" where NAME = 'LANE_TRP' AND VALUE = 'X'";
        var connection1 = $.hdb.getConnection();
        var rs = connection1.executeQuery(sql);
        connection1.close();
        var count = parseInt(rs[0].COUNT);	
	
	try {
		if(count==0){
			var tu_ids = [];
			try {
				lane = getTUCost.execute(ruleId, [], conn);  
			} catch (e) {
				logger.error("PR_EXECUTE_DETERMINATION_FAILED", ruleId, e);
			}

			try {
				var execDeterminationProc = new procLib.procedure(
					constants.SCHEMA_NAME, [constants.SP_PKG_PICKUP_RETURN,
	                                   'p_ext_determination_for_facet_filter'].join('::'), {
						connection: conn
					});

				execDeterminationProc(ruleId, tu_ids, lane);
			} catch (e) {
				logger.error("PR_EXECUTE_DETERMINATION_FAILED", ruleId, e);
			}	
		}
		else{
			var tu_ids = "";
		try {
			var execDeterminationProc = new procLib.procedure(
				constants.SCHEMA_NAME, [constants.SP_PKG_PICKUP_RETURN+'.harmonization.ruleset',
                                   'p_ext_determination_for_facet_filter_harmonized'].join('::'), {
					connection: conn
				});

			execDeterminationProc(ruleId, tu_ids);
		} catch (e) {
			logger.error("PR_EXECUTE_DETERMINATION_FAILED", ruleId, e);
		}}
	} finally {
		if (logger.internal) {
			logger.close();
		}
	}
}
