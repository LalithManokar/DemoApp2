var model = $.import("/sap/tm/trp/service/model/planningcockpit.xsjslib");
var lib = $.import("/sap/tm/trp/service/xslib/railxs.xsjslib");
var constants = $.import("/sap/tm/trp/service/xslib/constants.xsjslib");
var proc = $.import("/sap/tm/trp/service/xslib/procedures.xsjslib");
var proc_excel = $.import("/sap/tm/trp/service/xslib/procedures_excel.xsjslib");
var messages = $.import("/sap/tm/trp/service/xslib/messages.xsjslib");
var reviseSDArraylib = $.import("/sap/tm/trp/service/xslib/reviseSDArray.xsjslib");
var facetFilterUtils = $.import("/sap/tm/trp/service/xslib/utils.xsjslib").facetFilterUtils;
var logger = new($.import("/sap/tm/trp/service/xslib/applog.xsjslib")).AppLog();
var geoCheck = $.import("/sap/tm/trp/service/xslib/geoCheck.xsjslib");
var calculation = $.import("/sap/tm/trp/service/costmodel/costCalculation.xsjslib");
var graphCalc = $.import("/sap/tm/trp/service/planningcockpit/transportNetwork.xsjslib");
var handleConcurrentLockException = ($.import("/sap/tm/trp/service/xslib/utils.xsjslib")).handleConcurrentLockException;
var Routing = $.import("sap.tm.trp.service.routing", "routing").Routing;
var zipper = new ($.import("/sap/tm/trp/service/xslib/zip.xsjslib").Zipper)();
var CSV = new ($.import("/sap/tm/trp/service/xslib/csv.xsjslib").CSV)();
var csvParser = new ($.import("/sap/tm/trp/service/xslib/csv.xsjslib").CSVParser)();

var trq = $.import("/sap/tm/trp/service/planningcockpit/TRQ.xsjslib");

var SCHEMA = constants.SCHEMA_NAME;
var PACKAGE = constants.SP_PKG_COCKPIT;
var MAP_LEVEL = constants.MAP_LEVEL;
var FIELD = constants.FIELD;

var simulationService = new lib.SimpleRest({
	name: "simulation",
	desc: "operations about simulation plan",
	model: new model.Simulations()
});

function prepareTUData(id) {
    var conn=$.hdb.getConnection();
	try {
		var procName = PACKAGE + "::p_ext_tudata_prepare";
		var tuDataPrepareProc = conn.loadProcedure(SCHEMA, procName);
		var result = tuDataPrepareProc(id);
        conn.commit();
		if (result.MESSAGE !== "MSG_SUCCESS_STATUS") {
			throw new lib.InternalError(result.MESSAGE);
		}

		return result.RESULT;
	} catch (e) {
		logger.error("FINALIZE_TRQ_PREPARE_FAILED", e);

		if (e instanceof lib.WebApplicationError) {
			throw e;
		}

		throw new lib.InternalError(messages.MSG_FINALIZE_FAILURE, e);
	}
	conn.close();
}

var groupBy = function(arrary, hash) {
	var _hash = hash ? hash : function(o) {
		return o;
	};
	var _map = {};

	Object.keys(arrary).map(function(obj) {
		if (!_map[_hash[obj]]) {
			_map[_hash[obj]] = {};
			_map[_hash[obj]].group = [];
			_map[_hash[obj]].key = arrary[obj];
		}
		_map[_hash[obj]].group.push(arrary[obj]);
	});

	return Object.keys(_map).map(function(key) {
		return {
			key: _map[key].key,
			group: _map[key].group
		};
	});
};

function finalize(scenarioId, trqs) {
    var conn=$.hdb.getConnection();
	try {
		var procName = PACKAGE + "::p_ext_finalize_action";
		var finalizeProc = conn.loadProcedure(SCHEMA, procName);
		var result = finalizeProc(scenarioId, trqs);
        conn.commit();
		if (result.MESSAGE !== "MSG_SUCCESS_STATUS") {
			logger.error("FINALIZE_TRP_UPDATE_FAILED", result.MESSAGE);

			throw new lib.InternalError(result.MESSAGE, {
				args: [result.MODIFIED_BY]
			});
		}
	} catch (e) {
		logger.error("FINALIZE_TRP_UPDATE_FAILED", e);

		if (e instanceof lib.WebApplicationError) {
			throw e;
		}

		throw new lib.InternalError(messages.MSG_FINALIZE_FAILURE, e);
	}
	conn.close();
}

