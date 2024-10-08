var registrationObjectLib = $.import("/sap/tm/trp/service/user/registrationObject.xsjslib");

var pickupSelectionDateCriteriaService = registrationObjectLib.registrationObjectService;
var logger = registrationObjectLib.logger;
var model = registrationObjectLib.model;
var RO_TYPE = registrationObjectLib.RO_TYPE;
var messages = registrationObjectLib.messages;
var proc = registrationObjectLib.proc;
var SCHEMA = registrationObjectLib.SCHEMA;
var lib = registrationObjectLib.lib;
pickupSelectionDateCriteriaService.setModel(new model.RegistrationObject());

 
pickupSelectionDateCriteriaService.create = function(params) {
	
	var res, conn, regiProc;
    
    var activateConfig = params.obj.ACTIVATE_CONFIG;
    var regName = params.obj.NAME;
    var procName = params.obj.PROCEDURE_NAME;
    var schemaName = params.obj.SCHEMA;
    var tableName = params.obj.TABLE_TYPE_NAME;
    var description = params.obj.DESC; 

    try {
        conn = $.db.getConnection($.db.isolation.SERIALIZABLE);
        conn.setAutoCommit(false);
        regiProc = new proc.Procedure(SCHEMA, 'sap.tm.trp.db.pickupreturn::p_pickup_register_selection_date_criteria', {
            connection: conn
        });

        res = regiProc(
            regName,
        	schemaName,
        	procName,
        	description
        );
        
        var registrationId = res.ENTRY_ID;

        conn.commit();

        logger.success(
            "REGISTRATION_OBJECT_CREATE_SUCCESS",
            registrationId
        );
        return {
            ID: registrationId
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

pickupSelectionDateCriteriaService.update = function(params) {
    
	var Res, conn, updateProc;
	
    var entryID = params.obj.ID;
    var description = params.obj.DESC;
    var activationStatus = params.obj.ACTIVATE_CONFIG;
    var procName = params.obj.PROCEDURE_NAME;
    var schemaName = params.obj.SCHEMA;
   
    
    try {
        conn = $.db.getConnection($.db.isolation.SERIALIZABLE);
        conn.setAutoCommit(false);
        updateProc = new proc.Procedure('SAP_TM_TRP', 'sap.tm.trp.db.pickupreturn::p_pickup_register_selection_date_criteria_update', {
            connection: conn
        });

        updateProc(entryID, description, procName, schemaName );

        conn.commit();

        logger.success(
            "REGISTRATION_OBJECT_UPDATE_SUCCESS",
            entryID
        );
        return {
            ID: entryID
        };
    } catch (e) {
        conn.rollback();

        logger.error(
            "REGISTRATION_OBJECT_UPDATE_FAILED",
            e.toString(),
            entryID
        );
        throw new lib.InternalError(messages.MSG_ERROR_UPDATE_REGISTRATION_OBJECT, e);
    } finally {
        if (conn) {
            conn.close();
        }
    }
};

pickupSelectionDateCriteriaService.destroy = function(params) {
    	var Res, conn, deleteProc;
    	
    try {
        var entryID = params.id;
        conn = $.db.getConnection($.db.isolation.SERIALIZABLE);
        conn.setAutoCommit(false);
        deleteProc = new proc.Procedure('SAP_TM_TRP', 'sap.tm.trp.db.pickupreturn::p_pickup_register_selection_date_criteria_delete', {
            connection: conn
        });
        deleteProc(entryID);

        conn.commit();

        logger.success(
            "REGISTRATION_OBJECT_DELETE_SUCCESS",
            entryID
        );
        return {
            ID: entryID
        };
        
      
    } catch (e) {
        logger.error("REGISTRATION_OBJECT_DELETE_FAILED", e.toString(),
                params.id);
        throw new lib.InternalError(
                messages.MSG_ERROR_DELETE_REGISTRATION_OBJECT, e);
    }
};

//pickupSelectionDateCriteriaService.setFilters([{
//    filter: function(params) {
//        var privilege = "sap.tm.trp.service::RegisterPickupSelectionDateCriteria";
//        if (!$.session.hasAppPrivilege(privilege)) {
//            logger.error("OBJECT_REGISTRAION_CREATE_AUTHORIZE_FAILED",
//                privilege,
//                params.obj.NAME);
//
//            throw new lib.NotAuthorizedError(privilege);
//        }
//        return true;
//    },
//    only: ["create"]
//}, {
//    filter: function(params) {
//        var privilege = "sap.tm.trp.service::EditPickupSelectionDateCriteria";
//        if (!$.session.hasAppPrivilege(privilege)) {
//            logger.error("OBJECT_REGISTRAION_UPDATE_AUTHORIZE_FAILED",
//                privilege,
//                params.id,
//                params.obj.NAME);
//
//            throw new lib.NotAuthorizedError(privilege);
//        }
//        return true;
//    },
//    only: ["update"]
//}
// add check for check after adding field in pickup ruleset so that we know it's not used anywhere else  
// {
//      filter: function(params) {
//          //Validate the entries:
//     	 // 1. Check if schema exists
//     	 // 2. The procedure should be in the given schema
//     	 // 3. The table name should be output parameter of the procedure
//     	 //	4. There should be only two input parameter in the procedure 
//     	 // 5. The input parameter should be of table type "sap.tm.trp.db.pickupreturn::tt_tu_booking_list"
//     	 // 6. The output structure should have the field TU_ID
//          var procName = 'sap.tm.trp.db.pickupreturn::p_register_pickupret_extended_col_validate';
//          var checkProc = new proc.Procedure(SCHEMA, procName);
//          var checkResult = checkProc(params.obj.SCHEMA, params.obj.PROCEDURE_NAME, params.obj.TABLE_TYPE_NAME);
//          var isValid = checkResult.IS_VALID;
//          if (isValid === 0) {
//              logger.error("OBJECT_REGISTRATION_PICKUP_FAILED",
//                  params.obj.SCHEMA,
//                  params.obj.PROCEDURE_NAME,
//                  params.obj.TABLE_TYPE_NAME);

//              throw new lib.InternalError(checkResult.ERROR_MSG);
//          }
//          return true;
//      },
//      only: ["create"]
 // }
 //]);

try {
    pickupSelectionDateCriteriaService.handle();
} finally {
    logger.close();
}