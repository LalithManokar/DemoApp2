var model = $.import("/sap/tm/trp/service/model/virtualKpiPlans.xsjslib");
var lib = $.import("/sap/tm/trp/service/plan/plan.xsjslib");
var xslib = lib.xslib;
var plan = lib.plan;
var VIRTUAL_KPI_PLAN_TYPE = lib.constants.PLAN_TYPE.VIRTUAL_KPI;
var KPI_PLAN_TYPE = lib.constants.PLAN_TYPE.PERSISTED_KPI;

plan.setModel(model.Plans);

plan.create = function(params) {
    var obj = params.obj;
    try {
        var createPlanProc, procName, createResult;
        procName = lib.constants.SP_PKG_PIPELINE
                + "::p_virtual_kpi_plan_create";
        createPlanProc = new lib.Procedure(lib.constants.SCHEMA_NAME, procName);

        createResult = createPlanProc(obj.NAME, obj.DESC,
                VIRTUAL_KPI_PLAN_TYPE, obj.VISIBILITY, obj.RESOURCE_FILTER_ID,
                obj.LOCATION_FILTER_ID, obj.SUB_PLANS, obj.RESOURCE_CATEGORY, obj.USAGE_CODE);
        lib.logger.success("VIRTUAL_KPI_PLAN_CREATE", obj.NAME, obj.VISIBILITY
                .toString(), obj.RESOURCE_FILTER_ID.toString(),
                obj.LOCATION_FILTER_ID.toString(), obj.SUB_PLANS,
                obj.RESOURCE_CATEGORY.toString(), obj.USAGE_CODE.toString());
        return {
            ID : createResult.PLAN_MODEL_ID
        };
    } catch (e) {
        lib.logger.error("VIRTUAL_KPI_PLAN_CREATE_FAILED", obj.NAME,
                obj.VISIBILITY.toString(), obj.RESOURCE_FILTER_ID.toString(),
                obj.LOCATION_FILTER_ID.toString(), obj.SUB_PLANS,
                obj.RESOURCE_CATEGORY.toString(), obj.USAGE_CODE.toString(), e);
        throw new xslib.InternalError(lib.messages.MSG_ERROR_CREATE_PLAN_MODEL,
                e);
    }
};

plan.update = function(params) {
    var obj = params.obj;
    try {
        var updatePlanProc, procName;
        procName = lib.constants.SP_PKG_PIPELINE
                + "::p_virtual_kpi_plan_update";
        updatePlanProc = new lib.Procedure(lib.constants.SCHEMA_NAME, procName);

        updatePlanProc(params.id, obj.NAME, obj.DESC, VIRTUAL_KPI_PLAN_TYPE,
                obj.VISIBILITY, obj.RESOURCE_FILTER_ID, obj.LOCATION_FILTER_ID,
                obj.SUB_PLANS, obj.USAGE_CODE);
        lib.logger.success("VIRTUAL_KPI_PLAN_UPDATE", obj.NAME, obj.VISIBILITY
                .toString(), obj.RESOURCE_FILTER_ID.toString(),
                obj.LOCATION_FILTER_ID.toString(), obj.SUB_PLANS, obj.USAGE_CODE.toString());
    } catch (e) {
        lib.logger.error("VIRTUAL_KPI_PLAN_UPDATE_FAILED", params.obj.NAME,
                obj.NAME, obj.VISIBILITY.toString(), obj.RESOURCE_FILTER_ID
                        .toString(), obj.LOCATION_FILTER_ID.toString(),
                obj.SUB_PLANS, obj.USAGE_CODE.toString(), e);
        throw new xslib.InternalError(lib.messages.MSG_ERROR_UPDATE_PLAN_MODEL,
                e);
    }
};

