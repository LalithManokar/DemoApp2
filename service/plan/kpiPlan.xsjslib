var model = $.import("/sap/tm/trp/service/model/kpiPlans.xsjslib");
var lib = $.import("/sap/tm/trp/service/plan/plan.xsjslib");
var utils = $.import("sap.tm.trp.service.xslib", "utils");
var timeFormatHelper = $.import("sap.tm.trp.service.xslib", "timeFormatHelper");
var xslib = lib.xslib;
var plan = lib.plan;
var KPI_PLAN_TYPE = lib.constants.PLAN_TYPE.PERSISTED_KPI;
var executor = $.import("/sap/tm/trp/service/xslib/pipelineExecutor.xsjslib");

plan.setModel(model.Plans);

plan.create = function(params) {
    try {

        var timezone,start_time,expiry_time;

        if(params.obj.SCHEDULE.hasOwnProperty("TIMEZONES")){
            timezone = params.obj.SCHEDULE.TIMEZONES;
        }else{
            timezone = null;
        }

        if(params.obj.SCHEDULE.hasOwnProperty("START_TIME") && timezone){
            start_time = utils.localToUtcByHana(params.obj.SCHEDULE.START_TIME,timezone);
        }

        if(params.obj.SCHEDULE.hasOwnProperty("EXPIRY_TIME") && timezone){
            expiry_time = utils.localToUtcByHana(params.obj.SCHEDULE.EXPIRY_TIME,timezone);
        }

        var procName = lib.constants.SP_PKG_PIPELINE + "::p_kpi_plan_create";
        var createPlanProc = new lib.Procedure(lib.constants.SCHEMA_NAME,
                procName);

        var createResult = createPlanProc(params.obj.NAME,
                params.obj.RESOURCE_FILTER_ID, params.obj.TIME_FILTER_ID,
                params.obj.LOCATION_FILTER_ID, params.obj.CALCULATION_MODEL_ID,
                KPI_PLAN_TYPE, params.obj.DESC, params.obj.VISIBILITY,
                params.obj.ALERT_RULE_GROUP_ID, params.obj.ATTRIBUTE_GROUP_ID,
                params.obj.RESOURCE_CATEGORY, params.obj.USAGE_CODE);

        if (createResult.MESSAGE !== 'MSG_SUCCESS_STATUS') {
            throw new xslib.InternalError(createResult.MESSAGE);
        }

        var createScheduleProc = new lib.Procedure(lib.constants.SCHEMA_NAME,
                "sap.tm.trp.db.job::p_create_model_schedule_detail");

        createScheduleProc(createResult.PLAN_MODEL_ID,
                start_time,
                expiry_time,
                params.obj.SCHEDULE.RECURRENCE_TYPE,
                params.obj.SCHEDULE.RECURRENCE_INTERVAL,
                params.obj.SCHEDULE.RECURRENCE_DAY,
                lib.SCHEDULE_TYPE,
                params.obj.SCHEDULE.EXECUTE_WORKING_HOUR,
                start_time,
                expiry_time,
                params.obj.SCHEDULE.TIMEZONES);

        var parameters = {
            xsJob : lib.xsJob,
            scheduleType : lib.SCHEDULE_TYPE,
            startTime : start_time,
            expiryTime : expiry_time,
            recurrence : {
                TYPE : params.obj.SCHEDULE.RECURRENCE_TYPE,
                INTERVAL : params.obj.SCHEDULE.RECURRENCE_INTERVAL,
                DAY : params.obj.SCHEDULE.RECURRENCE_DAY
            },
            timezones : params.obj.SCHEDULE.TIMEZONES,
            modelId : createResult.PLAN_MODEL_ID,
            connSqlcc : lib.connSqlcc,
            jobSqlcc : lib.jobSqlcc
        };

        var job = new lib.jobManager.Job(parameters);
        var schedule = new job.schedule();
        schedule.create();

        lib.logger.success("KPI_PLAN_CREATE", createResult.PLAN_MODEL_ID,
                params.obj.NAME,
                params.obj.SCHEDULE.RECURRENCE_TYPE,
                params.obj.SCHEDULE.RECURRENCE_INTERVAL,
                start_time,
                expiry_time,
                params.obj.RESOURCE_CATEGORY, params.obj.USAGE_CODE);

        return {
            ID : createResult.PLAN_MODEL_ID
        };
    } catch (e) {
        lib.logger.error("KPI_PLAN_CREATE_FAILED", params.obj.NAME,
                params.obj.SCHEDULE.RECURRENCE_TYPE,
                params.obj.SCHEDULE.RECURRENCE_INTERVAL,
                start_time,
                expiry_time,
                params.obj.RESOURCE_CATEGORY, params.obj.USAGE_CODE, e);
        if (e instanceof xslib.WebApplicationError) {
            throw e;
        }
        throw new xslib.InternalError(lib.messages.MSG_ERROR_CREATE_PLAN_MODEL,
                e);
    }
};