/** *simulation plan****** */
simulationService.create = function(params) {
	var conn;
	try {
		conn = $.hdb.getConnection();
		conn.setAutoCommit(false);

		// since there's a subsequence call on table creation which will implicitly commit transaction
		// need firstly set the DDL autocommit to off manually
		conn.executeUpdate("SET TRANSACTION AUTOCOMMIT DDL OFF");

		var createPlanProc = conn.loadProcedure(SCHEMA, PACKAGE + "::p_ext_simulation_plan_create");
		params.obj.SIMULATION_PLAN_NAME=params.obj.SIMULATION_PLAN_NAME===undefined?null:params.obj.SIMULATION_PLAN_NAME;
		params.obj.SUPPLY_DEMAND_PLAN_ID=params.obj.SUPPLY_DEMAND_PLAN_ID===undefined?null:params.obj.SUPPLY_DEMAND_PLAN_ID;
		params.obj.NETWORK_SETTING_GROUP_ID=params.obj.NETWORK_SETTING_GROUP_ID===undefined?null:params.obj.NETWORK_SETTING_GROUP_ID;
		params.obj.SIMULATION_PLAN_DESC=params.obj.SIMULATION_PLAN_DESC===undefined?null:params.obj.SIMULATION_PLAN_DESC;
		params.obj.RESOURCE_CATEGORY=params.obj.RESOURCE_CATEGORY===undefined?null:params.obj.RESOURCE_CATEGORY;

		var result = createPlanProc(params.obj.SIMULATION_PLAN_NAME,
			params.obj.SUPPLY_DEMAND_PLAN_ID,
			params.obj.NETWORK_SETTING_GROUP_ID,
			params.obj.SIMULATION_PLAN_DESC,
			params.obj.RESOURCE_CATEGORY);

		if (result.MESSAGE !== "MSG_SUCCESS_STATUS") {
			throw new lib.InternalError(result.MESSAGE, {
				args: [result.REPEATED_NAME]
			});
		}

		logger.info("SIMULATION_PLAN_CREATE_SUCCESS", result.SIMULATION_ID);

		var routing = new Routing(conn);
		var routingResult = routing.buildNetworkModel(result.SIMULATION_ID);

		if (routingResult.RETURN_CODE !== 0) {
			throw new lib.InternalError(messages.MSG_SIMULATION_PLAN_BUILD_NETWORK_FAILED,
				routingResult);
		}

		logger.info("SIMULATION_PLAN_BUILD_NETWORK", result.SIMULATION_ID, routingResult.NETWORK_ID);

		// create default scenario
		var createScenarioProc = conn.loadProcedure(SCHEMA, PACKAGE + "::p_ext_scenario_create");
		
		var scenarioResult = createScenarioProc(params.obj.SIMULATION_PLAN_NAME, // the same as simulation plan
			"Default Scenario",
			result.SIMULATION_ID,
			0); // pass in flag = 0 means create default scenario

		logger.info("SIMULATION_PLAN_CREATE_DEFAULT_SCENARIO_SUCCESS", scenarioResult.SCENARIO_ID, routingResult.NETWORK_ID);

		routingResult = routing.buildDeltaNetworkModel(scenarioResult.SCENARIO_ID);

		if (routingResult.RETURN_CODE !== 0) {
			throw new lib.InternalError(messages.MSG_SIMULATION_PLAN_BUILD_DELTA_NETWORK_FAILED,
				routingResult);
		}

		logger.info("SIMULATION_PLAN_BUILD_DELTA_NETWORK", scenarioResult.SCENARIO_ID, routingResult.NETWORK_ID);

		conn.commit();

		return {
			ID: result.SIMULATION_ID,
			SCENARIO: scenarioResult.SCENARIO_ID
		};
	} catch (e) {
		conn.rollback();

		logger.error("SIMULATION_PLAN_CREATE_FAILED", e);

		if (e instanceof lib.WebApplicationError) {
			throw e; // no need to wrapper it again
		}

		throw new lib.InternalError(messages.MSG_ERROR_CREATE_SIMULATION_PLAN, e);
	} finally {
		if (conn) {
			conn.close();
		}
	}
};

