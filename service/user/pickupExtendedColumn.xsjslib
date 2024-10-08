var registrationObjectLib = $.import("/sap/tm/trp/service/user/registrationObject.xsjslib");

var pickupExtColModelService = registrationObjectLib.registrationObjectService;
var logger = registrationObjectLib.logger;
var model = registrationObjectLib.model;
var RO_TYPE = registrationObjectLib.RO_TYPE;
var messages = registrationObjectLib.messages;
var proc = registrationObjectLib.proc;
var SCHEMA = registrationObjectLib.SCHEMA;
var lib = registrationObjectLib.lib;
pickupExtColModelService.setModel(new model.RegistrationObject());

 
pickupExtColModelService.create = function(params) {
	
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
        regiProc = new proc.Procedure(SCHEMA, 'sap.tm.trp.db.pickupreturn::p_register_pickup_extended_col_create', {
            connection: conn
        });

        res = regiProc(
        	regName,
        	schemaName,
        	procName,
        	tableName,
        	description,
        	activateConfig);
        
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

pickupExtColModelService.update = function(params) {
    
	var Res, conn, updateProc;
	
    var entryID = params.obj.ID;
    var description = params.obj.DESC;
    var activationStatus = params.obj.ACTIVATE_CONFIG;
    
    try {
        conn = $.db.getConnection($.db.isolation.SERIALIZABLE);
        conn.setAutoCommit(false);
        updateProc = new proc.Procedure('SAP_TM_TRP', 'sap.tm.trp.db.pickupreturn::p_register_pickup_extended_col_update', {
            connection: conn
        });

        updateProc(entryID, description, activationStatus);

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

pickupExtColModelService.regenerate = function(params) {
    
	var res, conn, regenerateProc;
	
    var entryID = params.obj.ID;
    
    try {
        conn = $.db.getConnection($.db.isolation.SERIALIZABLE);
        conn.setAutoCommit(false);
        regenerateProc = new proc.Procedure('SAP_TM_TRP', 'sap.tm.trp.db.pickupreturn::p_register_pickup_extended_col_regenerate', {
            connection: conn
        });

        res = regenerateProc(entryID);

        conn.commit();

        if (res.STATUS === 0) {
            logger.error(
            "REGISTRATION_OBJECT_REGENERATE_FAILED",
            res.MSG,
            entryID
        );
        throw new lib.InternalError(messages.MSG_ERROR_REGENERATE_REGISTRATION_OBJECT, res.MSG);
        }
        else if(res.STATUS === 1) {
            logger.success(
            "REGISTRATION_OBJECT_REGENERATE_SUCCESS",
            entryID
        );
        }

        return {
            STATUS: res.STATUS,
            MESSAGE: res.MSG
        };
    } catch (e) {
        conn.rollback();

        logger.error(
            "REGISTRATION_OBJECT_REGENERATE_FAILED",
            e.toString(),
            entryID
        );
        throw new lib.InternalError(messages.MSG_ERROR_REGENERATE_REGISTRATION_OBJECT, e);
    } finally {
        if (conn) {
            conn.close();
        }
    }
};


pickupExtColModelService.setFilters([{
    filter: function(params) {
        var privilege = "sap.tm.trp.service::RegisterPickupExtendedColumn";
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
        var privilege = "sap.tm.trp.service::EditPickupExtendedColumn";
        if (!$.session.hasAppPrivilege(privilege)) {
            logger.error("OBJECT_REGISTRAION_UPDATE_AUTHORIZE_FAILED",
                privilege,
                params.id,
                params.obj.NAME);

            throw new lib.NotAuthorizedError(privilege);
        }
        return true;
    },
    only: ["update","regenerate"]
},
{
     filter: function(params) {
         //Validate the entries:
    	 // 1. Check if schema exists
    	 // 2. The procedure should be in the given schema
    	 // 3. The table name should be output parameter of the procedure
    	 //	4. There should be only two input parameter in the procedure 
    	 // 5. The input parameter should be of table type "sap.tm.trp.db.pickupreturn::tt_tu_booking_list"
    	 // 6. The output structure should have the field TU_ID
         var procName = 'sap.tm.trp.db.pickupreturn::p_register_pickupret_extended_col_validate';
         var checkProc = new proc.Procedure(SCHEMA, procName);
         var checkResult = checkProc(params.obj.SCHEMA, params.obj.PROCEDURE_NAME, params.obj.TABLE_TYPE_NAME);
         var isValid = checkResult.IS_VALID;
         if (isValid === 0) {
             logger.error("OBJECT_REGISTRATION_PICKUP_FAILED",
                 params.obj.SCHEMA,
                 params.obj.PROCEDURE_NAME,
                 params.obj.TABLE_TYPE_NAME);

             throw new lib.InternalError(checkResult.ERROR_MSG);
         }
         return true;
     },
     only: ["create"]
 }
]);

try {
    pickupExtColModelService.handle();
} finally {
    logger.close();
}