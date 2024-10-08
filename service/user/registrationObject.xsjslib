var model = $.import('/sap/tm/trp/service/model/user.xsjslib');
var lib = $.import('/sap/tm/trp/service/xslib/railxs.xsjslib');
var constants = $.import('/sap/tm/trp/service/xslib/constants.xsjslib');
var proc = $.import('/sap/tm/trp/service/xslib/procedures.xsjslib');
var utils = $.import("/sap/tm/trp/service/xslib/utils.xsjslib");
var messages = $.import('/sap/tm/trp/service/xslib/messages.xsjslib');
var logger = new ($.import("/sap/tm/trp/service/xslib/applog.xsjslib")).AppLog();
var File = ($.import("/sap/tm/trp/service/xslib/file.xsjslib")).File;

var SCHEMA = constants.SCHEMA_NAME;
var PACKAGE = constants.SP_PKG_ALERT_RULE_GROUP;
var PIPELINE_PACKAGE = constants.SP_PKG_PIPELINE;
var REGISTRATION_PACKAGE = constants.SP_PKG_OBJECT_REGISTRATION;
var RULE_GROUP_PACKAGE = constants.SP_PKG_HRF_RULE_MGMT_RULE_GROUP;
var RO_TYPE = constants.REGISTRATION_OBJECT_TYPE;

var registrationObjectService = new lib.SimpleRest({
    name : 'RegistrationObject Service',
    desc : 'operations for registration object',
});

var updateResStockAlert = function(params) {
    var conn, stmt, count;

    var synonymName = 'sap.tm.trp.db.stock::p_get_stock_alert';
    var synonymExistSQL = 'SELECT COUNT(1) FROM SYNONYMS WHERE SCHEMA_NAME = \'PUBLIC\' AND SYNONYM_NAME = ?';
    var targetExistSQL = 'SELECT COUNT(1) FROM PROCEDURES WHERE SCHEMA_NAME = ? AND PROCEDURE_NAME = ?';
    var dropSQL = 'DROP PUBLIC SYNONYM "' + synonymName + '"';
    var createSQL = 'CREATE PUBLIC SYNONYM "' + synonymName + '" FOR "'
            + params.obj.SCHEMA + '"."' + params.obj.PROCEDURE_NAME + '"';

    try {
        conn = $.db.getConnection($.db.isolation.SERIALIZABLE);
        conn.setAutoCommit(false);

        // To let the roll back work
        stmt = conn.prepareStatement("SET TRANSACTION AUTOCOMMIT DDL OFF");
        stmt.execute();

        // 1.Update the alert rule
        var procName, updateProc;
        procName = RULE_GROUP_PACKAGE + '::p_update_rule';
        updateProc = new proc.procedure(SCHEMA, procName, {
            connection : conn
        });
        updateProc(params.id, params.obj.NAME, params.obj.DESC,
                params.obj.CATEGORY, utils.quote(params.obj.SCHEMA) + '.'
                        + utils.quote(params.obj.PROCEDURE_NAME),
                params.obj.RESOURCE_CATEGORY);

        logger.info("RESOURCE_STOCK_RULE_UPDATED", params.id, params.obj.NAME,
                params.obj.DESC, params.obj.CATEGORY, utils
                        .quote(params.obj.SCHEMA)
                        + '.' + utils.quote(params.obj.PROCEDURE_NAME),
                params.obj.RESOURCE_CATEGORY);

        // 2.Update the synonym
        // 2.1 Drop the old synonym if exist
        stmt = conn.prepareStatement(synonymExistSQL);
        stmt.setString(1, synonymName);
        stmt.execute();
        var rs = stmt.getResultSet();
        if (rs.next()) {
            count = rs.getInteger(1);
            if (count > 0) {
                stmt = conn.prepareStatement(dropSQL);
                stmt.execute();

                logger.info("RESOURCE_STOCK_RULE_DROP_SYNONYM", dropSQL);
            }
        }

        // 2.2 Create the synonym if the target procedure exist
        stmt = conn.prepareStatement(targetExistSQL);
        stmt.setString(1, params.obj.SCHEMA);
        stmt.setString(2, params.obj.PROCEDURE_NAME);
        stmt.execute();
        rs = stmt.getResultSet();
        if (rs.next()) {
            count = rs.getString(1);
            if (count > 0) {
                stmt = conn.prepareStatement(createSQL);
                stmt.execute();

                logger.info("RESOURCE_STOCK_RULE_CREATE_SYNONYM", createSQL);
            } else {

                logger.error("RESOURCE_STOCK_RULE_PROCEDURE_NOT_EXIST",
                        params.obj.SCHEMA, params.obj.PROCEDURE_NAME);

                throw new lib.InternalError(
                        messages.MSG_ERROR_PROCEDURE_NOT_EXIST);
            }
        }
        conn.commit();

        try {
            var file = new File("cv_get_stock_alerts.calculationview",
                    "/sap/tm/trp/db/hrf/");
            file.regenerate();
        } catch (e) {
            throw new lib.InternalError(
                    messages.MSG_RESOURCE_STOCK_ALERT_REGENERATE_FAILED, e);
        }

    } catch (e) {
        logger.error("RESOURCE_STOCK_RULE_UPDATE_FAILED", e, params.id,
                params.obj.NAME, params.obj.DESC, params.obj.CATEGORY, utils
                        .quote(params.obj.SCHEMA)
                        + '.' + utils.quote(params.obj.PROCEDURE_NAME),
                params.obj.RESOURCE_CATEGORY);

        conn.rollback();
        throw e;
    } finally {
        if (conn) {
            conn.close();
        }
    }
};