simulationService.destroy = function(params) {
	var conn;
	try {
		conn = $.hdb.getConnection();
		conn.setAutoCommit(false);

		var routing = new Routing(conn);
		var result = routing.deleteScenarioNetwork4Plan(params.id);

		if (result.RETURN_CODE !== 0) {
			throw new lib.InternalError(messages.MSG_SIMULATION_PLAN_DELETE_NETWORK_FAILED, result);
		}

		var deletePlanProc = conn.loadProcedure(
			SCHEMA,
			PACKAGE + "::p_ext_simulation_plan_delete");

		result = deletePlanProc(params.id);

		if (result.MESSAGE !== "MSG_SUCCESS_STATUS") {
			throw new lib.InternalError(result.MESSAGE, {
				args: [result.MODIFIED_BY]
			});
		}

		conn.commit();

		logger.success("SIMULATION_PLAN_DELETE_SUCCESS", params.id);
	} catch (e) {
		conn.rollback();

		logger.error("SIMULATION_PLAN_DELETE_FAILED", params.id, e);

		if (e instanceof lib.WebApplicationError) {
			throw e;
		}

		throw new lib.InternalError(messages.MSG_ERROR_DELETE_SIMULATION_PLAN, handleConcurrentLockException(e));
	} finally {
		if (conn) {
			conn.close();
		}
	}

};

simulationService.updateExpiredStatus = function(params) {
    var conn=$.hdb.getConnection();
	try {
		var procName = PACKAGE + "::p_ext_activity_expire_check_update";
		var checkExpireProc = conn.loadProcedure(SCHEMA, procName);
		var result = checkExpireProc(params.id);
        conn.commit();
		logger.success("UPDATE_EXPIRED_STATUS_SUCCESS", params.id);

		return {
			MESSAGE: result.MESSAGE
		};
	} catch (e) {
		logger.error("UPDATE_EXPIRED_STATUS_FAILED", e);

		throw new lib.InternalError(
			messages.MSG_ERROR_CHECK_UPDATE_EXPIRED_STATUS, e);
	}
	conn.close();
};

simulationService.executionIdCheck = function(params) {
    var conn=$.hdb.getConnection();
	try {
		var getNetworkCode = conn.loadProcedure("SAP_TM_TRP",
			"sap.tm.trp.db.planningcockpit::p_get_networkcode_by_simulation_scenario_id");

		var networkCode = getNetworkCode(params.id, 0).NETWORK_CODE;
        conn.commit();
		var routing = new Routing(conn);
		routing.queryMissingCost(networkCode, []);

		var procName = PACKAGE + "::p_simulation_plan_execution_check";
		var checkExecutionIdProc = conn.loadProcedure(SCHEMA, procName);
		var result = checkExecutionIdProc(params.id);
        conn.commit();
		logger.success("CHECK_EXECUTION_ID_FOR_SIMULATION_SUCCESS", params.id);

		return {
			CODE: result.MESSAGE
		};
	} catch (e) {
		logger.error("CHECK_EXECUTION_ID_FOR_SIMULATION_FAILED", params.id, e);
		throw new lib.InternalError(
			messages.MSG_ERROR_CHECK_EXECUTION_ID_FOR_SIMULATION, e);
	}
	conn.close();
};

simulationService.executionIdChange = function(params) {
	var procName, changeExecutionIdProc, result;
	var conn=$.hdb.getConnection();
	try {
		procName = PACKAGE + "::p_ext_execution_id_change_for_simulation_plan";
		changeExecutionIdProc = conn.loadProcedure(SCHEMA, procName);
		result = changeExecutionIdProc(params.id);
        conn.commit();
		if (result.RETURN_CODE !== 0) {
			throw new lib.InternalError(
				messages.MSG_ERROR_ROUTE_CREATE_FOR_SIMULATION, result);
		}

		logger.success("CHANGE_EXECUTION_ID_FOR_SIMULATION_SUCCESS", logger.Parameter
			.Integer(0, params.id));
	} catch (e) {
		logger.error("CHANGE_EXECUTION_ID_FOR_SIMULATION_FAILED", params.id, e);
		if (e instanceof lib.WebApplicationError) {
			throw e;
		}
		throw new lib.InternalError(
			messages.MSG_ERROR_CHANGE_EXECUTION_ID_FOR_SIMULATION, e);
	}
	conn.close();
};

