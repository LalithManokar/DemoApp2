var model = $.import("/sap/tm/trp/service/model/templatePlans.xsjslib");
var lib = $.import("/sap/tm/trp/service/plan/plan.xsjslib");
var xslib = lib.xslib;
var plan = lib.plan;
var TEMPLATE_PLAN_TYPE = lib.constants.PLAN_TYPE.TEMPLATE;
var constants = lib.constants;

plan.setModel(model.Plans);

plan.create = function(params) {
    try {
        var createPlanProc, procName, createResult;
        procName = lib.constants.SP_PKG_PIPELINE + "::p_template_plan_create";
        createPlanProc = new lib.Procedure(lib.constants.SCHEMA_NAME, procName);
        createResult = createPlanProc(params.obj.NAME,
                params.obj.RESOURCE_FILTER_ID, params.obj.TIME_FILTER_ID,
                params.obj.LOCATION_FILTER_ID, params.obj.CALCULATION_MODEL_ID,
                TEMPLATE_PLAN_TYPE, params.obj.DESC, params.obj.VISIBILITY,
                params.obj.ALERT_RULE_GROUP_ID, params.obj.ATTRIBUTE_GROUP_ID,
                params.obj.RESOURCE_CATEGORY, params.obj.USAGE, params.obj.USAGE_CODE);
        lib.logger.success("TEMPLATE_PLAN_CREATE", params.obj.NAME,
                params.obj.RESOURCE_FILTER_ID.toString(),
                params.obj.TIME_FILTER_ID.toString(),
                params.obj.LOCATION_FILTER_ID.toString(),
                params.obj.CALCULATION_MODEL_ID.toString(),
                params.obj.ALERT_RULE_GROUP_ID.toString(),
                params.obj.ATTRIBUTE_GROUP_ID.toString(),
                params.obj.RESOURCE_CATEGORY.toString(),
                params.obj.USAGE.toString(),
                params.obj.USAGE_CODE.toString());
        return {
            ID : createResult.PLAN_MODEL_ID
        };
    } catch (e) {
        lib.logger.error("TEMPLATE_PLAN_CREATE_FAILED", params.obj.NAME,
                params.obj.RESOURCE_FILTER_ID.toString(),
                params.obj.TIME_FILTER_ID.toString(),
                params.obj.LOCATION_FILTER_ID.toString(),
                params.obj.CALCULATION_MODEL_ID.toString(),
                params.obj.ALERT_RULE_GROUP_ID.toString(),
                params.obj.ATTRIBUTE_GROUP_ID.toString(),
                params.obj.RESOURCE_CATEGORY.toString(), 
                params.obj.USAGE.toString(),params.obj.USAGE_CODE.toString(), e);
        throw new xslib.InternalError(lib.messages.MSG_ERROR_CREATE_PLAN_MODEL,
                e);
    }
};

plan.update = function(params) {
    var updatePlanProc, procName;
    try {
        procName = lib.constants.SP_PKG_PIPELINE + "::p_template_plan_update";
        updatePlanProc = new lib.Procedure(lib.constants.SCHEMA_NAME, procName);
        updatePlanProc(params.id, params.obj.NAME,
                params.obj.RESOURCE_FILTER_ID, params.obj.TIME_FILTER_ID,
                params.obj.LOCATION_FILTER_ID, params.obj.CALCULATION_MODEL_ID,
                TEMPLATE_PLAN_TYPE, params.obj.DESC, params.obj.VISIBILITY,
                params.obj.ALERT_RULE_GROUP_ID, params.obj.ATTRIBUTE_GROUP_ID,
                params.obj.USAGE, params.obj.USAGE_CODE);
        lib.logger.success("TEMPLATE_PLAN_UPDATE", params.id, params.obj.NAME
                .toString(), params.obj.RESOURCE_FILTER_ID.toString(),
                params.obj.TIME_FILTER_ID.toString(),
                params.obj.LOCATION_FILTER_ID.toString(),
                params.obj.CALCULATION_MODEL_ID.toString(),
                params.obj.ALERT_RULE_GROUP_ID.toString(),
                params.obj.ATTRIBUTE_GROUP_ID.toString(),
                params.obj.USAGE.toString(),
                params.obj.USAGE_CODE.toString());
    } catch (e) {
        lib.logger.error("TEMPLATE_PLAN_UPDATE_FAILED", params.id,
                params.obj.NAME, params.obj.RESOURCE_FILTER_ID.toString(),
                params.obj.TIME_FILTER_ID.toString(),
                params.obj.LOCATION_FILTER_ID.toString(),
                params.obj.CALCULATION_MODEL_ID.toString(),
                params.obj.ALERT_RULE_GROUP_ID.toString(),
                params.obj.ATTRIBUTE_GROUP_ID.toString(),
                params.obj.USAGE.toString(),params.obj.USAGE_CODE.toString(), e);
        throw new xslib.InternalError(lib.messages.MSG_ERROR_UPDATE_PLAN_MODEL,
                e);
    }
};

