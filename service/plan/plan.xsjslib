var xslib = $.import("/sap/tm/trp/service/xslib/railxs.xsjslib");
var messages = $.import("/sap/tm/trp/service/xslib/messages.xsjslib");
var Procedure = $.import("/sap/tm/trp/service/xslib/procedures.xsjslib").Procedure;
var reviseSDArraylib = $
        .import("/sap/tm/trp/service/xslib/reviseSDArray.xsjslib");
var constants = $.import("/sap/tm/trp/service/xslib/constants.xsjslib");
var logger = new ($.import("/sap/tm/trp/service/xslib/applog.xsjslib")).AppLog();
var geoCheck = $.import("/sap/tm/trp/service/xslib/geoCheck.xsjslib");
var constants = $.import("/sap/tm/trp/service/xslib/constants.xsjslib");
var executor = $.import("/sap/tm/trp/service/xslib/pipelineExecutor.xsjslib");
var xsJob = "/sap/tm/trp/service/supplydemand/executor.xsjob";
var connSqlcc = "sap.tm.trp.service.xslib::JobUser";
var jobSqlcc = "/sap/tm/trp/service/xslib/JobUser.xssqlcc";
var jobManager = $.import("/sap/tm/trp/service/xslib/jobManagement.xsjslib");
var utils = $.import("sap.tm.trp.service.xslib", "utils");
var uri = "sap.tm.trp.service.xslib:deleteSchedules.xsjs";
var functionName = "deleteSchedule";
var zipper = new ($.import("/sap/tm/trp/service/xslib/zip.xsjslib").Zipper)();
var CSV = new ($.import("/sap/tm/trp/service/xslib/csv.xsjslib").CSV)();
var csvParser = new ($.import("/sap/tm/trp/service/xslib/csv.xsjslib").CSVParser)();

var SCHEDULE_TYPE = "PLAN";
var InternalError = xslib.InternalError;
var NotAuthorizedError = xslib.NotAuthorizedError;

var plan = new xslib.SimpleRest({
    name : "Plan Service",
    desc : "a virtual class of all plan services"
});

function getSupplyDemandExecutionResultByLocation(planId, timezone, execId, nodeId, geoId) {
	var geoId_str = '';
    geoId.forEach((element,index) => { 
        if( index === 0 ){ 
            geoId_str = geoId_str + element.ID; }
        else{
            geoId_str = geoId_str + ',' + element.ID;
        }}
        );
    //geoId_str.trimEnd(',');
//    var connection = $.hdb.getConnection();
//    var result = connection.loadProcedure(constants.SCHEMA_NAME, "sap.tm.trp.db.supplydemand::p_get_execution_result_by_executionid")
//    	(utils.checkNull(planId), utils.checkNull(execId), utils.checkNull(timezone), utils.checkNull(nodeId), utils.checkNull(geoId_str));
//    connection.commit();
//    connection.close();
//    return result.OUT_PUT;  
    
    //still use new Procedure to call procedure as $.hdb.getConnection() is causing start_time is wrong issue(internalTicket 2170034422)
    var getGeoSD, result;
    getGeoSD = new Procedure(constants.SCHEMA_NAME,
           "sap.tm.trp.db.supplydemand::p_get_execution_result_by_executionid");
   result = getGeoSD(utils.checkNull(planId), utils.checkNull(execId), 
		             utils.checkNull(timezone), utils.checkNull(nodeId), utils.checkNull(geoId_str));
   return result.OUT_PUT;
}

function getSupplyDemandExecutionResultByLocationOfResource(execId, nodeId, geoId, resourceType) {
	//var getGeoSD, result;
    //getGeoSD = new Procedure(constants.SCHEMA_NAME,
    //        "sap.tm.trp.db.supplydemand::p_get_execution_result_by_executionid_location_of_resource");
    //result = getGeoSD(execId, nodeId, geoId, resourceType);
    //return result.OUT_PUT;
    
    var connection = $.hdb.getConnection();
    var result = connection.loadProcedure(constants.SCHEMA_NAME, "sap.tm.trp.db.supplydemand::p_get_execution_result_by_executionid_location_of_resource")
    	(utils.checkNull(execId), utils.checkNull(nodeId), utils.checkNull(geoId), utils.checkNull(resourceType));
    connection.commit();
    connection.close();
    return result.OUT_PUT;
}

function getSupplyDemandExecutionResultByResource(planId, timezone, execId, nodeId, geoId) {
	//var connection = $.hdb.getConnection();
    //var result = connection.loadProcedure(constants.SCHEMA_NAME, "sap.tm.trp.db.supplydemand::p_get_exec_result_res_by_execid_alert")
    //(utils.checkNull(planId), utils.checkNull(execId), utils.checkNull(timezone), utils.checkNull(nodeId), utils.checkNull(geoId));
    //connection.commit();
    //connection.close();
    //return result.OUT_PUT;
 
    //still use new Procedure to call produce as $.hdb.getConnection() is causing start_time is wrong issue(internalTicket 2170034422)
    var getSD, result;
    getSD = new Procedure(constants.SCHEMA_NAME,
           "sap.tm.trp.db.supplydemand::p_get_execution_result_resource_by_executionid");
    result = getSD(planId, execId, timezone, nodeId, geoId);
    return result.OUT_PUT;
}