simulationService.finalize = function(params) {
	// prepare the TU data
	var trqsTRP = prepareTUData(params.obj.SCENARIO_ID);
	// Group by the keys of the Header
	var value = groupBy(trqsTRP, Object.keys(trqsTRP).map(function(o) {
		return JSON.stringify({
			TRQ_TYPE: trqsTRP[o].TRQ_TYPE,
			BASE_BTD_ID: trqsTRP[o].BASE_BTD_ID,
			MOT: trqsTRP[o].MOT,
			MOT_CAT: trqsTRP[o].MOT_CAT,
			SRC_LOC_ID: trqsTRP[o].SRC_LOC_ID,
			DES_LOC_ID: trqsTRP[o].DES_LOC_ID,
			REQ_DEP_DATE: trqsTRP[o].REQ_DEP_DATE,
			REQ_ARR_DATE: trqsTRP[o].REQ_ARR_DATE,
			SALES_ORG_ID: trqsTRP[o].SALES_ORG_ID,
			BUILD_TUS: trqsTRP[o].BUILD_TUS,
			TRAFFIC_DIRECTION: trqsTRP[o].TRAFFIC_DIRECTION,
			TRQ_CAT: trqsTRP[o].TRQ_CAT,
			MOVEMENT_TYPE: trqsTRP[o].MOVEMENT_TYPE
		});// The Header of input
	})).map(function(element) {
		var items = element.group.map(function(item) {
			return {
				BASE_BTDITEM_ID: item.BASE_BTDITEM_ID.toString(),
				ITEM_CAT: item.ITEM_CAT,
				ITEM_TYPE: item.ITEM_TYPE,
				TURES_CAT: item.TURES_CAT,
				TURES_TCO: item.TURES_TCO,
				QUA_PCS_VAL: item.QUA_PCS_VAL,
				QUA_PCS_UNI: item.QUA_PCS_UNI
			}; // The fields of one item
		});

		return {
			TRQ_TYPE: element.key.TRQ_TYPE,
			BASE_BTD_ID: element.key.BASE_BTD_ID,
			MOT: element.key.MOT,
			MOT_CAT: element.key.MOT_CAT,
			SRC_LOC_ID: element.key.SRC_LOC_ID,
			DES_LOC_ID: element.key.DES_LOC_ID,
			REQ_DEP_DATE: element.key.REQ_DEP_DATE,
			REQ_ARR_DATE: element.key.REQ_ARR_DATE,
			SALES_ORG_ID: element.key.SALES_ORG_ID,
			BUILD_TUS: element.key.BUILD_TUS,
			TRAFFIC_DIRECTION: element.key.TRAFFIC_DIRECTION,
			TRQ_CAT: element.key.TRQ_CAT,
			MOVEMENT_TYPE: element.key.MOVEMENT_TYPE,
			ITEMS: items
		};
	});
	logger.success("FINALIZE_TRQ_PREPARED", params.obj.SCENARIO_ID);

	// Call the TM service
	var results;
		try {
		results = trq.createTRQ({ TRQS: value }, params.obj.SCENARIO_ID);
	} catch (e) {
	    if (e instanceof lib.InternalError) {
	        results = e.cause.TU_RET;
	    }
	    throw e;
	} finally {
		if(results){
			// Actually do the finalization in TRP
			finalize(params.obj.SCENARIO_ID, results.map(function(item) {
				return {
					ACTIVITY_ID: item.BASE_BTDITEM_ID,
					TRQ_ID: item.TRQ_ID,
					STATUS: item.SEVERITY,
					TM_STATUS: item.TM_STATUS,
					MESSAGE: item.TEXT,
					TRQ_ITEM_ID: item.TRQ_ITEM_ID,
					SOURCE_LOCATION: item.SRC_LOC_GUID22,
					REQ_DEPARTURE_TIME: item.PIC_EAR_REQ,
					DESTINATION_LOCATION: item.DES_LOC_GUID22,
					REQ_ARRIVAL_TIME: item.DEL_LAT_REQ,
					RESOURCE_TYPE: item.TURES_TCO,
					QUANTITY: item.QUA_PCS_VAL,
					TU_GEN_FLAG: item.TU_BUILT,
					TU_ID: item.TU_ID,
					TU_ITEM_ID: item.TU_ITEM_ID
				};
			}));
		}
	}
};