var updateRule = function(params) {
    try {
        var procName, updateProc;
        procName = RULE_GROUP_PACKAGE + '::p_update_rule';
        updateProc = new proc.procedure(SCHEMA, procName);
        updateProc(params.id, params.obj.NAME, params.obj.DESC,
                params.obj.CATEGORY, utils.quote(params.obj.SCHEMA) + '.'
                        + utils.quote(params.obj.PROCEDURE_NAME));
        logger.success("REGISTRATION_OBJECT_UPDATE_SUCCESS", params.id);
    } catch (e) {
        logger.error("REGISTRATION_OBJECT_UPDATE_FAILED", e.toString(),
                params.id);
        throw new lib.InternalError(
                messages.MSG_ERROR_UPDATE_REGISTRATION_OBJECT, e);
    }
};

registrationObjectService.create = function(params) {
    try {
        var procName, registerProc, result;
        procName = RULE_GROUP_PACKAGE
                + '::p_register_TRPRule_of_new_created_HRFRule';
        registerProc = new proc.procedure(SCHEMA, procName);
        result = registerProc(params.obj.NAME, params.obj.DESC,
                params.obj.CATEGORY, utils.quote(params.obj.SCHEMA) + '.'
                        + utils.quote(params.obj.PROCEDURE_NAME));
        logger.success("REGISTRATION_OBJECT_CREATE_SUCCESS",
                result.OUT_ALERT_RULE_ID);
        return {
            ID : result.OUT_ALERT_RULE_ID
        };
    } catch (e) {
        logger.error("REGISTRATION_OBJECT_CREATE_FAILED", e);
        throw new lib.InternalError(
                messages.MSG_ERROR_CREATE_REGISTRATION_OBJECT, e);
    }
};

registrationObjectService.update = function(params) {
	updateRule(params);
};

registrationObjectService.destroy = function(params) {
    try {
        var procName, deleteRuleProc, result;
        procName = RULE_GROUP_PACKAGE + '::p_unregister_rule';
        deleteRuleProc = new proc.procedure(SCHEMA, procName);
        result = deleteRuleProc(params.id);
        if (result.MESSAGE !== 'MSG_SUCCESS_STATUS') {
            // Wrap into an error with the meaningful message
            throw new lib.InternalError(result.MESSAGE, null);
        }
        logger.success("REGISTRATION_OBJECT_DELETE_SUCCESS", params.id);
    } catch (e) {
        logger.error("REGISTRATION_OBJECT_DELETE_FAILED", e.toString(),
                params.id);
        throw new lib.InternalError(
                messages.MSG_ERROR_DELETE_REGISTRATION_OBJECT, e);
    }
};

registrationObjectService.facetFilter = function(params) {
    var filterProc = new proc.procedure(SCHEMA, [ REGISTRATION_PACKAGE,
            'p_get_registration_object_facet_filter' ].join('::'));
    var result = filterProc(params.obj.search, params.obj.TYPE_ID_LIST,
            params.obj.CATEGORY_ID_LIST);
    return {
        TYPE_ID : result.TYPE_LIST_OUTPUT.map(function(i) {
            return {
                key : i.ID,
                text : i.DESC
            };
        }),
        CATEGORY_ID : result.CATEGORY_LIST_OUTPUT.map(function(i) {
            return {
                key : i.ID,
                text : i.DESC
            };
        })
    };
};

registrationObjectService.setRoutes([ {
    method : $.net.http.POST,
    scope : 'collection',
    action : 'facetFilter'
} ]);

registrationObjectService
        .setFilters([ {
            filter : function(params) {
                var conn, result = true, checkResult, checkProc;
                try {
                    conn = $.db.getConnection($.db.isolation.READ_COMMITTED);
                    conn.setAutoCommit(false);
                    checkProc = new proc.procedure(
                            SCHEMA,
                            'sap.tm.trp.db.pipeline::p_unregister_pipeline_model_check',
                            {
                                connection : conn
                            });
                    checkResult = checkProc(params.id).WHEREUSED;
                    conn.commit();
                } catch (e) {
                    conn.rollback();
                    logger.error("REGISTERATION_OBJECT_CHECK_FAILED", e,
                            params.id);
                    throw new lib.InternalError(
                            messages.MSG_REGISTRATION_OBJECT_CHECK_USED_FAILED,
                            e);
                }
                if (checkResult.length > 0) {
                    throw new lib.InternalError(
                            messages.MSG_REGISTRATION_OBJECT_IS_USED);
                }
                return result;
            },
            only : [ "destroy" ]

        } ]);