plan.destroy = function(params) {
    try {
        var destroyPlanProc, procName;
        procName = lib.constants.SP_PKG_PIPELINE + "::p_template_plan_delete";
        destroyPlanProc = new lib.Procedure(lib.constants.SCHEMA_NAME, procName);
        destroyPlanProc(params.id);
        lib.logger.success("TEMPLATE_PLAN_DELETE", params.id);
    } catch (e) {
        lib.logger.error("TEMPLATE_PLAN_DELETE_FAILED", params.id, e);
        throw new xslib.InternalError(lib.messages.MSG_ERROR_DELETE_PLAN_MODEL,
                e);
    }
};

plan.toSchedule = function(params) {
    var conn;
    var execWorkHour, startWorkingHourTime, endWorkingHourTime;
    
    if(params.obj.SCHEDULE.hasOwnProperty("EXECUTE_WORKING_HOUR")){
        execWorkHour = params.obj.SCHEDULE.EXECUTE_WORKING_HOUR;
    }
    
    if(params.obj.SCHEDULE.hasOwnProperty("START_WORKING_HOUR_TIME")){
        startWorkingHourTime = params.obj.SCHEDULE.START_WORKING_HOUR_TIME;
    }
    
    if(params.obj.SCHEDULE.hasOwnProperty("END_WORKING_HOUR_TIME")){
        endWorkingHourTime = params.obj.SCHEDULE.END_WORKING_HOUR_TIME;
    }
    
    try {
        conn = $.db.getConnection();
        var procName = lib.constants.SP_PKG_PIPELINE
                + "::p_template_plan_to_schedule_plan";
        var toSchedulePlanProc = new lib.Procedure(lib.constants.SCHEMA_NAME,
                procName, {
                    connection : conn
                });
        toSchedulePlanProc(params.id);

        var createScheduleProc = new lib.Procedure(lib.constants.SCHEMA_NAME,
                "sap.tm.trp.db.job::p_create_model_schedule_detail", {
                    connection : conn
                });

        createScheduleProc(params.id, params.obj.SCHEDULE.START_TIME,
                params.obj.SCHEDULE.EXPIRY_TIME,
                params.obj.SCHEDULE.RECURRENCE_TYPE,
                params.obj.SCHEDULE.RECURRENCE_INTERVAL,
                params.obj.SCHEDULE.RECURRENCE_DAY,
                lib.SCHEDULE_TYPE,
                execWorkHour,
                startWorkingHourTime,
                endWorkingHourTime);

        var parameters = {
            xsJob : lib.xsJob,
            scheduleType : lib.SCHEDULE_TYPE,
            startTime : params.obj.SCHEDULE.START_TIME,
            expiryTime : params.obj.SCHEDULE.EXPIRY_TIME,
            recurrence : {
                TYPE : params.obj.SCHEDULE.RECURRENCE_TYPE,
                INTERVAL : params.obj.SCHEDULE.RECURRENCE_INTERVAL,
                DAY : params.obj.SCHEDULE.RECURRENCE_DAY
            },
            execWorkHour: execWorkHour,
            startWorkHour: startWorkingHourTime,
            endWorkHour: endWorkingHourTime,
            modelId : params.id,
            connSqlcc : lib.connSqlcc,
            jobSqlcc : lib.jobSqlcc
        };

        var job = new lib.jobManager.Job(parameters);
        var schedule = new job.schedule();
        schedule.create();

        conn.commit();

        lib.logger.success("TEMPLATE_PLAN_TRANSFER", params.id,
                params.obj.SCHEDULE.RECURRENCE_TYPE.toString(),
                params.obj.SCHEDULE.RECURRENCE_INTERVAL.toString(),
                params.obj.SCHEDULE.START_TIME.toString(),
                params.obj.SCHEDULE.EXPIRY_TIME.toString());

        return {
            ID : params.id
        };
    } catch (e) {
        conn.rollback();

        lib.logger.error("TEMPLATE_PLAN_TRANSFER_FAILED", params.id,
                params.obj.SCHEDULE.RECURRENCE_TYPE.toString(),
                params.obj.SCHEDULE.RECURRENCE_INTERVAL.toString(),
                params.obj.SCHEDULE.START_TIME.toString(),
                params.obj.SCHEDULE.EXPIRY_TIME.toString(), e);

        throw new xslib.InternalError(
                lib.messages.MSG_ERROR_TEMPLATE_PLAN_TO_SCHEDULE_PLAN, e);
    } finally {
        if (conn) {
            conn.close();
        }
    }
};

