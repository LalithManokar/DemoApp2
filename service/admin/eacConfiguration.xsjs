var model = $.import('/sap/tm/trp/service/model/eacConfiguration.xsjslib');
var lib = $.import('/sap/tm/trp/service/xslib/railxs.xsjslib');
var constants = $.import('/sap/tm/trp/service/xslib/constants.xsjslib');
var proc = $.import('/sap/tm/trp/service/xslib/procedures.xsjslib');
var messages = $.import('/sap/tm/trp/service/xslib/messages.xsjslib');
//var facetFilterUtils = $.import('/sap/tm/trp/service/xslib/utils.xsjslib').facetFilterUtils;
var logger = new ($.import("/sap/tm/trp/service/xslib/applog.xsjslib")).AppLog();


var SCHEMA = constants.SCHEMA_NAME;
var PACKAGE = constants.SP_PKG_HRF_RULE_MGMT_RULE_GROUP;
var SERVICE_PKG = "sap.tm.trp.service";

//service for eacConfiguration
var eacConfigurationService = new lib.SimpleRest({
    name: 'EAC Configuration',
    desc: 'API for EAC Configuration',
    model: new model.EacConfiguration()
});
var conn = $.hdb.getConnection();

eacConfigurationService.create = function(params) {
    var procName, createProc, result, parameters, schedule, job = {}; 



    // conn = $.db.getConnection();
    try {
        procName = PACKAGE + '::p_eac_configuration_create';    //create procedure for eac
        // createProc = new proc.procedure(SCHEMA, procName, {
        //     connection: conn
        // });
        createProc = conn.loadProcedure(SCHEMA, procName);
        //add schedule parameters to this procedure for updating the schedule table
        // var rulesetList = [];
        var locationList = [];
        var geoId_str = '';
        
        
    	for(var i in params.obj.LOCATION_LIST){
    		locationList.push({ID:params.obj.LOCATION_LIST[i]});
        }
        
        
        locationList.forEach((element,index) => { 
            if( index === 0 ){ 
                 geoId_str = geoId_str + element.ID; }
            else{
                geoId_str = geoId_str + ',' + element.ID;
          }}
        );
        
        params.obj.SP = '"' + params.obj.DETAILS.SCHEMA_NAME + '"' +"."+ '"' + params.obj.DETAILS.PROCEDURE + '"';

        result = createProc(
                params.obj.NAME,
                params.obj.DESCRIPTION||null,
                params.obj.SP,
                geoId_str
                );

        
        if (result.MESSAGE !== 'MSG_SUCCESS_STATUS') {
            throw new lib.InternalError(result.MESSAGE);
        }
        
            // parameters = {};    

               
        logger.success(
            "EAC_CONFIGURATION_CREATE_SUCCESS",
            parseInt(result.ID.toString())
        );
        conn.commit();
        return {
            ID: parseInt(result.ID.toString())
        };
    } catch (e) {
        conn.rollback();
        logger.error(
                "EAC_CONFIGURATION_CREATE_FAILED",
                e
        );
        if (result || e instanceof lib.WebApplicationError) {
            throw e;
        } else {
            throw new lib.InternalError(messages.MSG_ERROR_CREATE_EAC_CONFIGURAION, e);
        }
    } finally {
        if (conn) {
            conn.close();
        }
    }

};

eacConfigurationService.update = function(params) {
    var procName, updateProc, result, job, schedule, parameters = {};
    var locationList = [];
    var geoId_str = '';    

    
    try {
        procName = PACKAGE + '::p_eac_configuration_update';            // procedure for eac update
        // updateProc = new proc.procedure(SCHEMA, procName, {
        //     connection: conn
        // });
        updateProc = conn.loadProcedure(SCHEMA, procName);
    	for(var i in params.obj.LOCATION_LIST){
    		locationList.push({ID:params.obj.LOCATION_LIST[i]});
        }

        
        locationList.forEach((element,index) => { 
            if( index === 0 ){ 
                 geoId_str = geoId_str + element.ID; }
            else{
                geoId_str = geoId_str + ',' + element.ID;
          }}
        );

        params.obj.SP = '"' + params.obj.DETAILS.SCHEMA_NAME + '"' +"."+ '"' + params.obj.DETAILS.PROCEDURE + '"';

        result = updateProc(
        		params.id,
                params.obj.NAME,
                params.obj.DESCRIPTION||null,
                params.obj.SP,
                geoId_str
                );
            
        if (result.MESSAGE !== 'MSG_SUCCESS_STATUS') {
            throw new lib.InternalError(result.MESSAGE);
        }
        logger.success(
            "EAC_CONFIGURATION_GROUP_UPDATE_SUCCESS",
            params.id
        );
        conn.commit();


        return {
            ID: params.id,
            MESSAGE: "EAC_CONFIGURATION_GROUP_UPDATE_SUCCESS"
        };

    } catch (e) {
        conn.rollback();
        if (result) {
            logger.error(
                "EAC_CONFIGURATION_UPDATE_FAILED",
                params.id,
                ["Message: " + e.message, "Cause: " + e.cause].join("; ")
            );
             throw e;
        } else {
            logger.error(
                "EAC_CONFIGURATION_UPDATE_FAILED",
                params.id,
                e
            );
            throw new lib.InternalError(
                    messages.MSG_ERROR_UPDATE_RULESET_GROUP, e);
        }
    } finally {
        if (conn) {
            conn.close();
        }
    }
};