simulationService.lock = function(params) {
    var conn=$.hdb.getConnection();
	try {
		var result;

		if (params.obj.ACQUIRE && $.session.hasAppPrivilege("sap.tm.trp.service::AcquireLock")) {
			var forceLock = conn.loadProcedure(
				"SAP_TM_TRP",
				"sap.tm.trp.db.planningcockpit::p_ext_lock_force_get");

			result = forceLock(params.id);
			conn.commit();
		} else {
			var lock = (function() { // curry function
				var lockPlan = conn.loadProcedure(
					"SAP_TM_TRP",
					"sap.tm.trp.db.planningcockpit::p_ext_lock_get_release");

				return function(flag) {
					return lockPlan(params.id, flag ? 1 : 2); // 1:lock, 2:release
				};
			}());

			result = lock(params.obj.LOCK_STATUS);
            conn.commit();
			// wrap the message if the user has the privilege to acquire lock by force
			if (result.MESSAGE === "MSG_ERROR_LOCKED" && $.session.hasAppPrivilege("sap.tm.trp.service::AcquireLock")) {
				result.MESSAGE = "MSG_ACQUIRE_LOCK_PRIVILIGE";
			}
		}

		if (result.MESSAGE !== "MSG_SUCCESS_STATUS") {
			throw new lib.InternalError(result.MESSAGE, {
				args: [result.MODIFIED_BY]
			});
		}

	} catch (e) {
		logger.error("LOCK_FAILED", logger.Parameter.Exception(0, e));

		if (e instanceof lib.WebApplicationError) {
			throw e;
		}

		throw new lib.InternalError(messages.MSG_ERROR_LOCKED, handleConcurrentLockException(e));
	}
	conn.close();
};

simulationService.resultsLocationToResource = function(params) {
    var conn=$.hdb.getConnection();
	try {
		// check whether the status is valid
		this.status(params);
		var result;
		if (params.obj.GEO_ID) {
			var getEquipmentSD = conn.loadProcedure("_SYS_BIC",
				"sap.tm.trp.db.planningcockpit/cv_get_execution_result_by_planid_location/proc");
			result = reviseSDArraylib.reviseArraySD(
				getEquipmentSD(params.obj.GEO_ID, params.obj.SCENARIO_ID||null,
					params.id).VAR_OUT, params.obj.GEO_ID);
		} else {
			var getLocationSD = conn.loadProcedure("_SYS_BIC",
				"sap.tm.trp.db.planningcockpit/cv_get_execution_result_by_planid/proc");
			result = reviseSDArraylib.reviseArraySD(getLocationSD(
					params.obj.SCENARIO_ID||null, params.id).VAR_OUT,
				params.obj.GEO_ID);
		}
        conn.commit();
		return result;
	} catch (e) {
		logger.error("GET_RESULT_FAILED", e);

		if (e instanceof lib.WebApplicationError) {
			throw e;
		}

		throw new lib.InternalError(
			messages.MSG_ERROR_GET_SIMULATION_PLAN_RESULTS, e);
	}
	conn.close();
};

simulationService.resultsResourceToLocation = function(params) {
    var conn=$.hdb.getConnection();
	try {
		this.status(params);
		var result;
		if (params.obj.RESOURCE_TYPE_CODE) {
			var getEquipmentSD = conn.loadProcedure("_SYS_BIC",
				"sap.tm.trp.db.planningcockpit/cv_get_execution_result_by_planid_location_view_by_resource/proc");
			result = reviseSDArraylib.reviseArraySD(
				getEquipmentSD(params.obj.RESOURCE_TYPE_CODE, params.obj.SCENARIO_ID||null,
					params.id).VAR_OUT, !params.obj.RESOURCE_TYPE_CODE);
		} else {
			var getLocationSD = conn.loadProcedure("_SYS_BIC",
				"sap.tm.trp.db.planningcockpit/cv_get_execution_result_by_planid_view_by_resource/proc");
			result = reviseSDArraylib.reviseArraySD(getLocationSD(
				params.obj.SCENARIO_ID||null, params.id).VAR_OUT, !params.obj.RESOURCE_TYPE_CODE);
		}
        conn.commit();
		return result;
	} catch (e) {
		logger.error("GET_RESULTS_RESOURCE_TO_LOCATION", params.id, params.obj.SCENARIO_ID, params.obj.RESOURCE_TYPE_CODE, e);

		if (e instanceof lib.WebApplicationError) {
			throw e;
		}

		throw new lib.InternalError(
			messages.MSG_ERROR_GET_SIMULATION_PLAN_RESULTS, e);
	}
	conn.close();
}

