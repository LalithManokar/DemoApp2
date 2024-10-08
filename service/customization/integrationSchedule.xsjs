var lib = $.import("/sap/tm/trp/service/xslib/railxs.xsjslib");
var constants = $.import("/sap/tm/trp/service/xslib/constants.xsjslib");
var proc = $.import("/sap/tm/trp/service/xslib/procedures.xsjslib");
var SCHEMA = constants.SCHEMA_NAME;
var PACKAGE = "sap.tm.trp.db.systemmanagement.customization";
var messages = $.import("/sap/tm/trp/service/xslib/messages.xsjslib");
var logger = new ($.import("/sap/tm/trp/service/xslib/applog.xsjslib")).AppLog();
var File = $.import("/sap/tm/trp/service/xslib/file.xsjslib").File;
var scheduleEnhance = $.import("/sap/tm/trp/service/xslib/scheduleEnhance.xsjslib").createView;
var Procedure = $.import('/sap/tm/trp/service/xslib/procedures.xsjslib').Procedure;
var LOCAL_PACKAGE_ABS = "system-local.trp.";
var EXT_PACKAGE = "ext";
var EXT_PACKAGE_ABS = LOCAL_PACKAGE_ABS + EXT_PACKAGE;

var integrationSchedule = new lib.SimpleRest({
    name: "integration schedule",
    desc: "integration schedule service"
});

function createViews() {
    var ext = new scheduleEnhance();
    return ext.enhance();
}

function removeScheduleView() {

    var ext = new scheduleEnhance();
    ext.revert();
}

function getSchema(viewName) {

    var getSchemaName = new Procedure("SAP_TM_TRP",
                "sap.tm.trp.db.systemmanagement.customization::p_get_view_schema");
    var schema_name = getSchemaName(viewName).SCHEMANAME;
    
    return schema_name;
}

function changeSynonym(schemaName, view_name, synonym, impact_view) {
    
	var conn, stmt, count;
    var synonymExistSQL = 'SELECT COUNT(1) FROM SYNONYMS WHERE SCHEMA_NAME = \'PUBLIC\' AND SYNONYM_NAME = ?';
    var targetExistSQL = 'SELECT COUNT(1) FROM VIEWS WHERE VIEW_NAME = ?';
    var dropSQL = 'DROP PUBLIC SYNONYM "' + synonym + '"';
    var createSQL = 'CREATE PUBLIC SYNONYM "' + synonym + '" FOR "'
            + schemaName + '"."' + view_name + '"';
    
    try {
    	conn = $.db.getConnection($.db.isolation.SERIALIZABLE);
        conn.setAutoCommit(false);
        
        // To let the roll back work
        stmt = conn.prepareStatement("SET TRANSACTION AUTOCOMMIT DDL OFF");
        stmt.execute();
        
        // Update the synonym
        // Drop the old synonym if exist
        stmt = conn.prepareStatement(synonymExistSQL);
        stmt.setString(1, synonym);
        stmt.execute();
        var rs = stmt.getResultSet();
        if (rs.next()) {
            count = rs.getInteger(1);
            if (count > 0) {
                stmt = conn.prepareStatement(dropSQL);
                stmt.execute();

                logger.info("ENHANCED_SCHEDULE_DROP_SYNONYM", dropSQL);
            }
        }

        // Create the synonym if the target view exist
        stmt = conn.prepareStatement(targetExistSQL);
        stmt.setString(1, view_name);
        stmt.execute();
        rs = stmt.getResultSet();
        if (rs.next()) {
            count = rs.getString(1);
            if (count > 0) {
                stmt = conn.prepareStatement(createSQL);
                stmt.execute();

                logger.info("ENHANCED_SCHEDULE_CREATE_SYNONYM", createSQL);
            } else {

                logger.error("ENHANCED_SCHEDULE_VIEW_NOT_EXIST",
                        SCHEMA, view_name);

                throw new lib.InternalError(
                        messages.MSG_ERROR_VIEW_NOT_EXIST);
            }
        }
        conn.commit();

        var file = new File(impact_view + '.hdbview', "/sap/tm/trp/db/semantic/schedule/");
        file.regenerate();
        
    } catch (e) {
        logger.error("VIEWS_CREATE_FAIL", e);
        throw new lib.InternalError("Failed to Change ", e);
    } finally {
        conn.close();
    }
}

/*
function dropView(view_name) {
	var conn, stmt, count;
	var viewExistSQL = 'SELECT COUNT(1) FROM VIEWS WHERE VIEW_NAME = ?';
    var dropViewSQL = 'DROP VIEW "' + view_name + '"';
    try {
    	conn = $.db.getConnection($.db.isolation.SERIALIZABLE);
        conn.setAutoCommit(false);
        
        stmt = conn.prepareStatement(viewExistSQL);
        stmt.setString(1, view_name);
        stmt.execute();
        var rs = stmt.getResultSet();
        if (rs.next()) {
            count = rs.getInteger(1);
            if (count > 0) {
            	stmt = conn.prepareStatement(dropViewSQL);
                stmt.execute();

                logger.info("ENHANCED_SCHEDULE_DROP_VIEW", dropViewSQL);
            }
        }
    
    } catch (e) {
        logger.error("VIEWS_DROP_FAIL", e);
        throw new lib.InternalError("Failed to drop ", e);
    }
}
*/