plan.destroy = function(params) {
    try {
        var destroyPlanProc, procName;
        procName = lib.constants.SP_PKG_PIPELINE
                + "::p_virtual_kpi_plan_delete";
        destroyPlanProc = new lib.Procedure(lib.constants.SCHEMA_NAME, procName);
        destroyPlanProc(params.id);
        lib.logger.success("VIRTUAL_KPI_PLAN_DELETE", lib.logger.Parameter
                .Integer(0, params.id));
    } catch (e) {
        lib.logger.error("VIRTUAL_KPI_PLAN_DELETE_FAILED", lib.logger.Parameter
                .Integer(0, params.id));
        throw new xslib.InternalError(lib.messages.MSG_ERROR_DELETE_PLAN_MODEL,
                e);
    }
};

plan.exec = function(params) {
    var conn;
    try {
        conn = $.db.getConnection();
        conn.setAutoCommit(false);
        var execVirtualPlanProc = new lib.Procedure("_SYS_BIC",
                "sap.tm.trp.db.pipeline/cv_plan_list_of_virtual_plan/proc");
        var planList = execVirtualPlanProc(params.id).VAR_OUT;
        var nowKpi = new Date();
        var timeKpi = nowKpi.getTime();
        var dateKpi = lib.utils.parseTime(nowKpi);
        planList.forEach(function(plan) {
            $.response.followUp({
                uri : "sap.tm.trp.service.plan:executevirtualplan.xsjs",
                functionName : "execute",
                parameter : {
                    schedulePlanId : plan.ID,
                    virtualPlanId : params.id,
                    executeTime : timeKpi,
                    executeDate : dateKpi
                }
            });
        });
        conn.commit();

        return {
            TIME : timeKpi,
            SUB_PLANS_COUNT : planList.length
        };
    } catch (e) {
        conn.rollback();
        lib.logger.error("VIRTUAL_PLAN_EXEC_FAILED", lib.logger.Parameter
                .Integer(0, params.id), lib.logger.Parameter.Exception(1, e));
        throw new xslib.InternalError(
                lib.messages.MSG_ERROR_EXECUTE_PLAN_MODEL, e);
    } finally {
        if (conn) {
            conn.close();
        }
    }
};

