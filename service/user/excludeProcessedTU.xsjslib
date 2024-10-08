var registrationObjectLib = $.import("/sap/tm/trp/service/user/registrationObject.xsjslib");

var excludeProcessedTuService = registrationObjectLib.registrationObjectService;
var logger = registrationObjectLib.logger;
var model = registrationObjectLib.model;
var RO_TYPE = registrationObjectLib.RO_TYPE;
var messages = registrationObjectLib.messages;
var proc = registrationObjectLib.proc;
var SCHEMA = registrationObjectLib.SCHEMA;
var lib = registrationObjectLib.lib;
excludeProcessedTuService.setModel(new model.RegistrationObject());

 
excludeProcessedTuService.create = function(params) {
	
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
        regiProc = new proc.Procedure(SCHEMA, 'sap.tm.trp.db.pickupreturn::p_register_exclude_processed_tu_create', {
            connection: conn
        });

        res = regiProc(
        	regName,
        	schemaName,
        	procName,
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
excludeProcessedTuService.destroy = function(params) {
	var  conn, deleteProc;

	try {
  var entryID = params.id;
  conn = $.db.getConnection($.db.isolation.SERIALIZABLE);
 conn.setAutoCommit(false);
  deleteProc = new proc.Procedure('SAP_TM_TRP', 'sap.tm.trp.db.pickupreturn::p_register_exclude_processed_tu_delete', {
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

excludeProcessedTuService.update = function(params) {
  
	var Res, conn, updateProc;
	
  var entryID = params.obj.ID;
  var description = params.obj.DESC;
  var activationStatus = params.obj.ACTIVATE_CONFIG;
  var procName = params.obj.PROCEDURE_NAME;
  var schemaName = params.obj.SCHEMA;
  
  try {
      conn = $.db.getConnection($.db.isolation.SERIALIZABLE);
      conn.setAutoCommit(false);
      updateProc = new proc.Procedure('SAP_TM_TRP', 'sap.tm.trp.db.pickupreturn::p_register_exclude_processed_tu_update', {
          connection: conn
      });

      updateProc(entryID,schemaName, procName ,description, activationStatus);

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
}



try {
	excludeProcessedTuService.handle();
} finally {
    logger.close();
}