eacConfigurationService.destroy = function(params) {
    var procName, deleteProc, result, job, schedule, parameters = {};
    
    try {
        procName = PACKAGE + '::p_eac_configuration_delete';        //procedure for deleting eac
        // deleteProc = new proc.procedure(SCHEMA, procName, {
        //     connection: conn
        // });
        deleteProc = conn.loadProcedure(SCHEMA, procName);
        result = deleteProc(params.id);


        if (result.MESSAGE !== 'MSG_SUCCESS_STATUS') {
            throw new lib.InternalError(result.MESSAGE);
        }
        

        logger.success(
            "EAC_CONFIGURATION_DELETE_SUCCESS",
            params.id
        );

        conn.commit();

        return {
            MESSAGE : "EAC_CONFIGURATION_DELETE_SUCCESS"
        };
        
    } catch (e) {
        conn.rollback();
        if (result) {
            logger.error(
                "EAC_CONFIGURATION_DELETE_FAILED",
                params.id,
                ["Message: " + e.message, "Cause: " + e.cause].join("; ")
            );
            throw e;
        } else {
            logger.error(
                "EAC_CONFIGURATION_DELETE_FAILED",
                params.id,
                e
            );
            throw new lib.InternalError(
                messages.MSG_ERROR_DELETE_RULESET_GROUP, e);
        }
    } finally {
        if (conn) {
            conn.close();
        }
    }
};



var filterObjectList = [
    {service: ["create"], privilege: "EACConfigurationCreate"},
    {service: ["update"], privilege: "EACConfigurationUpdate"},
    {service: ["destroy"], privilege: "EACConfigurationDelete"}
].map(function(checkPrivInfo){
    return {
        filter: function(params){
            var privilege = [SERVICE_PKG, checkPrivInfo.privilege].join("::");

            if (!$.session.hasAppPrivilege(privilege)) {
                logger.error(
                    "LOC_RULE_UNAUTHORIZED",
                    privilege
                );
                throw new lib.NotAuthorizedError(privilege);
            }
            return true;
        },
        only: checkPrivInfo.service
    }
});

eacConfigurationService.setFilters.apply(
    eacConfigurationService,
    filterObjectList
);

// rulesetGroupService.setFilters([
// {
//     // only the creator can edit or delete a rulesetgroup that has been created
//     filter : function(params) {
//         try {
//             return getUserInfoAuthCheck(params.id);
//         } catch (e) {
//             logger.error("USER_INFO_CHECK_FAILED",
//                 messages.MSG_ERROR_UNAUTHORIZED_UPDATE,
//                 e);
//             throw new lib.InternalError(
//                     messages.MSG_ERROR_UNAUTHORIZED_UPDATE, e);
//         }
//     },
//     only : [ "update"]
// },
// {
//     filter : function(params) {
//         try {
//             return getUserInfoAuthCheck(params.id);
//         } catch (e) {
//             logger.error("USER_INFO_CHECK_FAILED",
//                 messages.MSG_ERROR_UNAUTHORIZED_DELETE,
//                 e);
//             throw new lib.InternalError(
//                     messages.MSG_ERROR_UNAUTHORIZED_DELETE, e);
//         }
//     },
//     only : [ "destroy" ]
// }]);

try {
    eacConfigurationService.handle();
} finally {
    logger.close();
}