plan.availablePlans = function(params) {
    var conn, locationType, procGetLocation, procName, procResultName, procLocation, Proc, procResult, locationOutput, output, results;
    var planTypeID = KPI_PLAN_TYPE, locationFilterID = params.obj.LOCATION_FILTER_ID, persistedPlanIDs = params.obj.SUB_PLAN_IDS, equipmentFilterID = params.obj.RESOURCE_FILTER_ID, resourceCategory = params.obj.RESOURCE_CATEGORY;
    try {
        conn = $.db.getConnection();
        conn.setAutoCommit(false);
        // get virtual plan location type
        procGetLocation = "sap.tm.trp.db.pipeline/cv_get_location_type_of_location_filter/proc";
        procLocation = new lib.Procedure("_SYS_BIC", procGetLocation, {
            connection : conn
        });
        locationOutput = procLocation(locationFilterID);
        locationType = locationOutput.VAR_OUT[0].LOCATION_TYPE;
        if (persistedPlanIDs !== "") {
            switch (locationType) {
            case (lib.constants.LOCATION_FILTER):
                procName = "sap.tm.trp.db.pipeline/cv_persisted_plan_list_for_locationfilter_for_admin_with_timefilter/proc";
                break;
            case (lib.constants.LOCATION_GROUP_FILTER):
                procName = "sap.tm.trp.db.pipeline/cv_persisted_plan_list_for_locationgroupfilter_for_admin_with_timefilter/proc";
                break;
           /* case (lib.constants.ZONE_FILTER):
                procName = "sap.tm.trp.db.pipeline/cv_persisted_plan_list_for_zonefilter_for_admin_with_timefilter/proc";
                break;
            case (lib.constants.ZONE_GROUP_FILTER):
                procName = "sap.tm.trp.db.pipeline/cv_persisted_plan_list_for_zonegroupfilter_for_admin_with_timefilter/proc";
                break;
                */
            case (lib.constants.REGION_FILTER):
                procName = "sap.tm.trp.db.pipeline/cv_persisted_plan_list_for_regionfilter_for_admin_with_timefilter/proc";
                break;
            case (lib.constants.REGION_GROUP_FILTER):
                procName = "sap.tm.trp.db.pipeline/cv_persisted_plan_list_for_regiongroupfilter_for_admin_with_timefilter/proc";
                break;
            default:
                throw new xslib.InternalError("Invalid location filter ID",
                        locationFilterID);
            }
            //Validation check
            Proc = new lib.Procedure("_SYS_BIC", procName, {
                            connection : conn
                        });
                        output = Proc(locationFilterID, persistedPlanIDs, equipmentFilterID,
                            planTypeID, resourceCategory);
                        procResultName = "sap.tm.trp.db.pipeline::p_persisted_plans_for_virtual_plan_schedule";
                        procResult = new lib.Procedure(lib.constants.SCHEMA_NAME,
                            procResultName, {
                                connection : conn
                            });
                        
            
                        var input = output.VAR_OUT.map(function(item) {
                            return {
                                ID : item.PLAN_MODEL_ID
                            };
                        });
                      
                       
                      var input2 = [], id = {};
                      id.ID = persistedPlanIDs;
                      input2.push(id);
                        results = procResult(input,input2);
                        
                        conn.commit();
                        /*try{
                      if (results.PLAN_INFO_OUT.length === 0) {
                        throw new xslib.InternalError("Invalid Plans filter ID",
                                    locationFilterID);
            } }
                    catch (e) {
                    conn.rollback();
                    throw new xslib.InternalError(
                            lib.messages.MSG_ERROR_LIST_VALID_PLANS, e);
                }*/
                
                return results;
            //End validation
        } else {
            switch (locationType) {
            case (lib.constants.LOCATION_FILTER):
                procName = "sap.tm.trp.db.pipeline/cv_persisted_plan_list_for_locationfilter_for_admin_without_timefilter/proc";
                break;
            case (lib.constants.LOCATION_GROUP_FILTER):
                procName = "sap.tm.trp.db.pipeline/cv_persisted_plan_list_for_locationgroupfilter_for_admin_without_timefilter/proc";
                break;
           /* case (lib.constants.ZONE_FILTER):
                procName = "sap.tm.trp.db.pipeline/cv_persisted_plan_list_for_zonefilter_for_admin_without_timefilter/proc";
                break;
            case (lib.constants.ZONE_GROUP_FILTER):
                procName = "sap.tm.trp.db.pipeline/cv_persisted_plan_list_for_zonegroupfilter_for_admin_without_timefilter/proc";
                break;
                */
            case (lib.constants.REGION_FILTER):
                procName = "sap.tm.trp.db.pipeline/cv_persisted_plan_list_for_regionfilter_for_admin_without_timefilter/proc";
                break;
            case (lib.constants.REGION_GROUP_FILTER):
                procName = "sap.tm.trp.db.pipeline/cv_persisted_plan_list_for_regiongroupfilter_for_admin_without_timefilter/proc";
                break;
            default:
                throw new xslib.InternalError("Invalid location filter ID",
                        locationFilterID);
            }
        }
        Proc = new lib.Procedure("_SYS_BIC", procName, {
            connection : conn
        });
        output = Proc(locationFilterID, persistedPlanIDs, equipmentFilterID,
                planTypeID, resourceCategory);
        procResultName = "sap.tm.trp.db.pipeline::p_persisted_plans_for_virtual_plan";
        procResult = new lib.Procedure(lib.constants.SCHEMA_NAME,
                procResultName, {
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
        throw new xslib.InternalError(
                lib.messages.MSG_ERROR_LIST_AVAILABLE_PLANS, e);
    } finally {
        if (conn) {
            conn.close();
        }
    }
};

plan.checkSubPlan = function(params) {
    var procName, Proc, results;
    var output = [];
    var fullCheck = params.obj.FULL_CHECK, subPlanID = params.obj.SUB_PLANS, compareSubPlanIDs = params.obj.COMPARE_SUB_PLANS;
    try {
        procName = "sap.tm.trp.db.pipeline::p_new_selected_persisted_plans_intersection_check";
        Proc = new lib.Procedure(lib.constants.SCHEMA_NAME, procName);
        results = Proc(subPlanID, compareSubPlanIDs, fullCheck);
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
        throw new xslib.InternalError(
                lib.messages.MSG_ERROR_CHECK_SUBPLAN_MODEL, e);
    }
};

plan.virtualPlanInfo = function(params) {
    var virtualPlanInfo, planModelId, nodeName, infoList, procName;
    var locations = [], locationRelationships = [], calculationModelNodes = [];
    planModelId = params.id;
    nodeName = params.obj.nodeName;
    try {
        procName = "sap.tm.trp.db.pipeline::p_get_virtual_plan_tree";
        virtualPlanInfo = new lib.Procedure(lib.constants.SCHEMA_NAME, procName);
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
        throw new xslib.InternalError(
                lib.messages.MSG_ERROR_GET_VIRTUAL_PLAN_INFO, e);
    }
};

plan.kpiByLocation = function(params) {
    try {
        var procName = lib.constants.SP_PKG_PIPELINE
                + "::p_get_virtual_kpi_plan_table_result_by_plan_id";
        var tableProc = new lib.Procedure(lib.constants.SCHEMA_NAME, procName);
        var tableResults = tableProc(params.id, params.obj.nodeName,
                params.obj.locations, params.obj.execId);

        tableResults.OUTPUT.forEach(function(i) {
            // dynamical KPI change
            i.DATA = {
                VALUE : Number(i.OUTPUT_VALUE),
                ALERT : i.ALERT_STATUS
            };

            i.OUTPUT_NODE_NAME = i.OUT_NODE_NAME;
            i.OUTPUT_NODE_TYPE = i.OUTPUT_KEY;

            delete i.OUTPUT_VALUE;
            delete i.OUTPUT_KEY;
            delete i.OUT_NODE_NAME;
        });

        return {
            results : tableResults.OUTPUT,
            status : tableResults.PLAN_STATUS
        };
    } catch (e) {
        if (e instanceof xslib.WebApplicationError) {
            throw e;
        }
        throw new xslib.InternalError(lib.messages.MSG_ERROR_KPI_TABLE_VIEW, e);
    }
};

plan.kpiByResource = function(params) {
    try {
        var procName = lib.constants.SP_PKG_PIPELINE
                + "::p_get_virtual_kpi_plan_table_result_by_plan_id_resource_type";
        var tableProc = new lib.Procedure(lib.constants.SCHEMA_NAME, procName);
        var tableResults = tableProc(params.id, params.obj.nodeName,
                params.obj.locations, params.obj.execId);

        tableResults.OUTPUT.forEach(function(i) {
            // dynamical KPI change
            i.DATA = {
                VALUE : Number(i.OUTPUT_VALUE),
                ALERT : i.ALERT_STATUS
            };

            i.OUTPUT_NODE_NAME = i.OUT_NODE_NAME;
            i.OUTPUT_NODE_TYPE = i.OUTPUT_KEY;

            delete i.OUTPUT_VALUE;
            delete i.OUTPUT_KEY;
            delete i.OUT_NODE_NAME;
        });

        return {
            results : tableResults.OUTPUT,
            status : tableResults.PLAN_STATUS
        };
    } catch (e) {
        if (e instanceof xslib.WebApplicationError) {
            throw e;
        }
        throw new xslib.InternalError(lib.messages.MSG_ERROR_KPI_TABLE_VIEW, e);
    }
};

plan.locationKpi = function(params) {
    try {
        var procName = lib.constants.SP_PKG_PIPELINE
                + "::p_get_virtual_kpi_plan_table_result_by_plan_id_location_id";
        var tableProc = new lib.Procedure(lib.constants.SCHEMA_NAME, procName);
        var tableResults = tableProc(params.id, params.obj.nodeName,
                params.obj.geoId, params.obj.execId);

        tableResults.OUTPUT.forEach(function(i) {
            // dynamical KPI change
            i.DATA = {
                VALUE : Number(i.OUTPUT_VALUE),
                ALERT : i.ALERT_STATUS
            };

            i.OUTPUT_NODE_NAME = i.OUT_NODE_NAME;
            i.OUTPUT_NODE_TYPE = i.OUTPUT_KEY;

            delete i.OUTPUT_VALUE;
            delete i.OUTPUT_KEY;
            delete i.OUT_NODE_NAME;
        });

        return {
            results : tableResults.OUTPUT,
            status : tableResults.PLAN_STATUS
        };
    } catch (e) {
        if (e instanceof xslib.WebApplicationError) {
            throw e;
        }
        throw new xslib.InternalError(lib.messages.MSG_ERROR_KPI_TABLE_VIEW, e);
    }
};

plan.resourceKpi = function(params) {
    try {
        var procName = lib.constants.SP_PKG_PIPELINE
                + "::p_get_virtual_kpi_plan_table_result_by_plan_id_location_id_resource_type";
        var tableProc = new lib.Procedure(lib.constants.SCHEMA_NAME, procName);
        var tableResults = tableProc(params.id, params.obj.nodeName,
                params.obj.resourceTypeCode, params.obj.locations,
                params.obj.execId);

        tableResults.OUTPUT.forEach(function(i) {
            // dynamical KPI change
            i.DATA = {
                VALUE : Number(i.OUTPUT_VALUE),
                ALERT : i.ALERT_STATUS
            };

            i.OUTPUT_NODE_NAME = i.OUT_NODE_NAME;
            i.OUTPUT_NODE_TYPE = i.OUTPUT_KEY;

            delete i.OUTPUT_VALUE;
            delete i.OUTPUT_KEY;
            delete i.OUT_NODE_NAME;
        });

        return {
            results : tableResults.OUTPUT,
            status : tableResults.PLAN_STATUS
        };
    } catch (e) {
        if (e instanceof xslib.WebApplicationError) {
            throw e;
        }
        throw new xslib.InternalError(lib.messages.MSG_ERROR_KPI_TABLE_VIEW, e);
    }
};

plan.kpiChartByLocation = function(params) {
    try {
        var procName;
        procName = lib.constants.SP_PKG_PIPELINE
                + "::p_get_virtual_kpi_plan_chart";
        var kpiChartProc = new lib.Procedure(lib.constants.SCHEMA_NAME,
                procName);
        var chartResults = kpiChartProc(params.id, params.obj.nodeName,
                params.obj.locations, params.obj.execId);
        chartResults.LOCATION_OUTPUT.forEach(function(i) {
            // dynamical KPI change
            i.DATA = {
                VALUE : Number(i.OUTPUT_VALUE),
                ALERT : i.ALERT
            };
            i.OUTPUT_NODE_TYPE = i.OUTPUT_KEY;

            delete i.OUTPUT_KEY;
            delete i.OUTPUT_VALUE;
        });
        chartResults.RESOURCE_OUTPUT.forEach(function(i) {
            // dynamical KPI change
            i.DATA = {
                VALUE : Number(i.OUTPUT_VALUE),
                ALERT : i.ALERT
            };
            i.OUTPUT_NODE_TYPE = i.OUTPUT_KEY;

            delete i.OUTPUT_KEY;
            delete i.OUTPUT_VALUE;
        });
        return {
            OVERVIEW : chartResults.LOCATION_OUTPUT,
            DETAILS : chartResults.RESOURCE_OUTPUT,
            STATUS : chartResults.PLAN_STATUS
        };
    } catch (e) {
        if (e instanceof xslib.WebApplicationError) {
            throw e;
        }
        throw new xslib.InternalError(lib.messages.MSG_ERROR_KPI_CHART_VIEW, e);
    }
};

plan.kpiChartByResource = function(params) {
    try {
        var procName;
        procName = lib.constants.SP_PKG_PIPELINE
                + "::p_get_virtual_kpi_plan_chart_by_resource";
        var kpiChartProc = new lib.Procedure(lib.constants.SCHEMA_NAME,
                procName);
        var chartResults = kpiChartProc(params.id, params.obj.nodeName,
                params.obj.locations, params.obj.execId);
        chartResults.RESOURCE_AGG_OUTPUT.forEach(function(i) {
            // dynamical KPI change
            i.DATA = {
                VALUE : Number(i.OUTPUT_VALUE),
                ALERT : i.ALERT
            };
            i.OUTPUT_NODE_TYPE = i.OUTPUT_KEY;

            delete i.OUTPUT_KEY;
            delete i.OUTPUT_VALUE;
        });
        chartResults.RESOURCE_OUTPUT.forEach(function(i) {
            i.DATA = {
                VALUE : Number(i.OUTPUT_VALUE),
                ALERT : i.ALERT
            };
            i.OUTPUT_NODE_TYPE = i.OUTPUT_KEY;

            delete i.OUTPUT_KEY;
            delete i.OUTPUT_VALUE;
        });
        return {
            OVERVIEW : chartResults.RESOURCE_AGG_OUTPUT,
            DETAILS : chartResults.RESOURCE_OUTPUT,
            STATUS : chartResults.PLAN_STATUS
        };
    } catch (e) {
        if (e instanceof xslib.WebApplicationError) {
            throw e;
        }
        throw new xslib.InternalError(lib.messages.MSG_ERROR_KPI_CHART_VIEW, e);
    }
};

plan.alertsOnMap = function(params) {
    try {
        var procName, alertsOnMapProc, alertsResults, output;
        var hierarchyLevel = params.obj.hierarchyLevel, polygon = params.obj.polygon, nodeName = params.obj.nodeName, startTime = params.obj.startTime, execId = params.obj.execId;
        procName = lib.constants.SP_PKG_PIPELINE
                + "::p_get_alert_on_map_for_virtual_plan";
        alertsOnMapProc = new lib.Procedure(lib.constants.SCHEMA_NAME, procName);
        alertsResults = alertsOnMapProc(params.id, hierarchyLevel, polygon,
                nodeName, startTime, execId);
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
    } catch (e) {
        if (e instanceof xslib.WebApplicationError) {
            throw e;
        }
        throw new xslib.InternalError(lib.messages.MSG_ERROR_ALERTS_ON_MAP, e);
    }
};

plan.bubbleOnMap = function(params) {
    try {
        var procName, bubbleOnMapProc, bubbleResults, output;
        var hierarchyLevel = params.obj.hierarchyLevel, polygon = params.obj.polygon, nodeName = params.obj.nodeName, startTime = params.obj.startTime, execId = params.obj.execId;
        procName = lib.constants.SP_PKG_PIPELINE
                + "::p_get_bubble_on_map_for_virtual_plan";
        bubbleOnMapProc = new lib.Procedure(lib.constants.SCHEMA_NAME, procName);
        bubbleResults = bubbleOnMapProc(params.id, hierarchyLevel, polygon,
                nodeName, startTime, execId);
        if (bubbleResults.TOO_MUCH_LOCATION_FLAG === 1) {
            output = {
                TOO_MUCH_LOCATION_FLAG : 1
            };
        } else {
            // dynamical KPI change
            bubbleResults.OUT_BUBBLE_ON_MAP.forEach(function(item) {
                item.OUTPUT_NODE_TYPE = item.OUTPUT_KEY;
                delete item.OUTPUT_TYPE;
            });
            output = {
                RESULTS : bubbleResults.OUT_BUBBLE_ON_MAP,
                FIELD : bubbleResults.GIS_TYPE,
                STATUS : bubbleResults.OUT_PLAN_STATUS,
                INVALID_LOCATIONS : bubbleResults.OUT_LOCATIONS_XPOS_YPOS_INVALID
            };
        }
        return output;
    } catch (e) {
        if (e instanceof xslib.WebApplicationError) {
            throw e;
        }
        throw new xslib.InternalError(lib.messages.MSG_ERROR_BUBBLE_ON_MAP, e);
    }
};

plan.pieOnMap = function(params) {
    try {
        var procName, pieOnMapProc, pieResults, output;
        var hierarchyLevel = params.obj.hierarchyLevel, polygon = params.obj.polygon, nodeName = params.obj.nodeName, startTime = params.obj.startTime, execId = params.obj.execId;
        procName = lib.constants.SP_PKG_PIPELINE
                + "::p_get_pie_on_map_for_virtual_plan";
        pieOnMapProc = new lib.Procedure(lib.constants.SCHEMA_NAME, procName);
        pieResults = pieOnMapProc(params.id, hierarchyLevel, polygon, nodeName,
                startTime, execId);
        if (pieResults.TOO_MUCH_LOCATION_FLAG === 1) {
            output = {
                TOO_MUCH_LOCATION_FLAG : 1
            };
        } else {
            // dynamical KPI change
            pieResults.OUT_PIE_ON_MAP.forEach(function(item) {
                item.OUTPUT_NODE_TYPE = item.OUTPUT_KEY;
                delete item.OUTPUT_TYPE;
            });
            output = {
                RESULTS : pieResults.OUT_PIE_ON_MAP,
                FIELD : pieResults.GIS_TYPE,
                STATUS : pieResults.OUT_PLAN_STATUS,
                INVALID_LOCATIONS : pieResults.OUT_LOCATIONS_XPOS_YPOS_INVALID
            };
        }
        return output;
    } catch (e) {
        if (e instanceof xslib.WebApplicationError) {
            throw e;
        }
        throw new xslib.InternalError(lib.messages.MSG_ERROR_PIE_ON_MAP, e);
    }
};

plan
        .setFilters([
                {
                    filter : function() {
                        var privilege = "sap.tm.trp.service::CreateVirtualKPIPlan";

                        if (!$.session.hasAppPrivilege(privilege)) {
                            lib.logger.error("PLAN_CREATE_AUTHORIZE_FAILED",
                                    privilege);

                            throw new lib.NotAuthorizedError(privilege);
                        }
                        return true;
                    },
                    only : [ "create" ]
                },
                {
                    filter : function() {
                        var privilege = "sap.tm.trp.service::UpdateVirtualKPIPlan";

                        if (!$.session.hasAppPrivilege(privilege)) {
                            lib.logger.error("PLAN_UPDATE_AUTHORIZE_FAILED",
                                    privilege);

                            throw new lib.NotAuthorizedError(privilege);
                        }

                        return true;
                    },
                    only : [ "update" ]
                },
                {
                    filter : function(params) {
                         var conn, sql, rs1, usageCode;
                        conn = $.hdb.getConnection();
                        sql = "SELECT USAGE_CODE FROM \"SAP_TM_TRP\".\"sap.tm.trp.db.pipeline::t_plan_model\" WHERE ID=?";
                        rs1 = conn.executeQuery(sql, params.obj.ID);
                        usageCode = rs1[0].USAGE_CODE;
                        var privilege = "sap.tm.trp.service::ExecuteVirtualKPIPlan";
                        var privilege_gkpi = "sap.tm.trp.service::ExecuteScheduledPlan_Gen_KPIPlan";

                        if (!$.session.hasAppPrivilege(privilege)) {
                            if(usageCode === "GKPI" && $.session.hasAppPrivilege(privilege_gkpi)) {
                                return true;
                            } else {
                                lib.logger.error("PLAN_EXECUTE_AUTHORIZE_FAILED",
                                    privilege);

                                throw new lib.NotAuthorizedError(privilege);
                            }
                        }
                        return true;
                    },
                    only : [ "exec" ]
                },
                {
                    filter : function() {
                        var privilege = "sap.tm.trp.service::DeleteVirtualKPIPlan";

                        if (!$.session.hasAppPrivilege(privilege)) {
                            lib.logger.error("PLAN_DELETE_AUTHORIZE_FAILED",
                                    privilege);

                            throw new lib.NotAuthorizedError(privilege);
                        }

                        return true;
                    },
                    only : [ "destroy" ]
                },
                {
                    filter : function(params) {
                        try {
                            lib.geoCheck.authorizeReadByPlanIdList([ {
                                ID : params.id
                            } ]);

                            return true;
                        } catch (e) {
                            lib.logger.error("PLAN_AUTHORIZE_FAILED", e);
                            throw e;
                        }
                    },
                    only : [ "kpiByLocation", "kpiByResource", "locationKpi",
                            "resourceKpi", "kpiChartByLocation",
                            "kpiChartByResource", "alertsOnMap", "bubbleOnMap",
                            "pieOnMap", "virtualPlanInfo", "locations" ]
                },
                {
                    filter : function(params) {
                        var checkResult, checkProc, errorMessage;
                        try {
                            checkProc = new lib.Procedure(
                                    lib.constants.SCHEMA_NAME,
                                    'sap.tm.trp.db.pipeline::p_virtual_kpi_plan_save_check');

                            checkResult = checkProc(params.id,
                                    params.obj.RESOURCE_FILTER_ID,
                                    params.obj.TIME_FILTER_ID,
                                    params.obj.LOCATION_FILTER_ID,
                                    params.obj.ALERT_RULE_GROUP_ID,
                                    params.obj.VISIBILITY, params.obj.SUB_PLANS);

                            if (checkResult.CODE_LIST.length > 0) {
                                if (checkResult.MSG === 'VISIBILITY_CHECK_FAILED_ITEM') {
                                    errorMessage = lib.messages.MSG_VISIBILITY_CHECK_FAILED_ITEM;
                                } else {
                                    errorMessage = lib.messages.MSG_VISIBILITY_CHECK_FAILED_USED_LIST;
                                }
                                lib.logger.error(errorMessage,
                                        checkResult.CODE_LIST, params.id);
                                throw new xslib.InternalError(errorMessage,
                                        checkResult.CODE_LIST);
                            }

                        } catch (e) {
                            if (e instanceof xslib.WebApplicationError) {
                                throw e;
                            }
                            lib.logger.error("VISIBILITY_CHECK_FAILED", e,
                                    params.id);
                            throw new xslib.InternalError(
                                    lib.messages.MSG_VISIBILITY_CHECK_FAILED, e);
                        }

                        return true;
                    },
                    only : [ "create", "update" ]
                } ]);

plan.setRoutes([ {
    method : $.net.http.GET,
    scope : "collection",
    action : "availablePlans",
    response : $.net.http.OK
}, {
    method : $.net.http.POST,
    scope : "collection",
    action : "checkSubPlan",
    response : $.net.http.OK
}, {
    method : $.net.http.POST,
    scope : "member",
    action : "exec",
    response : $.net.http.OK
}, {
    method : $.net.http.GET,
    scope : "member",
    action : "virtualPlanInfo",
    response : $.net.http.OK
}, {
    method : $.net.http.GET,
    scope : "member",
    action : "kpiByLocation",
    response : $.net.http.OK
}, {
    method : $.net.http.GET,
    scope : "member",
    action : "kpiByResource",
    response : $.net.http.OK
}, {
    method : $.net.http.GET,
    scope : "member",
    action : "locationKpi",
    response : $.net.http.OK
}, {
    method : $.net.http.GET,
    scope : "member",
    action : "resourceKpi",
    response : $.net.http.OK
}, {
    method : $.net.http.GET,
    scope : "member",
    action : "kpiChartByLocation",
    response : $.net.http.OK
}, {
    method : $.net.http.GET,
    scope : "member",
    action : "kpiChartByResource",
    response : $.net.http.OK
}, {
    method : $.net.http.GET,
    scope : "member",
    action : "locations",
    response : $.net.http.OK
}, {
    method : $.net.http.GET,
    scope : "member",
    action : "alertsOnMap",
    response : $.net.http.OK
}, {
    method : $.net.http.GET,
    scope : "member",
    action : "bubbleOnMap",
    response : $.net.http.OK
}, {
    method : $.net.http.GET,
    scope : "member",
    action : "pieOnMap",
    response : $.net.http.OK
} ]);

plan.handle();