function getLocationSupplyDemandExecutionResult(planId, timezone, execId, nodeId, geoId) {
	var connection = $.hdb.getConnection();
    var result = connection.loadProcedure(constants.SCHEMA_NAME, "sap.tm.trp.db.supplydemand::p_get_execution_result_by_executionid_location")
    (utils.checkNull(planId), utils.checkNull(timezone), utils.checkNull(execId), utils.checkNull(nodeId), utils.checkNull(geoId));
    connection.commit();
    connection.close();
    return result.OUT_PUT;
    
    //var getSD, result;
    //getSD = new Procedure(constants.SCHEMA_NAME,
    //        "sap.tm.trp.db.supplydemand::p_get_execution_result_by_executionid_location");
    //result = getSD(planId, timezone, execId, nodeId, geoId);
    //return result.OUT_PUT;
}

function getLocationSupplyDemandResultByPlanId(planId, resourceTypeCode, geoId,
        nodeId) {
    var getGeoSD, getNodeSD, result;
    resourceTypeCode = resourceTypeCode || "ALL";

    getNodeSD = new Procedure("_SYS_BIC",
            "sap.tm.trp.db.supplydemand/cv_get_home_dashboard_supply_and_demand/proc");
    result = getNodeSD(planId, resourceTypeCode, geoId);

    return result.VAR_OUT;
}

function getResourceSupplyDemandExecutionResult(planId, timezone, execId, nodeId, resourceTypeCode, geoId) {
	var connection = $.hdb.getConnection();
    var result = connection.loadProcedure(constants.SCHEMA_NAME, "sap.tm.trp.db.supplydemand::p_get_exec_result_res_by_execid_res_alert")
    (utils.checkNull(planId), utils.checkNull(execId), utils.checkNull(timezone), utils.checkNull(nodeId), utils.checkNull(resourceTypeCode), utils.checkNull(geoId));
    connection.commit();
    connection.close();
    return result.OUT_PUT;

    //var proc, result;
    //proc = new Procedure(constants.SCHEMA_NAME, "sap.tm.trp.db.supplydemand::p_get_execution_result_resource_by_executionid_resource");
    //result = proc(planId, execId, timezone, nodeId, resourceTypeCode, geoId);
    //return result.OUT_PUT;
}

function getExecutionSupplyDemandDetailsByLocation(planId, timezone, execId, nodeId, type, geoId,
resourceTypeCode, sequence, outputKeys) {
	
var connection = $.hdb.getConnection();
var result = connection.loadProcedure(constants.SCHEMA_NAME, "sap.tm.trp.db.supplydemand::p_get_drilldown_by_executionid_location_equipment_date")
(utils.checkNull(planId), utils.checkNull(execId), utils.checkNull(timezone), utils.checkNull(nodeId), utils.checkNull(type), 
		utils.checkNull(geoId), utils.checkNull(resourceTypeCode), utils.checkNull(sequence));

var tmpArray = reviseSDArraylib.reviseArrayDetail(result.OUTPUT, outputKeys);
return tmpArray;
}

function getExecutionSupplyDemandDetailsByResource(planId, timezone, execId, nodeId, type,
        resourceTypeCode, geoId, sequence, outputKeys) {
    var getDrillDownDetail, tmpArray = [], detail;
    getDrillDownDetail = new Procedure(
            constants.SCHEMA_NAME,
            "sap.tm.trp.db.supplydemand::p_get_drilldown_resource_by_executionid_location_equipment_date");
    detail = getDrillDownDetail(planId, execId, timezone, nodeId, resourceTypeCode, sequence,
            geoId, outputKeys).OUTPUT;
    tmpArray = reviseSDArraylib.reviseArrayDetail(detail, outputKeys);
    return tmpArray;
}

function getAllExecutionSupplyDemandDetailsByLocation(planId, timezone, execId, nodeId, geoId) {
    var getAllDetails, detail;
    getAllDetails = new Procedure(constants.SCHEMA_NAME,
            "sap.tm.trp.db.supplydemand::p_get_details_by_executionid_location");
    detail = getAllDetails(planId, execId, timezone, nodeId, geoId).OUT_PUT;
    return detail;
}

function getAllExecutionSupplyDemandDetailsByResource(planId, timezone, execId, nodeId, geoId) {
    var getAllDetails, detail;
    getAllDetails = new Procedure(constants.SCHEMA_NAME,
            "sap.tm.trp.db.supplydemand::p_get_details_by_executionid_resource");
    detail = getAllDetails(planId, execId, timezone, nodeId, geoId).OUT_PUT;
    return detail;
}