integrationSchedule.create = function(params) {
    var updateScheduleTables, procName, result, synonym, conn, impact_view, schemaName, view;
    try {
    	conn = $.db.getConnection($.db.isolation.SERIALIZABLE);
        conn.setAutoCommit(false);
    	
        procName = "p_ext_schedule_table_update";
        updateScheduleTables = new proc.procedure(SCHEMA, PACKAGE + '::' + procName);
        result = updateScheduleTables(params.obj.INTEGRATION_TABLES);
        
        if (result.MESSAGE !== "MSG_SUCCESS_STATUS"){
            throw new lib.InternalError(result.MESSAGE);
        }
        logger.success(
                "SCHEDULE_TABLES_UPDATE_SUCCESS",
                params.obj.INTEGRATION_TABLES
            );
        if (result.VIEW_NAMES.length > 0){
            removeScheduleView();
        }
        
        var createResult = createViews();
        
        if (createResult !== undefined && createResult.length > 0){
        	createResult.forEach(function(item){
        		if (item.view_name === 'v_departure_rule_rep'){
        			synonym = 'sap.tm.trp.db.semantic.schedule::v_enhanced_departure_rule';
        			impact_view = 'v_departure_rule';
        			
        		} else {
        			synonym = 'sap.tm.trp.db.semantic.schedule::v_enhanced_departure_rule_stage';
        			impact_view = 'v_departure_rule_stage';
        		}
              	schemaName = getSchema(item.view_name);
              	view = EXT_PACKAGE_ABS + '::' + item.view_name;
        		changeSynonym(schemaName, view, synonym, impact_view);
              });
        
        return {
			MESSAGE: result.MESSAGE
		};
        }
    } catch (e) {
        if (e instanceof lib.WebApplicationError) {
            throw e;
        }
        logger.error(
                "SCHEDULE_TABLES_UPDATE_FAILED",
                params.obj.INTEGRATION_TABLES
            );
        throw new lib.InternalError(messages.MSG_ERROR_UPDATE_SCHEDULE_TABLES, e);
    }
};

integrationSchedule.delete = function() {
    var destroyScheduleTables, procName, result, synonym, impact_view;
    try {
        procName = "p_ext_schedule_table_delete";
        destroyScheduleTables = new proc.procedure(SCHEMA, PACKAGE + '::' + procName);
        result = destroyScheduleTables();
        
        if (result.MESSAGE !== "MSG_SUCCESS_STATUS"){
            throw new lib.InternalError(result.MESSAGE);
        }
        logger.success(
                "SCHEDULE_TABLES_DELETE_SUCCESS"
            );
        
        if (result.VIEW_NAMES.length > 0){
        	
        	result.VIEW_NAMES.forEach(function(row) {
        	    
        		if (row.VIEW_NAME === 'sap.tm.trp.db.semantic.schedule::v_enhanced_departure_rule'){
        			synonym = 'sap.tm.trp.db.semantic.schedule::v_enhanced_departure_rule';
        			impact_view = 'v_departure_rule';
        		} else {
        			synonym = 'sap.tm.trp.db.semantic.schedule::v_enhanced_departure_rule_stage';
        			impact_view = 'v_departure_rule_stage';
        		}
        		
        		changeSynonym(row.SCHEMA_NAME, row.VIEW_NAME, synonym, impact_view);
        		
        	});
        	removeScheduleView();
        }
    } catch (e) {
        if (e instanceof lib.WebApplicationError) {
            throw e;
        }
        logger.error(
                "SCHEDULE_TABLES_DELETE_FAILED",
                e.toString()
            );
        throw new lib.InternalError(messages.MSG_ERROR_DELETE_SCHEDULE_TABLES, e);
    }
};

integrationSchedule.setFilters([{
    filter: function() {
        var privilege = "sap.tm.trp.service::AddScheduleTables";
        if (!$.session.hasAppPrivilege(privilege)) {
            logger.error("SCHEDULE_TABLE_CREATE_AUTHORIZE_FAILED",
                    privilege);
            throw new lib.NotAuthorizedError(privilege);
        }
        return true;
    },
    only: ["create"]
}, {
    filter: function() {
        var privilege = "sap.tm.trp.service::DeleteScheduleTables";
        if (!$.session.hasAppPrivilege(privilege)) {
            logger.error("SCHEDULE_TABLE_DELETE_AUTHORIZE_FAILED",
                    privilege);
            throw new lib.NotAuthorizedError(privilege);
        }
        return true;
    },
    only: ["delete"]
}]);

integrationSchedule.setRoutes([
    {
    method: $.net.http.DELETE,
    scope: "collection",
    action: "delete"
}
    ]);

try {
	integrationSchedule.handle();
} finally {
    logger.close();
}