// alert service for map
simulationService.depotAlertOnMap = function(params) {
	var min = params.obj.min,
		max = params.obj.max;
	var xmin = Math.min(min[0], max[0]),
		xmax = Math.max(min[0], max[0]);
	var ymin = Math.min(min[1], max[1]),
		ymax = Math.max(min[1], max[1]);
	var conn=$.hdb.getConnection();
	try {
		/*
		 * if (!params.obj.executionId) { execution_id =
		 * getExecutionId(params.id, conn); } if (!params.obj.nodeId) { node_id =
		 * getNodeId(execution_id, conn); }
		 */
		var procName = "sap.tm.trp.db.planningcockpit::p_get_execution_alert_gis";
		var getDivision = conn.loadProcedure(SCHEMA, procName);
		// var results = getDivision(params.obj.polygon, params.id,
		// params.obj.scenarioId);
		var results = getDivision(xmin, xmax, ymin, ymax, params.id,
			params.obj.scenarioId);
		conn.commit();
		return {
			FIELD: FIELD.POINT,
			DIVISIONS: results.OUTPUT_ALERT_DATA || [],
			INVALID_LOCATIONS: results.OUT_LOCATIONS_XPOS_YPOS_INVALID
		};
	} catch (e) {
		logger.error("GENERATE_ALERT_ON_MAP_FAILED", logger.Parameter.Exception(0, e));
		throw new lib.InternalError(messages.MSG_ERROR_DISPLAY_ALERT_MAP, e);
	}
	conn.close();
};

simulationService.facetFilter = function(params) {
    var conn=$.hdb.getConnection();
	try {
		var filterProc = conn.loadProcedure(SCHEMA, [PACKAGE,
                "p_get_simulation_plan_facet_filter"].join("::"));
        params.obj.search=params.obj.search===undefined?null:params.obj.search;
		var result = filterProc(params.obj.search,
			params.obj.NETWORK_SETTING_GROUP_ID_LIST, params.obj.STATUS_ID_LIST, params.obj.RESOURCE_CATEGORY);
		conn.commit();
		return {
			NETWORK_SETTING_GROUP_ID: Object.keys(result.NETWORK_SETTING_GROUP_OUTPUT).map(function(i) {
				return {
					key: result.NETWORK_SETTING_GROUP_OUTPUT[i].ID,
					text: result.NETWORK_SETTING_GROUP_OUTPUT[i].DESC
				};
			}),
			STATUS_CODE: Object.keys(result.STATUS_OUTPUT).map(function(i) {
				return {
					key: result.STATUS_OUTPUT[i].ID,
					text: result.STATUS_OUTPUT[i].DESC
				};
			})
		};

	} catch (e) {
		logger.error("SIMULATION_FACET_FILTER_GET_FAILED",
			logger.Parameter.String(0, JSON.stringify(params)),
			logger.Parameter.Exception(1, e));
		throw e;
	}
	conn.close();
};

simulationService.status = function(params) {
    var conn=$.hdb.getConnection();
	try {
		var check = conn.loadProcedure(SCHEMA, PACKAGE + "::p_status_check_simulation_plan");
		var statusResult = check(params.id);

		if (["MSG_CALC_PLAN_NOT_VALID"].indexOf(statusResult.MESSAGE) !== -1) {
			throw new lib.InternalError(statusResult.MESSAGE);
		}

		return {
			status: statusResult.MESSAGE
		};
	} catch (e) {
		logger.error("STATUS_CHECK_FAILED", e);

		if (e instanceof lib.WebApplicationError) {
			throw new lib.InternalError(
				messages.MSG_ERROR_CHECK_UPDATE_EXPIRED_STATUS, e);
		}
	}
	conn.commit();
	conn.close();
};