function getAllExecutionSupplyDemandDetailsExpandByLocation(planId, execId, timezone, nodeId,
        geoId) {
    var getAllDetails, detail;
    getAllDetails = new Procedure(constants.SCHEMA_NAME,
            "sap.tm.trp.db.supplydemand::p_get_details_expand_by_executionid_location");
    detail = getAllDetails(planId, execId, timezone, nodeId, geoId).OUT_PUT;
    return detail;
}

function getAllExecutionSupplyDemandDetailsExpandByResource(planId, execId, timezone, nodeId,
        resourceTypeCode, geoId) {
    var getAllDetails, detail;
    getAllDetails = new Procedure(constants.SCHEMA_NAME,
            "sap.tm.trp.db.supplydemand::p_get_details_expand_by_executionid_resource");
    detail = getAllDetails(planId, execId, timezone, nodeId, resourceTypeCode, geoId).OUT_PUT;
    return detail;
}

function getUserInfoAuthCheck(planId) {
    var checkUserTypeProc = "sap.tm.trp.db.pipeline::p_get_user_info_for_auth_check_plan_model";
    var getUserType = new Procedure(constants.SCHEMA_NAME, checkUserTypeProc);
    var userType = getUserType(planId);
    if (userType.USER_TYPE !== 99) {
        if (userType.CREATOR !== $.session.getUsername()) {
            throw new xslib.InternalError(messages.MSG_ERROR_AUTH_CHECK);
        }
    }
    return true;
}

function checkPipelineByAttrGroup(attrGroupId, pipelineId) {
    var checkPipelineByAttrGroupProc = new Procedure(constants.SCHEMA_NAME, [
            constants.SP_PKG_PIPELINE, "p_check_pipeline_by_attr_group" ]
            .join("::"));
    var checkResult = checkPipelineByAttrGroupProc(attrGroupId, pipelineId);
    if (checkResult.MISSING_COUNT > 0) {
        logger.error("PIPELINE_INVALID_ATTR_GROUP", logger.Parameter.Integer(0,
                attrGroupId), logger.Parameter.Integer(1, pipelineId),
                logger.Parameter.String(2, checkResult.MISSING_ATTRIBUTES.map(
                        function(row) {
                            return row.CODE;
                        }).join(", ")));
        throw new xslib.ValidationError(
                messages.MSG_ERROR_INVALID_ATTR_GROUP_TO_PIPELINE, {
                    ATTR_GROUP_ID : attrGroupId,
                    PIPELINE_ID : pipelineId,
                    MISSING_ATTRIBUTES : checkResult.MISSING_ATTRIBUTES
                            .map(function(row) {
                                return row.CODE;
                            })
                });
    }
    return true;
}

function queryFacetFilters(search, planTypeId, resourceFilterId,
        locationFilterId, timeFilterId, visibility, locationFilterType,
        planStatus, resourceCategory) {
    var data, formatOutput, procName;
    try {
        procName = "sap.tm.trp.db.pipeline::p_get_plan_facet_filter";
        var facetFilter = new Procedure(constants.SCHEMA_NAME, procName);
        data = facetFilter(search, planTypeId, visibility, timeFilterId,
                resourceFilterId, locationFilterId, locationFilterType,
                planStatus, resourceCategory);
        var planTypeIds = data.PLAN_MODEL_TYPE_ID_LIST_OUTPUT
                .map(function(item) {
                    return {
                        key : item.ID,
                        text : item.DESC
                    };
                });
        var resourceFilterIds = data.RESOURCE_FILTER_ID_LIST_OUTPUT
                .map(function(item) {
                    return {
                        key : item.ID,
                        text : item.DESC
                    };
                });
        var locationFilterIds = data.LOCATION_FILTER_ID_LIST_OUTPUT
                .map(function(item) {
                    return {
                        key : item.ID,
                        text : item.DESC
                    };
                });
        var timeFilterIds = data.TIME_FILTER_ID_LIST_OUTPUT.map(function(item) {
            return {
                key : item.ID,
                text : item.DESC
            };
        });
        var visibilities = data.VISIBILITY_LIST_OUTPUT.map(function(item) {
            return {
                key : item.CODE,
                text : item.DESC
            };
        });
        var planStatuses = data.PLAN_STATUS_LIST_OUTPUT.map(function(item) {
            return {
                key : item.ID,
                text : item.DESC
            };
        });
        formatOutput = {
            PLAN_TYPE_ID : planTypeIds,
            RESOURCE_FILTER_ID : resourceFilterIds,
            LOCATION_FILTER_ID : locationFilterIds,
            TIME_FILTER_ID : timeFilterIds,
            VISIBILITY : visibilities,
            PLAN_STATUS : planStatuses
        };
        return formatOutput;
    } catch (e) {
        throw new xslib.InternalError(messages.MSG_ERROR_GET_FACET_FILTER, e);
    }
}