plan.exec = function(params) {
    try {
        return lib.executor.execute(null, params.obj.RESOURCE_FILTER_ID,
                params.obj.TIME_FILTER_ID, params.obj.LOCATION_FILTER_ID,
                params.obj.CALCULATION_MODEL_ID,
                params.obj.ALERT_RULE_GROUP_ID, params.obj.ATTRIBUTE_GROUP_ID, params.obj.USAGE);
    } catch (e) {
        if (e instanceof xslib.WebApplicationError) {
            throw e;
        }
        throw new xslib.InternalError(
                lib.messages.MSG_ERROR_EXECUTE_PLAN_MODEL, e);
    }
};

plan.supplyDemandByLocation = function(params) {
    try {
        var result;
        if (params.obj.resourceType === 'all_types') {
            result = lib.getSupplyDemandExecutionResultByLocation( 
            		params.id,params.obj.timezone,params.obj.execId, params.obj.nodeId, params.obj.locations);
        } else {
            result = lib.getSupplyDemandExecutionResultByLocationOfResource(
                    params.obj.execId, params.obj.nodeId, params.obj.locations,
                    params.obj.resourceType);
        }
        return lib.reviseSDArraylib.reviseArraySD(result, false);
    } catch (e) {
        if (e instanceof xslib.WebApplicationError) {
            throw e;
        }
        throw new xslib.InternalError(lib.messages.MSG_ERROR_GET_PLAN_RESULTS,
                e);
    }
};

plan.supplyDemandByResource = function(params) {
    try {
        var result;
        result = lib.getSupplyDemandExecutionResultByResource(
                null,params.obj.timezone,params.obj.execId, params.obj.nodeId, params.obj.locations);
        return lib.reviseSDArraylib.reviseArraySD(result, true);
    } catch (e) {
        if (e instanceof xslib.WebApplicationError) {
            throw e;
        }
        throw new xslib.InternalError(lib.messages.MSG_ERROR_GET_PLAN_RESULTS,
                e);
    }
};

plan.locationSupplyDemand = function(params) {
    try {
        var result;
        result = lib.getLocationSupplyDemandExecutionResult(null,params.obj.timezone,params.obj.execId,
                params.obj.nodeId, params.obj.locations);
        return lib.reviseSDArraylib.reviseArraySD(result, true);
    } catch (e) {
        if (e instanceof xslib.WebApplicationError) {
            throw e;
        }
        throw new xslib.InternalError(lib.messages.MSG_ERROR_GET_PLAN_RESULTS,
                e);
    }
};