simulationService.computeBalancingCost = function (params) {
	var conn;
	try {
		conn = $.hdb.getConnection();
		conn.setAutoCommit(false);

		var getAllScenarios = conn.loadProcedure(SCHEMA, "sap.tm.trp.db.planningcockpit::p_get_scenario_for_simulation_plan");

		var scenarios = getAllScenarios(params.id).SCENARIOS;
        conn.commit();
		var calculateCost = conn.loadProcedure(SCHEMA, PACKAGE + "::p_ext_balancing_cost");

		var results = [];

		Object.keys(scenarios).forEach(function(s) {
			var result = calculateCost(params.id, parseInt(scenarios[s].ID));

			results.push({
				SCENARIO_CODE: scenarios[s].CODE,
				SCENARIO_ID: scenarios[s].ID,
				STATUS: result.MESSAGE
			});
		});

		logger.success("COMPUTING_BALANCING_COST_ON_SM_PLAN_COMPLETE", params.id, results);

		conn.commit();

		return {
			RESULTS: results
		};
	} catch (e) {
		conn.rollback();
		logger.error("COMPUTING_BALANCING_COST_ON_SM_PLAN_FAILED", params.id, e);
		if (e.code === 304) {
		var sql1 ='SELECT T1.RESOURCE_CATEGORY FROM \"sap.tm.trp.db.planningcockpit::t_simulation_plan\" T1 WHERE T1.ID = \'' + params.id + '\'';
		var rs1 = conn.executeQuery(sql1);
		if (typeof rs1[0] !== 'undefined') {
			var getResourceType = conn.loadProcedure(constants.SCHEMA, "sap.tm.trp.db.costmodel.storagecost::p_get_resource_type_teu");
			var resourceTypeTEUCount = getResourceType(rs1[0].RESOURCE_CATEGORY);
			var resourceType = [];
			for (var i = 0; i < resourceTypeTEUCount.RESOURCE_TYPE_TEU.length; i++) {
				if (resourceTypeTEUCount.RESOURCE_TYPE_TEU[i].TEU < 1) {
					resourceType.push(resourceTypeTEUCount.RESOURCE_TYPE_TEU[i].RESOURCE_TYPE);
				}
			}
		}
			throw new lib.InternalError(messages.MSG_ERROR_BALANCE_COST_CALCULATE, {
				args: resourceType.join()
			});
		} else {
			throw new lib.InternalError(messages.MSG_ERROR_BALANCE_COST, e);
		}
	} finally {
		if (conn) {
			conn.close();
		}
	}
};


/**
 * download planned activities dataset as zip file
 */
simulationService.download = function(params) {
	var data, downloadCSVProc;
    var conn=$.hdb.getConnection();
    var name = $.request.parameters.get("TYPE");
    var type = $.request.parameters.get("TYPE");
	// get planned activity data
	try {
		downloadCSVProc = conn.loadProcedure("_SYS_BIC",
				"sap.tm.trp.db.planningcockpit/cv_get_planned_activity_detail_data/proc");
		data = downloadCSVProc(params.id).VAR_OUT;
		conn.commit();
	} catch (e) {
		logger.error("PLANNED_ACTIVITY_GET_DOWNLOAD_DATA_FAILED", e);
		throw new lib.InternalError(
				messages.MSG_ERROR_PLANNED_ACTVITIES_DATA_DOWNLOAD, e);
	}

	if (data === null) {
		logger.error("PLANNED_ACTIVITY_DOWNLOAD_NO_DATA");
		throw new lib.BadRequestError(
				"Could not retrieve planned activities data '" + params.id
						+ "' from database");
	}

	// Export as CSV
	try {
		var fileInfo = constants.PLANNED_ACTIVITIES_CSV_FILES[type];
		// zipper.addFile(fileInfo.FILENAME, CSV.createFromAssociativeObjects(
		// 		data, fileInfo.COLUMNS).toCSV(csvParser.LINE_SEPARATOR_UNIX,
		// 		","));
		var csvContent = CSV.createFromAssociativeObjects(
			data, fileInfo.COLUMNS).toCSV(csvParser.LINE_SEPARATOR_UNIX,
			",");
		// Here some manual override has to be done, not responding via RailXS
		$.response.status = $.net.http.OK;
		$.response.contentType = "Text/plain";
		$.response.headers.set("Content-Disposition",
				"attachment; filename = \"plannedactivity_" + name
						+ '_' + type + ".txt\"");
		$.response.setBody(csvContent);
	} catch (e) {
		logger.error("PLANNED_ACTVITIES_DOWNLOAD_FAILED", params.id, e);
		throw new lib.InternalError(
				messages.MSG_ERROR_PLANNED_ACTVITIES_DATA_DOWNLOAD, e);
	}
	conn.close();
};