plan.update = function(params) {
    try {

        var timezone,start_time,expiry_time;

        if(params.obj.SCHEDULE.hasOwnProperty("TIMEZONES")){
            timezone = params.obj.SCHEDULE.TIMEZONES;
        }else{
            timezone = null;
        }

        if(params.obj.SCHEDULE.hasOwnProperty("START_TIME") && timezone){
            start_time = utils.localToUtcByHana(params.obj.SCHEDULE.START_TIME,timezone);
        }

        if(params.obj.SCHEDULE.hasOwnProperty("EXPIRY_TIME") && timezone){
            expiry_time = utils.localToUtcByHana(params.obj.SCHEDULE.EXPIRY_TIME,timezone);
        }

        var updatePlanProc = new lib.Procedure(lib.constants.SCHEMA_NAME,
                lib.constants.SP_PKG_PIPELINE + "::p_kpi_plan_update");

        var updateMessage = updatePlanProc(params.id, params.obj.NAME,
                params.obj.RESOURCE_FILTER_ID, params.obj.TIME_FILTER_ID,
                params.obj.LOCATION_FILTER_ID, params.obj.CALCULATION_MODEL_ID,
                KPI_PLAN_TYPE, params.obj.DESC, params.obj.VISIBILITY,
                params.obj.ALERT_RULE_GROUP_ID, params.obj.ATTRIBUTE_GROUP_ID, params.obj.USAGE_CODE,
                start_time,
                expiry_time,
                params.obj.SCHEDULE.RECURRENCE_TYPE,
                params.obj.SCHEDULE.RECURRENCE_INTERVAL,
                params.obj.SCHEDULE.RECURRENCE_DAY,
                timezone,
                lib.SCHEDULE_TYPE);

        if (updateMessage.MESSAGE !== 'MSG_SUCCESS_STATUS') {
            throw new xslib.InternalError(updateMessage.MESSAGE);
        }

        var updateScheduleProc = new lib.Procedure(lib.constants.SCHEMA_NAME,
                "sap.tm.trp.db.job::p_update_model_schedule_detail");

        updateScheduleProc(params.id,
                start_time,
                expiry_time,
                params.obj.SCHEDULE.RECURRENCE_TYPE,
                params.obj.SCHEDULE.RECURRENCE_INTERVAL,
                params.obj.SCHEDULE.RECURRENCE_DAY,
                lib.SCHEDULE_TYPE,
                params.obj.SCHEDULE.EXECUTE_WORKING_HOUR,
                start_time,
                expiry_time,
                params.obj.SCHEDULE.TIMEZONES);

        var parameters = {
            xsJob : lib.xsJob,
            scheduleType : lib.SCHEDULE_TYPE,
            startTime : start_time,
            expiryTime : expiry_time,
            recurrence : {
                TYPE : params.obj.SCHEDULE.RECURRENCE_TYPE,
                INTERVAL : params.obj.SCHEDULE.RECURRENCE_INTERVAL,
                DAY : params.obj.SCHEDULE.RECURRENCE_DAY
            },
            timezones : params.obj.SCHEDULE.TIMEZONES,
            modelId : params.id,
            connSqlcc : lib.connSqlcc,
            jobSqlcc : lib.jobSqlcc
        };
        var job = new lib.jobManager.Job(parameters);
        var schedule = new job.schedule();

        schedule.update();

        lib.logger.success("KPI_PLAN_UPDATE", params.id,
                params.obj.SCHEDULE.RECURRENCE_TYPE,
                params.obj.SCHEDULE.RECURRENCE_INTERVAL,
                start_time,
                expiry_time);
    } catch (e) {
        lib.logger.error("KPI_PLAN_UPDATE_FAILED", params.id,
                params.obj.SCHEDULE.RECURRENCE_TYPE,
                params.obj.SCHEDULE.RECURRENCE_INTERVAL,
                start_time,
                expiry_time, e);
        if (e instanceof xslib.WebApplicationError) {
            throw e;
        }
        throw new xslib.InternalError(lib.messages.MSG_ERROR_UPDATE_PLAN_MODEL,
                e);
    }
};