plan.resourceSupplyDemand = function(params) {
    try {
        var result;
        result = lib.getResourceSupplyDemandExecutionResult(null,params.obj.timezone,params.obj.execId,
                params.obj.nodeId, params.obj.resourceTypeCode,
                params.obj.locations);
        return lib.reviseSDArraylib.reviseArraySD(result, false);
    } catch (e) {
        if (e instanceof xslib.WebApplicationError) {
            throw e;
        }
        throw new xslib.InternalError(lib.messages.MSG_ERROR_GET_PLAN_RESULTS,
                e);
    }
};

plan.locations = function(params) {
    try {
        return lib
                .getFilters(null,null,params.obj.execId, params.obj.nodeId);
    } catch (e) {
        if (e instanceof xslib.WebApplicationError) {
            throw e;
        }
        throw new xslib.InternalError(lib.messages.MSG_ERROR_GET_LOCATIONS, e);
    }
};

plan.detailsByLocation = function(params) {
    try {
        var obj = params.obj;
        return lib.getExecutionSupplyDemandDetailsByLocation(obj.execId,
                obj.nodeId, obj.type, obj.geoId, obj.resourceTypeCode,
                obj.startTime, obj.outputKeys);
    } catch (e) {
        if (e instanceof xslib.WebApplicationError) {
            throw e;
        }
        throw new xslib.InternalError(lib.messages.MSG_ERROR_GET_DETAILS, e);
    }
};

plan.detailsByResource = function(params) {
    try {
        var obj = params.obj;
        return lib.getExecutionSupplyDemandDetailsByResource(null,params.obj.timezone,obj.execId,
                obj.nodeId, obj.type, obj.resourceTypeCode, obj.locations,
                obj.startTime, obj.outputKeys);
    } catch (e) {
        if (e instanceof xslib.WebApplicationError) {
            throw e;
        }
        throw new xslib.InternalError(lib.messages.MSG_ERROR_GET_DETAILS, e);
    }
};

plan.allDetailsByLocation = function(params) {
    try {
        var obj = params.obj;
        var result = lib.getAllExecutionSupplyDemandDetailsByLocation(
                obj.execId, obj.nodeId, obj.locations);
        return lib.reviseSDArraylib.reviseArraySDAllDetails(result, false,
                obj.nodeId);
    } catch (e) {
        if (e instanceof xslib.WebApplicationError) {
            throw e;
        }
        throw new xslib.InternalError(lib.messages.MSG_ERROR_GET_DETAILS, e);
    }
};

plan.allDetailsByResource = function(params) {
    try {
        var obj = params.obj;
        var result = lib.getAllExecutionSupplyDemandDetailsByResource(
                obj.execId, obj.nodeId, obj.locations);
        return lib.reviseSDArraylib.reviseArraySDAllDetails(result, true,
                obj.nodeId);
    } catch (e) {
        if (e instanceof xslib.WebApplicationError) {
            throw e;
        }
        throw new xslib.InternalError(lib.messages.MSG_ERROR_GET_DETAILS, e);
    }
};

plan.allDetailsExpandByLocation = function(params) {
    try {
        var obj = params.obj;
        var result = lib.getAllExecutionSupplyDemandDetailsExpandByLocation(
                obj.execId, obj.nodeId, obj.locations);
        return lib.reviseSDArraylib.reviseArraySDAllDetails(result, true,
                obj.nodeId);
    } catch (e) {
        if (e instanceof xslib.WebApplicationError) {
            throw e;
        }
        throw new xslib.InternalError(lib.messages.MSG_ERROR_GET_DETAILS, e);
    }
};