function getFilters(planId, timezone, execId, nodeId) {
    var procName, locationsOnMapProc, locationsResults, output;
    procName = constants.SP_PKG_SUPPLYDEMAND
            + "::p_get_supply_demand_filters";
    locationsOnMapProc = new Procedure(constants.SCHEMA_NAME, procName);
    locationsResults = locationsOnMapProc(planId, timezone, execId, nodeId);
    output = {
        LOCATIONS : locationsResults.GEOS,
        TIME_INTERVALS : locationsResults.TIME_INTERVALS,
        RESOURCES : locationsResults.EQUIPS
    };
    return output;
}

function getAlertOnMapByExecId(execId, nodeId, startTime, polygon) {
    var procName, alertsOnMapProc, alertsResults, output;
    procName = constants.SP_PKG_PIPELINE
            + "::p_get_alert_on_map_for_template_plan";
    alertsOnMapProc = new Procedure(constants.SCHEMA_NAME, procName);
    alertsResults = alertsOnMapProc(execId, nodeId, startTime, polygon);
    if (alertsResults.TOO_MUCH_LOCATION_FLAG === 1) {
        output = {
            TOO_MUCH_LOCATION_FLAG : 1
        };
    } else {
        output = {
            ALERTS : alertsResults.OUT_ALERT_ON_MAP,
            FIELD : alertsResults.GIS_TYPE,
            STATUS : alertsResults.OUT_PLAN_STATUS,
            INVALID_LOCATIONS : alertsResults.OUT_LOCATIONS_XPOS_YPOS_INVALID
        };
    }
    return output;
}

function getAlertOnMapByResourceType(execId, nodeId, startTime, polygon, resourceType) {
    var procName, alertsOnMapProc, alertsResults, output;
    procName = constants.SP_PKG_PIPELINE
            + "::p_get_alert_on_map_for_template_plan_of_the_resource";
    alertsOnMapProc = new Procedure(constants.SCHEMA_NAME, procName);
    alertsResults = alertsOnMapProc(execId, nodeId, startTime, polygon, resourceType);
    if (alertsResults.TOO_MUCH_LOCATION_FLAG === 1) {
        output = {
            TOO_MUCH_LOCATION_FLAG : 1
        };
    } else {
        output = {
            ALERTS : alertsResults.OUT_ALERT_ON_MAP,
            FIELD : alertsResults.GIS_TYPE,
            STATUS : alertsResults.OUT_PLAN_STATUS,
            INVALID_LOCATIONS : alertsResults.OUT_LOCATIONS_XPOS_YPOS_INVALID
        };
    }
    return output;
}
function getBubbleOnMapByExecId(planId, timezone, execId, nodeId, sequence, polygon) {
    var procName, bubbleOnMapProc, bubbleResults, output;
    procName = constants.SP_PKG_PIPELINE
            + "::p_get_bubble_on_map_for_template_plan";
    bubbleOnMapProc = new Procedure(constants.SCHEMA_NAME, procName);
    bubbleResults = bubbleOnMapProc(planId, timezone, execId, nodeId, sequence, polygon);
    if (bubbleResults.TOO_MUCH_LOCATION_FLAG === 1) {
        output = {
            TOO_MUCH_LOCATION_FLAG : 1
        };
    } else {
        output = {
            RESULTS : bubbleResults.OUT_BUBBLE_ON_MAP,
            FIELD : bubbleResults.GIS_TYPE,
            STATUS : bubbleResults.OUT_PLAN_STATUS,
            INVALID_LOCATIONS : bubbleResults.OUT_LOCATIONS_XPOS_YPOS_INVALID
        };
    }
    return output;
}

function getBubbleOnMapByResourceType(planId, timezone, execId, nodeId, sequence, polygon, resourceType) {
    var procName, bubbleOnMapProc, bubbleResults, output;
    procName = constants.SP_PKG_PIPELINE
            + "::p_get_bubble_on_map_for_template_plan_of_the_resource";
    bubbleOnMapProc = new Procedure(constants.SCHEMA_NAME, procName);
    bubbleResults = bubbleOnMapProc(planId, timezone, execId, nodeId, sequence, polygon, resourceType);
    if (bubbleResults.TOO_MUCH_LOCATION_FLAG === 1) {
        output = {
            TOO_MUCH_LOCATION_FLAG : 1
        };
    } else {
        output = {
            RESULTS : bubbleResults.OUT_BUBBLE_ON_MAP,
            FIELD : bubbleResults.GIS_TYPE,
            STATUS : bubbleResults.OUT_PLAN_STATUS,
            INVALID_LOCATIONS : bubbleResults.OUT_LOCATIONS_XPOS_YPOS_INVALID
        };
    }
    return output;
}