plan.destroy = function(params) {
    try {
        var procName = lib.constants.SP_PKG_PIPELINE + "::p_kpi_plan_delete";
        var destroyPlanProc = new lib.Procedure(lib.constants.SCHEMA_NAME,
                procName);

        destroyPlanProc(params.id);

        var cancelScheduleProc = new lib.Procedure(lib.constants.SCHEMA_NAME,
                "sap.tm.trp.db.job::p_cancel_model_schedule_detail");

        cancelScheduleProc(params.id, lib.SCHEDULE_TYPE);
        var parameters = {
            xsJob : lib.xsJob,
            scheduleType : lib.SCHEDULE_TYPE,
            modelId : params.id,
            connSqlcc : lib.connSqlcc,
            jobSqlcc : lib.jobSqlcc,
            uri : lib.uri,
            functionName : lib.functionName
        };
        var job = new lib.jobManager.Job(parameters);
        var schedule = new job.schedule();

        schedule.cancel();
        lib.logger.success("KPI_PLAN_DELETE", params.id);
    } catch (e) {
        lib.logger.error("KPI_PLAN_DELETE_FAILED", params.id, e);

        throw new xslib.InternalError(lib.messages.MSG_ERROR_DELETE_PLAN_MODEL,
                e);
    }
};

plan.exec = function(params) {

    return executor.execute(params.id, null, null, null, null, null, null, null);

};