plan.allDetailsExpandByResource = function(params) {
    try {
        var obj = params.obj;
        var result = lib.getAllExecutionSupplyDemandDetailsExpandByResource(
                obj.execId, obj.nodeId, obj.resourceTypeCode, obj.locations);
        return lib.reviseSDArraylib.reviseArraySDAllDetails(result, false,
                obj.nodeId);
    } catch (e) {
        if (e instanceof xslib.WebApplicationError) {
            throw e;
        }
        throw new xslib.InternalError(lib.messages.MSG_ERROR_GET_DETAILS, e);
    }
};

plan.alertsOnMap = function(params) {
    try {
        var obj = params.obj, alertsOnMap;
        if(obj.resourceType === 'all_types'){
            alertsOnMap = lib.getAlertOnMapByExecId(obj.execId, obj.nodeId, obj.startTime,
                obj.polygon);
        } else {
            alertsOnMap = lib.getAlertOnMapByResourceType(obj.execId, obj.nodeId, obj.startTime,
                    obj.polygon, obj.resourceType);
        }
        return alertsOnMap;
    } catch (e) {
        if (e instanceof xslib.WebApplicationError) {
            throw e;
        }
        throw new xslib.InternalError(lib.messages.MSG_ERROR_ALERTS_ON_MAP, e);
    }
};

plan.bubbleOnMap = function(params) {
    try {
        var obj = params.obj, bubbleOnMap;
        if(obj.resourceType === 'all_types'){
            bubbleOnMap = lib.getBubbleOnMapByExecId(obj.execId, obj.nodeId,
                obj.startTime, obj.polygon);
        } else{
            bubbleOnMap = lib.getBubbleOnMapByResourceType(obj.execId, obj.nodeId,
                    obj.startTime, obj.polygon, obj.resourceType);
        }
        return bubbleOnMap;
    } catch (e) {
        if (e instanceof xslib.WebApplicationError) {
            throw e;
        }
        throw new xslib.InternalError(lib.messages.MSG_ERROR_BUBBLE_ON_MAP, e);
    }
};

plan.pieOnMap = function(params) {
    try {
        var obj = params.obj, pieOnMap;
        if (obj.resourceType === 'all_types') {
            pieOnMap = lib.getPieOnMapByExecId(obj.execId, obj.nodeId,
                    obj.startTime, obj.polygon);
        } else {
            pieOnMap = lib.getPieOnMapByResourceType(obj.execId, obj.nodeId,
                    obj.startTime, obj.polygon, obj.resourceType);
        }
        return pieOnMap;
    } catch (e) {
        if (e instanceof xslib.WebApplicationError) {
            throw e;
        }
        throw new xslib.InternalError(lib.messages.MSG_ERROR_PIE_ON_MAP, e);
    }
};

plan.download = function(params) {
    try {
        // get the csv result
        var result = lib.getDownloadCSVArray(params.obj.downloadType,
                null, params.obj.execId, params.obj.timezone, params.obj.nodeId, params.obj.locations);
        // format the array according to the csv
        var reviseResult = lib.reviseCsvFormat(result.CSVARRAY, params.obj.downloadType);
        // Export as CSV
        lib.zipperCSV(result.CSVNAME, reviseResult.formatArray,
                reviseResult.columnArray);
    } catch (e) {
        throw new xslib.InternalError(
                lib.messages.MSG_ERROR_SUPPLY_DEMAND_DOWNLOAD, e);
    }
};

