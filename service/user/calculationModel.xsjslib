var registrationObjectLib = $.import("/sap/tm/trp/service/user/registrationObject.xsjslib");

var CalculationModelService = registrationObjectLib.registrationObjectService;
var logger = registrationObjectLib.logger;
var model = registrationObjectLib.model;
var RO_TYPE = registrationObjectLib.RO_TYPE;
var messages = registrationObjectLib.messages;
var REGISTRATION_PACKAGE = registrationObjectLib.REGISTRATION_PACKAGE;
var PIPELINE_PACKAGE = registrationObjectLib.PIPELINE_PACKAGE;
var proc = registrationObjectLib.proc;
var SCHEMA = registrationObjectLib.SCHEMA;
var lib = registrationObjectLib.lib;
CalculationModelService.setModel(new model.RegistrationObject());

//Build Default Alert Rule
function buildAlertRule(pipelineId, conn) {
    var alertProc = new proc.procedure('SAP_TM_TRP', 'sap.tm.trp.db.hrf.ruleManage.ruleGroup::p_register_controller_for_pipeline_model', {
        connection: conn
    });

    alertProc(pipelineId);

    logger.success("PIPELINE_REGISTER_ALERT_GROUP_SUCCEED", pipelineId);
}

CalculationModelService.create = function(params) {
    var tmpRes, conn, regiProc;
    var schemaName = params.obj.SCHEMA;
    var procName = params.obj.PROCEDURE_NAME;
    var tableName = params.obj.TABLE_NAME;
    var procedureDesc = params.obj.DESC; //Use the calculation desc as procedure desc
    var pipelineName = params.obj.NAME;
    var pipelineDesc = params.obj.DESC || params.obj.DESCRIPTION;
    var pipelineType = params.obj.CATEGORY;
    var costModelId = params.obj.COST_MODEL_FILTER || null;
    var instant_enable = params.obj.INSTANT_ENABLED;

    try {
        conn = $.db.getConnection($.db.isolation.SERIALIZABLE);
        conn.setAutoCommit(false);
        regiProc = new proc.Procedure('SAP_TM_TRP', PIPELINE_PACKAGE + '::p_register_pipeline_model', {
            connection: conn
        });

        tmpRes = regiProc(schemaName,
            procName,
            tableName,
            procedureDesc,
            pipelineName,
            pipelineDesc,
            pipelineType,
            costModelId,
            instant_enable);
        var pipelineId = tmpRes.PIPELINE_MODEL_ID;

        try {
            buildAlertRule(pipelineId, conn);
        } catch (e) {
            //If building alert rule throws exception, trace warning, and the registration should continue.
            logger.warn("ALERT_RULE_GENERATE_FAILED", pipelineId, e);
        }

        conn.commit();

        logger.success(
            "REGISTRATION_OBJECT_CREATE_SUCCESS",
            pipelineId
        );
        return {
            ID: pipelineId
        };
    } catch (e) {

        conn.rollback();
        logger.error(
            "REGISTRATION_OBJECT_CREATE_FAILED",
            e.toString()
        );
        throw new lib.InternalError(
            messages.MSG_ERROR_CREATE_REGISTRATION_OBJECT, e);
    } finally {
        if (conn) {
            conn.close();
        }
    }
};