plan.kpiByLocation = function(params) {
    try {
        var status;
        var procName = "sap.tm.trp.db.supplydemand::p_get_execution_result_by_executionid_for_kpi_plan";
        var kpiByLocationProc = new lib.Procedure(lib.constants.SCHEMA_NAME,
                procName);
        var result = kpiByLocationProc(params.obj.execId, params.obj.nodeId).OUT_PUT;

        result.forEach(function(i) {
            // dynamical KPI change
            i.DATA = {
                VALUE : Number(i.OUTPUT_VALUE),
                ALERT : i.ALERT_STATUS
            };

            i.OUTPUT_NODE_NAME = i.OUT_NODE_NAME;
            i.OUTPUT_NODE_TYPE = i.OUTPUT_KEY;

            status = i.PLAN_STATUS;

            delete i.OUTPUT_KEY;
            delete i.OUTPUT_VALUE;
            delete i.OUT_NODE_NAME;
        });

        return {
            results : result,
            status : status
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
        var status;
        var procName = "sap.tm.trp.db.supplydemand::p_get_execution_result_resource_by_executionid_for_kpi_plan";
        var kpiByLocationProc = new lib.Procedure(lib.constants.SCHEMA_NAME,
                procName);
        var result = kpiByLocationProc(params.obj.execId, params.obj.nodeId).OUT_PUT;

        result.forEach(function(i) {
            // dynamical KPI change
            i.DATA = {
                VALUE : Number(i.OUTPUT_VALUE),
                ALERT : i.ALERT_STATUS
            };

            i.OUTPUT_NODE_NAME = i.OUT_NODE_NAME;
            i.OUTPUT_NODE_TYPE = i.OUTPUT_KEY;

            status = i.PLAN_STATUS;

            delete i.OUTPUT_KEY;
            delete i.OUTPUT_VALUE;
            delete i.OUT_NODE_NAME;
        });

        return {
            results : result,
            status : status
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

        var status;
        var ALERT_STATUS, OUTPUT_NODE_NAME, OUTPUT_NODE_TYPE,GEO_ID,GEO_NAME, HAS_DRILLDOWN_FLAG,OUT_NODE_NAV_TYPE,RESOURCE_TYPE_CODE,RESOURCE_TYPE_NAME,SEQUENCE;
        var result = lib.getLocationSupplyDemandExecutionResult(
                null,null,params.obj.execId, params.obj.nodeId, params.obj.locations);
        var r={
            DATA:{},
            ALERT_STATUS,
            OUTPUT_NODE_NAME,
            OUTPUT_NODE_TYPE,
            END_TIME:{},
            GEO_ID,
            GEO_NAME,
            HAS_DRILLDOWN_FLAG,
            OUT_NODE_ID:{},
            OUT_NODE_NAV_TYPE,
            RESOURCE_TYPE_CODE,
            RESOURCE_TYPE_NAME,
            SEQUENCE,
            START_TIME:{},
            TIME_INTERVAL:{}
        };
        var r1=[];
        Object.keys(result).forEach(function(i) {
            // dynamical KPI change
            r.DATA = {
                VALUE : Number(result[i].OUTPUT_VALUE),  
                ALERT : result[i].ALERT_STATUS
            };

            r.OUTPUT_NODE_NAME = result[i].OUT_NODE_NAME;
            r.OUTPUT_NODE_TYPE = result[i].OUTPUT_KEY;

            status = result[i].PLAN_STATUS;
            
            r.ALERT_STATUS=result[i].ALERT_STATUS;
            r.END_TIME=result[i].END_TIME;
            r.GEO_ID=result[i].GEO_ID;
            r.GEO_NAME=result[i].GEO_NAME;
            r.OUT_NODE_ID=result[i].OUT_NODE_ID;
            r.OUT_NODE_NAV_TYPE=result[i].OUT_NODE_NAV_TYPE;
            r.RESOURCE_TYPE_CODE=result[i].RESOURCE_TYPE_CODE;
            r.RESOURCE_TYPE_NAME=result[i].RESOURCE_TYPE_NAME;
            r.SEQUENCE=result[i].SEQUENCE;
            r.START_TIME=result[i].START_TIME;
            r.TIME_TRAVEL=result[i].TIME_TRAVEL;
            r.HAS_DRILLDOWN_FLAG=result[i].HAS_DRILLDOWN_FLAG===undefined?null:result[i].HAS_DRILLDOWN_FLAG;
            r1.push(r);
            r = {};
        });

        return {
            results : r1,
            status : status
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
        var status;
        var procName = "sap.tm.trp.db.supplydemand::p_get_execution_result_resource_by_executionid_resource_for_kpi_plan";
        var kpiResourceProc = new lib.Procedure(lib.constants.SCHEMA_NAME,
                procName);
        var result = kpiResourceProc(params.obj.execId, params.obj.nodeId,
                params.obj.resourceTypeCode).OUT_PUT;

        result.forEach(function(i) {
            // dynamical KPI change
            i.DATA = {
                VALUE : Number(i.OUTPUT_VALUE),
                ALERT : i.ALERT_STATUS
            };

            i.OUTPUT_NODE_NAME = i.OUT_NODE_NAME;
            i.OUTPUT_NODE_TYPE = i.OUTPUT_KEY;

            status = i.PLAN_STATUS;

            delete i.OUTPUT_KEY;
            delete i.OUTPUT_VALUE;
            delete i.OUT_NODE_NAME;
        });

        return {
            results : result,
            status : status
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
        procName = lib.constants.SP_PKG_PIPELINE + "::p_get_kpi_plan_chart";
        var kpiChartProc = new lib.Procedure(lib.constants.SCHEMA_NAME,
                procName);
        var chartResults = kpiChartProc(params.obj.execId, params.obj.nodeId);
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
                + "::p_get_kpi_plan_chart_by_resource";
        var kpiChartProc = new lib.Procedure(lib.constants.SCHEMA_NAME,
                procName);
        var chartResults = kpiChartProc(params.obj.execId, params.obj.nodeId);
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

plan.locations = function(params) {
    try {
        var procName, locationsOnMapProc, locationsResults, output;
        var execId = params.obj.execId, nodeId = params.obj.nodeId;

        procName = lib.constants.SP_PKG_PIPELINE + "::p_get_geo_equip_time_by_execution_id";

        locationsOnMapProc = new lib.Procedure(lib.constants.SCHEMA_NAME,
                procName);
        locationsResults = locationsOnMapProc(execId, nodeId);
        output = {
            LOCATIONS : locationsResults.GEOS,
            TIME_INTERVALS : locationsResults.TIME_INTERVALS,
            RESOURCES : locationsResults.EQUIPS
        };
        return output;
    } catch (e) {
        if (e instanceof xslib.WebApplicationError) {
            throw e;
        }
        throw new xslib.InternalError(lib.messages.MSG_ERROR_GET_LOCATIONS, e);
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
            bubbleOnMap = lib.getBubbleOnMapByExecId(null,null,obj.execId, obj.nodeId,
                obj.sequence, obj.polygon);
        } else{
            bubbleOnMap = lib.getBubbleOnMapByResourceType(null,null,obj.execId, obj.nodeId,
                    obj.sequence, obj.polygon, obj.resourceType);
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
            pieOnMap = lib.getPieOnMapByExecId(null,null,obj.execId, obj.nodeId,
                    obj.sequence, obj.polygon);
        } else {
            pieOnMap = lib.getPieOnMapByResourceType(null,null,obj.execId, obj.nodeId,
                    obj.sequence, obj.polygon, obj.resourceType);
        }
        return pieOnMap;
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
                        var privilege = "sap.tm.trp.service::CreateKPIPlan";

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
                        var privilege = "sap.tm.trp.service::UpdateKPIPlan";

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
                        var conn, sql, rs1, usageCode;
                        conn = $.hdb.getConnection();
                        sql = "SELECT USAGE_CODE FROM \"SAP_TM_TRP\".\"sap.tm.trp.db.pipeline::t_plan_model\" WHERE ID=?";
                        rs1 = conn.executeQuery(sql, params.obj.ID);
                        usageCode = rs1[0].USAGE_CODE;
                        var privilege = "sap.tm.trp.service::ExecuteKPIPlan";
                        var privilege_gkpi = "sap.tm.trp.service::ExecuteScheduledPlan_Gen_KPIPlan";

                        if (!$.session.hasAppPrivilege(privilege)) {
                            if(usageCode === "GKPI" && $.session.hasAppPrivilege(privilege_gkpi)) {
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
                        var privilege = "sap.tm.trp.service::DeleteKPIPlan";

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
                            "resourceKpi", "kpiChartByLocationt",
                            "kpiChartByResource", "alertsOnMap", "bubbleOnMap",
                            "pieOnMap", "locations" ]
                },
                {
                    filter : function(params) {
                        var checkResult, checkProc, errorMessage;
                        try {
                            checkProc = new lib.Procedure(
                                    lib.constants.SCHEMA_NAME,
                                    'sap.tm.trp.db.pipeline::p_kpi_plan_save_check');

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
                                    if (checkResult.MSG === 'MSG_ERROR_COST_MODEL_NOT_COVERED'){
                                        errorMessage = lib.messages.MSG_ERROR_COST_MODEL_NOT_COVERED;
                                    }else{
                                        errorMessage = lib.messages.MSG_VISIBILITY_CHECK_FAILED_USED_LIST;
                                    }
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
    method : $.net.http.POST,
    scope : "member",
    action : "exec",
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
    action : "locations",
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