plan
        .setFilters([
                {
                    filter : function() {
                        var privilege = "sap.tm.trp.service::CreateTemplatePlan";

                        if (!$.session.hasAppPrivilege(privilege)) {
                            lib.logger.error("PLAN_CREATE_AUTHORIZE_FAILED",
                                    privilege);

                            throw new xslib.NotAuthorizedError(privilege);
                        }
                        return true;
                    },
                    only : [ "create" ]
                },
                {
                    filter : function() {
                        var privilege = "sap.tm.trp.service::UpdateTemplatePlan";

                        if (!$.session.hasAppPrivilege(privilege)) {
                            lib.logger.error("PLAN_UPDATE_AUTHORIZE_FAILED",
                                    privilege);

                            throw new xslib.NotAuthorizedError(privilege);
                        }

                        return true;
                    },
                    only : [ "update" ]
                },
                {
                    filter : function(params) {
                        var usageCode = params.obj.USAGE_CODE;
                        var privilege = "sap.tm.trp.service::ExecuteTemplatePlan";
                        var privilege_earu = "sap.tm.trp.service::ExecuteScheduledPlan_Eac_Ruleset";
                        var privilege_gene = "sap.tm.trp.service::ExecuteScheduledPlan_Gen_SDPlan";

                        if (!$.session.hasAppPrivilege(privilege)) {
                            if(usageCode === "EARU" && $.session.hasAppPrivilege(privilege_earu)) {
                                return true;
                            } else if (usageCode === "GENE" && $.session.hasAppPrivilege(privilege_gene)) {
                                return true;
                            } else {
                                lib.logger.error("PLAN_EXECUTE_AUTHORIZE_FAILED",
                                    privilege);

                                throw new xslib.NotAuthorizedError(privilege);
                            }
                        }
                        return true;
                    },
                    only : [ "exec" ]
                },
                {
                    filter : function() {
                        var privilege = "sap.tm.trp.service::DeleteTemplatePlan";

                        if (!$.session.hasAppPrivilege(privilege)) {
                            lib.logger.error("PLAN_DELETE_AUTHORIZE_FAILED",
                                    privilege);

                            throw new xslib.NotAuthorizedError(privilege);
                        }

                        return true;
                    },
                    only : [ "destroy" ]
                },
                {
                    filter : function(params) {
                        try {
                            var obj = params.obj;

                            lib.geoCheck.authorizeReadByExecutionIdList([ {
                                ID : obj.execId
                            } ]);

                            return true;
                        } catch (e) {
                            lib.logger.error("PLAN_AUTHORIZE_FAILED", e);
                            throw e;
                        }
                    },
                    only : [ "supplyDemandByLocation",
                            "supplyDemandByResource", "locationSupplyDemand",
                            "resourceSupplyDemand", "detailsByLocation",
                            "detailsByResource", "alertsOnMap", "bubbleOnMap",
                            "pieOnMap", "locations", "allDetailsByLocation",
                            "allDetailsByResource",
                            "allDetailsExpandByLocation ",
                            "allDetailsExpandByResource" ]
                },
                {
                    filter : function(params) {
                        var checkResult, checkProc, errorMessage;
                        try {
                            checkProc = new lib.Procedure(
                                    lib.constants.SCHEMA_NAME,
                                    'sap.tm.trp.db.pipeline::p_template_plan_save_check');
                            checkResult = checkProc(params.id,
                                    params.obj.RESOURCE_FILTER_ID,
                                    params.obj.TIME_FILTER_ID,
                                    params.obj.LOCATION_FILTER_ID,
                                    params.obj.ALERT_RULE_GROUP_ID,
                                    params.obj.VISIBILITY,
                                    params.obj.ATTRIBUTE_GROUP_ID);
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
                },
                {
                    filter : function(params) {
                        return lib.checkPipelineByAttrGroup(
                                params.obj.ATTRIBUTE_GROUP_ID,
                                params.obj.CALCULATION_MODEL_ID);
                    },
                    only : [ "create", "update", "exec" ]
                } ]);

plan.setRoutes([ {
    method : $.net.http.POST,
    scope : "member",
    action : "exec",
    response : $.net.http.OK
}, {
    method : $.net.http.POST,
    scope : "collection",
    action : "exec",
    response : $.net.http.OK
}, {
    method : $.net.http.GET,
    scope : "member",
    action : "supplyDemandByLocation",
    response : $.net.http.OK
}, {
    method : $.net.http.GET,
    scope : "collection",
    action : "supplyDemandByLocation",
    response : $.net.http.OK
}, {
    method : $.net.http.GET,
    scope : "member",
    action : "supplyDemandByResource",
    response : $.net.http.OK
}, {
    method : $.net.http.GET,
    scope : "collection",
    action : "supplyDemandByResource",
    response : $.net.http.OK
}, {
    method : $.net.http.GET,
    scope : "member",
    action : "locationSupplyDemand",
    response : $.net.http.OK
}, {
    method : $.net.http.GET,
    scope : "collection",
    action : "locationSupplyDemand",
    response : $.net.http.OK
}, {
    method : $.net.http.GET,
    scope : "member",
    action : "resourceSupplyDemand",
    response : $.net.http.OK
}, {
    method : $.net.http.GET,
    scope : "collection",
    action : "resourceSupplyDemand",
    response : $.net.http.OK
}, {
    method : $.net.http.GET,
    scope : "member",
    action : "alertsOnMap",
    response : $.net.http.OK
}, {
    method : $.net.http.GET,
    scope : "collection",
    action : "alertsOnMap",
    response : $.net.http.OK
}, {
    method : $.net.http.GET,
    scope : "member",
    action : "bubbleOnMap",
    response : $.net.http.OK
}, {
    method : $.net.http.GET,
    scope : "collection",
    action : "bubbleOnMap",
    response : $.net.http.OK
}, {
    method : $.net.http.GET,
    scope : "member",
    action : "pieOnMap",
    response : $.net.http.OK
}, {
    method : $.net.http.GET,
    scope : "collection",
    action : "pieOnMap",
    response : $.net.http.OK
}, {
    method : $.net.http.GET,
    scope : "member",
    action : "detailsByLocation",
    response : $.net.http.OK
}, {
    method : $.net.http.GET,
    scope : "collection",
    action : "detailsByLocation",
    response : $.net.http.OK
}, {
    method : $.net.http.GET,
    scope : "member",
    action : "detailsByResource",
    response : $.net.http.OK
}, {
    method : $.net.http.GET,
    scope : "collection",
    action : "detailsByResource",
    response : $.net.http.OK
}, {
    method : $.net.http.GET,
    scope : "member",
    action : "locations",
    response : $.net.http.OK
}, {
    method : $.net.http.GET,
    scope : "collection",
    action : "locations",
    response : $.net.http.OK
}, {
    method : $.net.http.PUT,
    scope : "member",
    action : "toSchedule",
    response : $.net.http.NO_CONTENT
}, {
    method : $.net.http.GET,
    scope : "member",
    action : "allDetailsByLocation",
    response : $.net.http.OK
}, {
    method : $.net.http.GET,
    scope : "member",
    action : "allDetailsByResource",
    response : $.net.http.OK
}, {
    method : $.net.http.GET,
    scope : "member",
    action : "allDetailsExpandByLocation",
    response : $.net.http.OK
}, {
    method : $.net.http.GET,
    scope : "member",
    action : "allDetailsExpandByResource",
    response : $.net.http.OK
}, {
    method : $.net.http.PUT,
    scope : "member",
    action : "toSchedule",
    response : $.net.http.NO_CONTENT
}, {
    method : $.net.http.GET,
    scope : "collection",
    action : "allDetailsByLocation",
    response : $.net.http.OK
}, {
    method : $.net.http.GET,
    scope : "collection",
    action : "allDetailsByResource",
    response : $.net.http.OK
}, {
    method : $.net.http.GET,
    scope : "collection",
    action : "allDetailsExpandByLocation",
    response : $.net.http.OK
}, {
    method : $.net.http.GET,
    scope : "collection",
    action : "allDetailsExpandByResource",
    response : $.net.http.OK
}, {
    method : $.net.http.GET,
    scope : "member",
    action : "download",
    response : $.net.http.OK
}, {
    method : $.net.http.GET,
    scope : "collection",
    action : "download",
    response : $.net.http.OK
} ]);

plan.handle();