function getPieOnMapByExecId(planId, timezone, execId, nodeId, sequence, polygon) {
    var procName, pieOnMapProc, pieResults, output;
    procName = constants.SP_PKG_PIPELINE
            + "::p_get_pie_on_map_for_template_plan_for_supply_demand";
    pieOnMapProc = new Procedure(constants.SCHEMA_NAME, procName);
    pieResults = pieOnMapProc(planId, timezone, execId, nodeId, sequence, polygon);
    if (pieResults.TOO_MUCH_LOCATION_FLAG === 1) {
        output = {
            TOO_MUCH_LOCATION_FLAG : 1
        };
    } else {
        output = {
            RESULTS : reviseSDArraylib.reviseArrayPieResults(
                    pieResults.OUT_PIE_ON_MAP, pieResults.GIS_TYPE),
            FIELD : pieResults.GIS_TYPE,
            STATUS : pieResults.OUT_PLAN_STATUS,
            INVALID_LOCATIONS : pieResults.OUT_LOCATIONS_XPOS_YPOS_INVALID
        };
    }
    return output;
}

function getPieOnMapByResourceType(planId, timezone, execId, nodeId, sequence, polygon, resourceType) {
    var procName, pieOnMapProc, pieResults, output;
    procName = constants.SP_PKG_PIPELINE
            + "::p_get_pie_on_map_for_template_plan_for_supply_demand_of_the_resource";
    pieOnMapProc = new Procedure(constants.SCHEMA_NAME, procName);
    pieResults = pieOnMapProc(planId, timezone, execId, nodeId, sequence, polygon, resourceType);
    if (pieResults.TOO_MUCH_LOCATION_FLAG === 1) {
        output = {
            TOO_MUCH_LOCATION_FLAG : 1
        };
    } else {
        output = {
            RESULTS : reviseSDArraylib.reviseArrayPieResults(
                    pieResults.OUT_PIE_ON_MAP, pieResults.GIS_TYPE),
            FIELD : pieResults.GIS_TYPE,
            STATUS : pieResults.OUT_PLAN_STATUS,
            INVALID_LOCATIONS : pieResults.OUT_LOCATIONS_XPOS_YPOS_INVALID
        };
    }
    return output;
}

function getAvailablePlans(planTypeID, locationFilterID, persistedPlanIDs,
        equipmentFilterID, resourceCategory) {
    var conn, locationType, procGetLocation, procName, procResultName, procLocation, Proc, procResult, locationOutput, output, results;
    try {
        conn = $.db.getConnection();
        conn.setAutoCommit(false);
        // get virtual plan location type
        procGetLocation = "sap.tm.trp.db.pipeline/cv_get_location_type_of_location_filter/proc";
        procLocation = new Procedure("_SYS_BIC", procGetLocation, {
            connection : conn
        });
        locationOutput = procLocation(locationFilterID);
        locationType = locationOutput.VAR_OUT[0].LOCATION_TYPE;
        if (persistedPlanIDs !== "") {
            switch (locationType) {
            case (constants.LOCATION_FILTER):
                procName = "sap.tm.trp.db.pipeline/cv_persisted_plan_list_for_locationfilter_for_admin_with_timefilter/proc";
                break;
            case (constants.LOCATION_GROUP_FILTER):
                procName = "sap.tm.trp.db.pipeline/cv_persisted_plan_list_for_locationgroupfilter_for_admin_with_timefilter/proc";
                break;
            /*case (constants.ZONE_FILTER):
                procName = "sap.tm.trp.db.pipeline/cv_persisted_plan_list_for_zonefilter_for_admin_with_timefilter/proc";
                break;
               
            case (constants.ZONE_GROUP_FILTER):
                procName = "sap.tm.trp.db.pipeline/cv_persisted_plan_list_for_zonegroupfilter_for_admin_with_timefilter/proc";
                break;
                 */
            case (constants.REGION_FILTER):
                procName = "sap.tm.trp.db.pipeline/cv_persisted_plan_list_for_regionfilter_for_admin_with_timefilter/proc";
                break;
            case (constants.REGION_GROUP_FILTER):
                procName = "sap.tm.trp.db.pipeline/cv_persisted_plan_list_for_regiongroupfilter_for_admin_with_timefilter/proc";
                break;
            default:
                throw new xslib.InternalError("Invalid location filter ID",
                        locationFilterID);
            }
        } else {
            switch (locationType) {
            case (constants.LOCATION_FILTER):
                procName = "sap.tm.trp.db.pipeline/cv_persisted_plan_list_for_locationfilter_for_admin_without_timefilter/proc";
                break;
            case (constants.LOCATION_GROUP_FILTER):
                procName = "sap.tm.trp.db.pipeline/cv_persisted_plan_list_for_locationgroupfilter_for_admin_without_timefilter/proc";
                break;
           /* case (constants.ZONE_FILTER):
                procName = "sap.tm.trp.db.pipeline/cv_persisted_plan_list_for_zonefilter_for_admin_without_timefilter/proc";
                break;
            case (constants.ZONE_GROUP_FILTER):
                procName = "sap.tm.trp.db.pipeline/cv_persisted_plan_list_for_zonegroupfilter_for_admin_without_timefilter/proc";
                break;
                */
            case (constants.REGION_FILTER):
                procName = "sap.tm.trp.db.pipeline/cv_persisted_plan_list_for_regionfilter_for_admin_without_timefilter/proc";
                break;
            case (constants.REGION_GROUP_FILTER):
                procName = "sap.tm.trp.db.pipeline/cv_persisted_plan_list_for_regiongroupfilter_for_admin_without_timefilter/proc";
                break;
            default:
                throw new xslib.InternalError("Invalid location filter ID",
                        locationFilterID);
            }
        }
        Proc = new Procedure("_SYS_BIC", procName, {
            connection : conn
        });
        output = Proc(locationFilterID, persistedPlanIDs, equipmentFilterID,
                planTypeID, resourceCategory);
        procResultName = "sap.tm.trp.db.pipeline::p_persisted_plans_for_virtual_plan";
        procResult = new Procedure(constants.SCHEMA_NAME, procResultName, {
            connection : conn
        });
        var input = output.VAR_OUT.map(function(item) {
            return {
                ID : item.PLAN_MODEL_ID
            };
        });
        results = procResult(input);
        conn.commit();
        return results;
    } catch (e) {
        conn.rollback();
        throw new xslib.InternalError(messages.MSG_ERROR_LIST_AVAILABLE_PLANS,
                e);
    } finally {
        if (conn) {
            conn.close();
        }
    }
}