simulationService.setFilters({
	filter: function(params) {
		// check the privilege to submit a scenario to TM
		var privilege = "sap.tm.trp.service::FinalizeTRQ";
		if (!$.session.hasAppPrivilege(privilege)) {
			logger.error("FINALIZE_AUTHORIZE_FAILED", privilege, params.obj.SCENARIO_ID);

			throw new lib.NotAuthorizedError(privilege);
		}
		return true;
	},
	only: ["finalize"]
}, {
	filter: function(params) {
		var privilege = "sap.tm.trp.service::CreateSimulationPlan";
		if (!$.session.hasAppPrivilege(privilege)) {
			logger.error("SIMULATION_PLAN_CREATE_AUTHORIZE_FAILED",
				logger.Parameter.String(0, privilege),
				logger.Parameter.String(1, params.obj.SIMULATION_PLAN_NAME));
			throw new lib.NotAuthorizedError(privilege);
		}

		return true;
	},
	only: ["create"]
}, {
	filter: function(params) {
		var privilege = "sap.tm.trp.service::DeleteSimulationPlan";
		if (!$.session.hasAppPrivilege(privilege)) {
			logger.error("SIMULATION_PLAN_DELETE_AUTHORIZE_FAILED",
				logger.Parameter.String(0, privilege),
				logger.Parameter.Integer(1, params.id));
			throw new lib.NotAuthorizedError(privilege);
		}

		return true;
	},
	only: ["destroy"]
}, {
	filter: function(params) {
		var privilege = "sap.tm.trp.service::LockSimulationPlan";
		if (!$.session.hasAppPrivilege(privilege)) {
			logger.error("SIMULATION_PLAN_LOCK_AUTHORIZE_FAILED",
				logger.Parameter.String(0, privilege),
				logger.Parameter.Integer(1, params.id));
			throw new lib.NotAuthorizedError(privilege);
		}

		return true;
	},
	only: ["lock"]
}, {
	filter: function(params) {
		var privilege = "sap.tm.trp.service::CalculateSimulationPlanAllCosts";
		if (!$.session.hasAppPrivilege(privilege)) {
			logger.error("SIMULATION_PLAN_CALCULATE_COSTS_AUTHORIZE_FAILED", privilege, params.id);

			throw new lib.NotAuthorizedError(privilege);
		}

		return true;
	},
	only: ["computeBalancingCost"]
});

simulationService.setRoutes([{
		method: $.net.http.GET,
		scope: "member",
		action: "getAlerts"
}, {
		method: $.net.http.GET,
		scope: "member",
		action: "alertsNumber"
}, {
		method: $.net.http.GET,
		scope: "member",
		action: "detailListByTime"
}, {
		method: $.net.http.GET,
		scope: "member",
		action: "detailListByTimeAmount"
}, {
		method: $.net.http.DEL,
		scope: "member",
		action: "destroy"
}, {
		method: $.net.http.PUT,
		scope: "member",
		action: "updateExpiredStatus"
}, {
		method: $.net.http.PUT,
		scope: "member",
		action: "setValid",
		response: $.net.http.NO_CONTENT
}, {
		method: $.net.http.PUT,
		scope: "member",
		action: "finalize",
		response: $.net.http.NO_CONTENT
}, {
		method: $.net.http.PUT,
		scope: "member",
		action: "lock",
		response: $.net.http.NO_CONTENT
}, {
		method: $.net.http.GET,
		scope: "collection",
		action: "lastUsed",
}, {
		method: $.net.http.GET,
		scope: "member",
		action: "resultsLocationToResource"
}, {
		method: $.net.http.GET,
		scope: "member",
		action: "resultsResourceToLocation"
}, {
		method: $.net.http.GET,
		scope: "member",
		action: "depotAlertOnMap"
},
	{
		method: $.net.http.PUT,
		scope: "member",
		action: "executionIdChange",
		response: $.net.http.NO_CONTENT
},
	{
		method: $.net.http.GET,
		scope: "member",
		action: "executionIdCheck"
},
	{
		method: $.net.http.POST,
		scope: "collection",
		action: "facetFilter"
},
	{
		method: $.net.http.GET, 
		scope: "member",
		action: "status"
},
	{
		method: $.net.http.POST,  
		scope: "member",
		action: "computeBalancingCost"
},
	{
	    method : $.net.http.GET,
	    scope : "member",
	    action : "download"
	}
]);

try {
	simulationService.handle();
} finally {
	logger.close();
}