CalculationModelService.update = function(params) {
    var tmpRes, conn, updateProc;
    var schemaName = params.obj.SCHEMA;
    var procName = params.obj.PROCEDURE_NAME;
    var tableName = params.obj.TABLE_NAME;
    var procedureDesc = params.obj.DESC; //Use the calculation desc as procedure desc
    var pipelineName = params.obj.NAME;
    var pipelineDesc = params.obj.DESC;
    var pipelineType = params.obj.CATEGORY;
    var pipelineId = params.id;
    var costModelId = params.obj.COST_MODEL_FILTER || null;
    var instant_enable = params.obj.INSTANT_ENABLED;
    try {
        conn = $.db.getConnection($.db.isolation.SERIALIZABLE);
        conn.setAutoCommit(false);
        updateProc = new proc.Procedure('SAP_TM_TRP', PIPELINE_PACKAGE + '::p_update_register_pipeline_model', {
            connection: conn
        });

        tmpRes = updateProc(pipelineId, schemaName, procName,
            tableName, procedureDesc, pipelineName, pipelineDesc,
            pipelineType, costModelId, instant_enable);
        var entryId = tmpRes.ENTRY_ID;

        //If the pipeline doesn't exist
        if (entryId === null) {
            logger.error("PIPELINE_NOT_EXIST", pipelineId);

            throw new lib.InternalError(messages.MSG_ERROR_PIPELINE_NOT_EXIST, null);
        }

        try {
            buildAlertRule(pipelineId, conn);
        } catch (e) {
            //If building alert rule trhows exception, trace warning, and the registration should continue.
            logger.warn("ALERT_RULE_GENERATE_FAILED", pipelineId, e);
        }

        conn.commit();

        logger.success(
            "REGISTRATION_OBJECT_UPDATE_SUCCESS",
            params.id
        );
        return {
            ID: pipelineId
        };
    } catch (e) {
        conn.rollback();

        logger.error(
            "REGISTRATION_OBJECT_UPDATE_FAILED",
            e.toString(),
            params.id
        );
        throw new lib.InternalError(messages.MSG_ERROR_UPDATE_REGISTRATION_OBJECT, e);
    } finally {
        if (conn) {
            conn.close();
        }
    }
};

CalculationModelService.destroy = function(params) {
    var procName, deleteProc, result;
    procName = PIPELINE_PACKAGE + '::p_unregister_pipeline_model';
    deleteProc = new proc.Procedure(SCHEMA, procName);
    result = deleteProc(params.id);
    if (result.MESSAGE !== 'MSG_SUCCESS_STATUS') {

        logger.error(
            "REGISTRATION_OBJECT_DELETE_FAILED",
            params.id
        );
        throw new lib.InternalError(messages.MSG_ERROR_DELETE_REGISTRATION_OBJECT, params.obj);
    }

    logger.success(
        "REGISTRATION_OBJECT_DELETE_SUCCESS",
        params.id
    );
};

CalculationModelService.setFilters([{
    filter: function(params) {
        var privilege = "sap.tm.trp.service::RegisterCalculationModel";
        if (!$.session.hasAppPrivilege(privilege)) {
            logger.error("OBJECT_REGISTRAION_CREATE_AUTHORIZE_FAILED",
                privilege,
                params.obj.NAME);

            throw new lib.NotAuthorizedError(privilege);
        }
        return true;
    },
    only: ["create"]
}, {
    filter: function(params) {
        var privilege = "sap.tm.trp.service::EditCalculationModel";
        if (!$.session.hasAppPrivilege(privilege)) {
            logger.error("OBJECT_REGISTRAION_UPDATE_AUTHORIZE_FAILED",
                privilege,
                params.id,
                params.obj.NAME);

            throw new lib.NotAuthorizedError(privilege);
        }
        return true;
    },
    only: ["update"]
}, {
    filter: function(params) {
        var privilege = "sap.tm.trp.service::UnregisterCalculationModel";
        if (!$.session.hasAppPrivilege(privilege)) {
            logger.error("OBJECT_REGISTRAION_DELETE_AUTHORIZE_FAILED",
                privilege,
                params.id);

            throw new lib.NotAuthorizedError(privilege);
        }
        return true;
    },
    only: ["destroy"]
}, {
    filter: function(params) {
        //Check the pipeline model when Calculation Model Registration
        var procName = PIPELINE_PACKAGE + '::p_check_pipeline_model';
        var checkProc = new proc.Procedure(SCHEMA, procName);
        var checkResult = checkProc(params.obj.SCHEMA, params.obj.PROCEDURE_NAME, params.obj.TABLE_NAME);
        var isValid = checkResult.IS_VALID;
        if (isValid === 0) {
            logger.error("OBJECT_REGISTRATION_CHECK_PIPELINE_MODEL_FAILED",
                params.obj.SCHEMA,
                params.obj.PROCEDURE_NAME,
                params.obj.TABLE_NAME);

            throw new lib.InternalError(checkResult.ERROR_MSG);
        }
        return true;
    },
    only: ["create", "update"]
}]);

try {
    CalculationModelService.handle();
} finally {
    logger.close();
}