function checkSubPlan(fullCheck, subPlanID, compareSubPlanIDs) {
    var procName, checkProc, results;
    var output = [];
    try {
        procName = "sap.tm.trp.db.pipeline::p_new_selected_persisted_plans_intersection_check";
        checkProc = new Procedure(constants.SCHEMA_NAME, procName);
        results = checkProc(subPlanID, compareSubPlanIDs, fullCheck);
        if (results.INTERSECTION_PLAN_INFO.length > 0) {
            if (!Object.keys(results.INTERSECTION_PLAN_INFO[0]).every(
                    function(i) {
                        return results.INTERSECTION_PLAN_INFO[0][i] === null;
                    })) {
                output = results.INTERSECTION_PLAN_INFO.map(function(item) {
                    return {
                        PLAN_MODEL_ID1 : item.PLAN_MODEL_ID1,
                        NAME1 : item.NAME1,
                        PLAN_MODEL_ID2 : item.PLAN_MODEL_ID2,
                        NAME2 : item.NAME2
                    };
                });
            }
        }
        results.INTERSECTION_PLAN_INFO = output;
        return results;
    } catch (e) {
        throw new xslib.InternalError(messages.MSG_ERROR_CHECK_SUBPLAN_MODEL, e);
    }
}

function getVirtualPlanInfo(planModelId, nodeName) {
    var virtualPlanInfo, infoList, procName;
    var locations = [], locationRelationships = [], calculationModelNodes = [];
    try {
        procName = "sap.tm.trp.db.pipeline::p_get_virtual_plan_tree";
        virtualPlanInfo = new Procedure(constants.SCHEMA_NAME, procName);
        infoList = virtualPlanInfo(planModelId, nodeName);
        if (infoList.OUT_VP_LOCATION_INFO.length > 0) {
            if (!Object.keys(infoList.OUT_VP_LOCATION_INFO[0]).every(
                    function(i) {
                        return infoList.OUT_VP_LOCATION_INFO[0][i] === null;
                    })) {
                locations = infoList.OUT_VP_LOCATION_INFO.map(function(item) {
                    return {
                        ID : item.LOCATION_ID,
                        NAME : item.LOCATION_NAME,
                        TYPE : item.LOCATION_TYPE,
                        HAS_OUTPUT_DATASET_FLAG : item.HAS_OUTPUT_DATASET_FLAG,
                        LEVEL : item.LEVEL
                    };
                });
            }
        }
        if (infoList.OUT_VP_HIERARCHY.length > 0) {
            if (!Object.keys(infoList.OUT_VP_HIERARCHY[0]).every(function(i) {
                return infoList.OUT_VP_HIERARCHY[0][i] === null;
            })) {
                locationRelationships = infoList.OUT_VP_HIERARCHY.map(function(
                        item) {
                    return {
                        PARENT_ID : item.LOCATION_ID,
                        PARENT_TYPE : item.LOCATION_TYPE,
                        CHILD_ID : item.LOCATION_CHILD_ID,
                        CHILD_TYPE : item.LOCATION_CHILD_TYPE
                    };
                });
            }
        }
        if (infoList.OUT_VIRTUAL_PLAN_NODE_NAME.length > 0) {
            if (!Object
                    .keys(infoList.OUT_VIRTUAL_PLAN_NODE_NAME[0])
                    .every(
                            function(i) {
                                return infoList.OUT_VIRTUAL_PLAN_NODE_NAME[0][i] === null;
                            })) {
                calculationModelNodes = infoList.OUT_VIRTUAL_PLAN_NODE_NAME;
            }
        }
        return {
            locations : locations,
            locationRelationships : locationRelationships,
            calculationModelNodes : calculationModelNodes,
            resources: infoList.OUT_VP_EQUIP_INFO
        };
    } catch (e) {
        throw new xslib.InternalError(messages.MSG_ERROR_GET_VIRTUAL_PLAN_INFO,
                e);
    }
}

function reviseCsvFormat(array, downloadType) {
    var formatArray = [], sequenceArray = [], columnArray = [ 'GEO_NAME',
            'RESOURCE_TYPE', 'START_TIME', 'END_TIME' ], arrayNo = 0, key, sequenceKey;
    if (downloadType === "RESOURCE") {
        columnArray = [ 'RESOURCE_TYPE', 'GEO_NAME', 'START_TIME', 'END_TIME' ];
    }
    for ( var i in array) {
        // mock a hash key
        sequenceKey = array[i].SEQUENCE + '_%_' + array[i].GEO_ID + '_%_'
                + array[i].RESOURCE_TYPE_CODE;
        if (sequenceArray.indexOf(sequenceKey) < 0) {
            sequenceArray.push(sequenceKey);
            formatArray[arrayNo] = {};
            formatArray[arrayNo].GEO_NAME = array[i].GEO_NAME;
            formatArray[arrayNo].RESOURCE_TYPE = array[i].RESOURCE_TYPE_NAME;
            formatArray[arrayNo].START_TIME = array[i].START_TIME;
            formatArray[arrayNo].END_TIME = array[i].END_TIME;
            arrayNo++;
        }
        // create a new column name
        key = array[i].OUTPUT_KEY + '-' + array[i].DRILLDOWN_OUTPUT_KEY;
        formatArray[arrayNo - 1][key] = array[i].OUTPUT_VALUE;

        if (columnArray.indexOf(key) < 0) {
            columnArray.push(key);
        }
    }
    return {
        formatArray : formatArray,
        columnArray : columnArray
    };
}

function getDownloadCSVArray(type, planId, execId, timezone, nodeId, locations) {
    var procName, downloadCSV, fileName;
    if (type === 'LOCATION') {
        procName = "sap.tm.trp.db.supplydemand::p_get_details_expand_by_executionid_location_csv";
        fileName = 'supply_demand_view_by_location.csv';
    } else {
        procName = "sap.tm.trp.db.supplydemand::p_get_details_expand_by_executionid_resource_csv";
        fileName = 'supply_demand_view_by_resource.csv';
    }
    downloadCSV = new Procedure(constants.SCHEMA_NAME, procName);
    var result = downloadCSV(planId, execId, timezone, nodeId, locations).OUT_PUT;
    return {
        CSVNAME : fileName,
        CSVARRAY : result
    };
}

function zipperCSV(fileName, csvArray, columnArray) {
    // zipper.addFile(fileName, CSV.createFromAssociativeObjects(csvArray,
    //         columnArray).toCSV(csvParser.LINE_SEPARATOR_UNIX, ","));
    var csvContent = CSV.createFromAssociativeObjects(csvArray,
             columnArray).toCSV(csvParser.LINE_SEPARATOR_UNIX, ",")
    // Here some manual override has to be done, not responding via RailXS
    $.response.status = $.net.http.OK;
    $.response.contentType = "Text/plain";
    $.response.headers.set("Content-Disposition",
            "attachment; filename = \"supply_demand.txt\"");
    $.response.setBody(csvContent);
}

plan.queryItems = function(params) {
    try {
        var facetFilter = new Procedure(constants.SCHEMA_NAME,
                "sap.tm.trp.db.pipeline::p_get_plan_facet_filter");
        var data = facetFilter(params.obj.search, params.obj.planTypeId,
                params.obj.visibility, params.obj.timeFilterId,
                params.obj.resourceFilterId, params.obj.locationFilterId,
                params.obj.locationFilterType, params.obj.planStatus,
                params.obj.RESOURCE_CATEGORY);

        return {
            PLAN_TYPE_ID : data.PLAN_MODEL_TYPE_ID_LIST_OUTPUT.map(function(
                    item) {
                return {
                    key : item.ID,
                    text : item.DESC
                };
            }),
            RESOURCE_FILTER_ID : data.RESOURCE_FILTER_ID_LIST_OUTPUT
                    .map(function(item) {
                        return {
                            key : item.ID,
                            text : item.DESC
                        };
                    }),
            LOCATION_FILTER_ID : data.LOCATION_FILTER_ID_LIST_OUTPUT
                    .map(function(item) {
                        return {
                            key : item.ID,
                            text : item.DESC
                        };
                    }),
            TIME_FILTER_ID : data.TIME_FILTER_ID_LIST_OUTPUT
                    .map(function(item) {
                        return {
                            key : item.ID,
                            text : item.DESC
                        };
                    }),
            VISIBILITY : data.VISIBILITY_LIST_OUTPUT.map(function(item) {
                return {
                    key : item.CODE,
                    text : item.DESC
                };
            }),
            PLAN_STATUS : data.PLAN_STATUS_LIST_OUTPUT.map(function(item) {
                return {
                    key : item.ID,
                    text : item.DESC
                };
            })
        };
    } catch (e) {
        throw new xslib.InternalError(messages.MSG_ERROR_GET_FACET_FILTER, e);
    }
};

plan
        .setFilters([
                {
                    filter : function(params) {
                        if (params.obj.VISIBILITY_FLAG === "G"
                                && !$.session
                                        .hasAppPrivilege("sap.tm.trp.service::MakeGlobalVisibility")) {
                            logger
                                    .error("MAKE_GLOBAL_VISIBILITY_AUTHORIZE_FAILED");

                            throw new xslib.NotAuthorizedError(
                                    "sap.tm.trp.service::MakeGlobalVisibility");
                        }
                        return true;
                    },
                    only : [ "create" ]
                },
                {
                    filter : function(params) {
                        if (params.obj.VISIBILITY_FLAG === "G"
                                && !$.session
                                        .hasAppPrivilege("sap.tm.trp.service::MakeGlobalVisibility")) {
                            logger
                                    .error("MAKE_GLOBAL_VISIBILITY_AUTHORIZE_FAILED");

                            throw new xslib.NotAuthorizedError(
                                    "sap.tm.trp.service::MakeGlobalVisibility");
                        }
                        try {
                            return getUserInfoAuthCheck(params.id);
                        } catch (e) {
                            if (e instanceof xslib.WebApplicationError) {
                                throw e; // no need to wrapper it again
                            }
                            throw new xslib.InternalError(
                                    messages.MSG_ERROR_UNAUTHORIZED_UPDATE, e);
                        }

                        return true;
                    },
                    only : [ "update" ]
                },
                {
                    filter : function(params) {
                        try {
                            return getUserInfoAuthCheck(params.id);
                        } catch (e) {
                            if (e instanceof xslib.WebApplicationError) {
                                throw e; // no need to wrapper it again
                            }
                            throw new xslib.InternalError(
                                    messages.MSG_ERROR_UNAUTHORIZED_DELETE, e);
                        }
                        return true;
                    },
                    only : [ "destroy" ]
                },
                {
                    filter : function(params) {
                        try {
                            var checkProc = new Procedure(
                                    constants.SCHEMA_NAME,
                                    "sap.tm.trp.db.pipeline::p_plan_delete_check");
                            var checkResult = checkProc(params.id).WHEREUSED;

                            if (checkResult.length > 0) {
                                throw new xslib.InternalError(
                                        messages.MSG_PLAN_IS_USED);
                            }
                            return true;
                        } catch (e) {
                            logger.error("PLAN_CHECK_FAILED", e, params.id);
                            if (e instanceof xslib.WebApplicationError) {
                                throw e;
                            }
                            throw new xslib.InternalError(
                                    messages.MSG_PLAN_CHECK_USED_FAILED, e);
                        }
                    },
                    only : [ "destroy" ]
                },
                {
                    filter : function(params) {
                        var filterId = params.obj.LOCATION_FILTER_ID
                                || params.obj.locationFilterId;
                        geoCheck.authorizeReadByLocationFilterIdList([ {
                            ID : filterId
                        } ]);
                        return true;
                    },
                    only : [ "create", "update" ]
                },
                ,
                {
                    filter : function(params) {
                        try {
                            var obj = params.obj;
                            if (obj.locationType && obj.geoId) {
                                geoCheck.authorizeReadByLocationIdList(
                                        obj.locationType, obj.locations);
                            }
                            return true;
                        } catch (e) {
                            logger.error("PLAN_AUTHORIZE_FAILED", e);
                            throw e;
                        }
                    },
                    only : [ "supplyDemandByLocation",
                            "supplyDemandByResource", "locationSupplyDemand",
                            "resourceSupplyDemand", "detailsByLocation",
                            "detailsByResource", "kpiByLocation",
                            "kpiByResource", "locationKpi", "resourceKpi",
                            "alertsOnMap", "bubbleOnMap", "pieOnMap",
                            "virtualPlanInfo", "locations" ]
                } ]);

plan.setRoutes([ {
    method : $.net.http.POST,
    scope : "collection",
    action : "queryItems",
    response : $.net.http.OK
} ]);
