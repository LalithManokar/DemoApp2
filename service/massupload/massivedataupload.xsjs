var lib = $.import("/sap/tm/trp/service/xslib/railxs.xsjslib");
var messages = $.import("/sap/tm/trp/service/xslib/messages.xsjslib");
var constants = $.import('/sap/tm/trp/service/xslib/constants.xsjslib');
var proc = $.import("/sap/tm/trp/service/xslib/procedures.xsjslib");
var logger = new ($.import("/sap/tm/trp/service/xslib/applog.xsjslib")).AppLog();
var supplyDemandPlanUpload = $.import("/sap/tm/trp/service/massupload/supplyDemandPlanUpload.xsjslib");
var VirtualSupplyDemandPlanUpload = $.import("/sap/tm/trp/service/massupload/VirtualSupplyDemandPlan.xsjslib");
var LocationStockSettingsUpload = $.import("/sap/tm/trp/service/massupload/locationstocksettings.xsjslib");
var LocationGroupStockSettingsUpload = $.import("/sap/tm/trp/service/massupload/locationgroupstocksettings.xsjslib");
var LocationGroupsUpload = $.import("/sap/tm/trp/service/massupload/locationgroups.xsjslib");
var rulesetUpload = $.import("/sap/tm/trp/service/massupload/rulesetUpload.xsjslib");
var LocationFilterUpload = $.import("/sap/tm/trp/service/massupload/locationfilterupload.xsjslib");
var scheduledKPIPlan=$.import("/sap/tm/trp/service/massupload/scheduledKPIPlanUpload.xsjslib");
var virtualKPIPlanUpload=$.import("/sap/tm/trp/service/massupload/virtualKPIPlanUpload.xsjslib");
var LeaseContractTypeUpload = $.import("/sap/tm/trp/service/massupload/LeaseContractTypeUpload.xsjslib");
var LessorUpload = $.import("/sap/tm/trp/service/massupload/LessorUpload.xsjslib");
var leaseContractUpload =$.import("/sap/tm/trp/service/massupload/leaseContractUpload.xsjslib");
var leaseContractHireTermUpload =$.import("/sap/tm/trp/service/massupload/leaseContractHireTerm.xsjslib");
var leaseContractHireConditionUpload =$.import("/sap/tm/trp/service/massupload/leaseContractHireCondition.xsjslib");
var rulesetGroupFetchTUUpload = $.import("/sap/tm/trp/service/massupload/rulesetgroupFetchTUUpload.xsjslib");
var rulesetGroupOptimizeTUUpload = $.import("/sap/tm/trp/service/massupload/rulesetGroupOptimizeTUUpload.xsjslib");
var rulesetGroupFinalizeTUUpload = $.import("/sap/tm/trp/service/massupload/rulesetGroupFinalizeTUUpload.xsjslib");



// rewrite unmarshall
lib.ContentType.csv = {
    type : [ "application/vnd.ms-excel", "text/csv" ],
    unmarshall : function(content) {
        return content.replace(/"/g, "");
    },
    priority : lib.ContentType.Priority.MIN_PRIORITY
};

var massiveDataUploadService = new lib.SimpleRest(
        {
            name : "massive data upload",
            desc : "upload CSV"
        });

var checkCSVEmpty = function(content) {
   
    if (content === "undefined"){
        return true;
    } else if(typeof content === 'string') {
         content = content.trim();
         if ( content === '' || content === null){
             return true;
         } else {
             return false;
         }
    }else{
        return false;
    }
};


/**
 * Upload CSV
 * 
 * @param tranFile
 */
massiveDataUploadService.upload = function(params) {
    var metaData = params.obj[0];
    var connectionId = metaData.CONNECTION_ID;
    var type = metaData.OBJECT_TYPE;
    var resourceCategory = metaData.RESOUCE_CATEGORY;
    var csv = params.obj[1];
    var csvErrorList = [];

    // check the csv file is empty or not
    if (checkCSVEmpty(csv)) {
        throw new lib.InternalError(messages.MSG_ERROR_CSV_IS_EMPTY);
    }
    // write to the database
    try {
        switch (type) {
            case 'SUPP_DEMAND_PLAN':
                csvErrorList = supplyDemandPlanUpload.upload(csv, resourceCategory, connectionId);
                break;
             case 'LOC_GROUP_STOCK':
                 csvErrorList = LocationGroupStockSettingsUpload.upload(csv, resourceCategory, connectionId);
                break;
            case 'LOC_GROUP':
                csvErrorList = LocationGroupsUpload.upload(csv, resourceCategory, connectionId);
                break;
            case 'LOC_FILTERS':
                 csvErrorList = LocationFilterUpload.upload(csv, resourceCategory, connectionId);
                break;
            case 'STOCK_LOC':
                //Stock Settings for Location
                csvErrorList = LocationStockSettingsUpload.upload(csv, resourceCategory, connectionId);
                break;
            case 'VIR_SUPP_DEMAND_PLAN':
                //Virtual Supply&Demand Plan
                csvErrorList = VirtualSupplyDemandPlanUpload.upload(csv, resourceCategory, connectionId);
                break;
            case 'KPI_PLAN':
            	csvErrorList = scheduledKPIPlan.upload(csv, resourceCategory, connectionId);
                break;
            case 'VIR_KPI_PLAN':
                csvErrorList = virtualKPIPlanUpload.upload(csv, resourceCategory, connectionId);
                break;
            case 'PICK_RET_RULESET':
            	csvErrorList = rulesetUpload.upload(csv, resourceCategory, connectionId);
                break;
            case 'LEASE_CONTRACT_TYPE':
            	csvErrorList = LeaseContractTypeUpload.upload(csv, connectionId);
                break;
            case 'LESSOR':
            	csvErrorList = LessorUpload.upload(csv, connectionId);
                break;
            case 'LEASE_CONTRACT':
            	csvErrorList = leaseContractUpload.upload(csv, resourceCategory, connectionId);
                break;
            case 'LEASE_CONTRACT_HIRE_TERM':
            	csvErrorList = leaseContractHireTermUpload.upload(csv,connectionId);
                break;
            case 'LEASE_CONTRACT_HIRE_CONDITION':
            	csvErrorList = leaseContractHireConditionUpload.upload(csv,connectionId);
                break;
            case 'FETCH_TU_GROUP': 
                csvErrorList = rulesetGroupFetchTUUpload.upload(csv, resourceCategory, connectionId);
                break;
            case 'OPTIMIZE_TU_GROUP':
                csvErrorList = rulesetGroupOptimizeTUUpload.upload(csv,resourceCategory,connectionId);
                break;
            case 'FINALIZE_TU_GROUP':
                csvErrorList = rulesetGroupFinalizeTUUpload.upload(csv,resourceCategory,connectionId);
                break;
        }
        return csvErrorList;
    } catch (e) {
        logger.error("MASSIVE_DATA_FILE_UPLOAD_FAILED", e);
        throw new lib.InternalError(messages.MSG_ERROR_MASSIVE_DATA_UPLOAD, e);
    }
};

/**
 * Save Staging CSV data
 * 
 * @param tranFile
 */
massiveDataUploadService.save = function(params) {
    var metaData = params.obj[0];
    var connectionId = metaData.CONNECTION_ID;
    var type = metaData.OBJECT_TYPE;
    var resourceCategory = metaData.RESOUCE_CATEGORY;
    // Here are the mock data, just for test, need to remove after test
    // var connectionId = 'CONNECTION_ID_BEN_TEST';
    // var type = 'SUPP_DEMAND_PLAN';
    // var resourceCategory = 'CN';
    var createHistoryProc, updateHistoryProc, executionResults, newId, conn;
 	var STATUS_TYPE_ID_COMPLETED = 3;
 	var STATUS_TYPE_ID_FAILED = 4;

    // write to the database
    try {
    	conn = $.db.getConnection();
    	conn.setAutoCommit(false);
    	createHistoryProc = new proc.procedure(constants.SCHEMA_NAME, constants.SP_PKG_DATA_UPLOAD + '::' + 'p_massupload_execution_history_create',{
            connection: conn
        });
    	newId = createHistoryProc(type).NEW_ID;
    	conn.commit();
    	
        updateHistoryProc = new proc.procedure(constants.SCHEMA_NAME, constants.SP_PKG_DATA_UPLOAD + '::' + 'p_massupload_execution_history_update',{
            connection: conn
        });
    	
        switch (type) {
            case 'SUPP_DEMAND_PLAN':
               executionResults = supplyDemandPlanUpload.save(resourceCategory, connectionId);
                break;
            case 'LOC_GROUP_STOCK':
            	 executionResults = LocationGroupStockSettingsUpload.save(resourceCategory, connectionId);
            	 break;
            case 'LOC_GROUP':
                 executionResults = LocationGroupsUpload.save(resourceCategory, connectionId);
            	 break;
            case 'LOC_FILTERS':
            	executionResults = LocationFilterUpload.save(resourceCategory, connectionId);
                break;
            case 'STOCK_LOC':
                //Stock Settings for Location
                executionResults = LocationStockSettingsUpload.save(resourceCategory, connectionId);
                break;
            case 'VIR_SUPP_DEMAND_PLAN':
                //Virtual Supply&Demand Plan
                executionResults = VirtualSupplyDemandPlanUpload.save(resourceCategory, connectionId);
                break;
            case 'KPI_PLAN':
            	executionResults = scheduledKPIPlan.save(resourceCategory, connectionId);
                break;
            case 'VIR_KPI_PLAN':
                executionResults = virtualKPIPlanUpload.save(resourceCategory, connectionId);
                break;
            case 'PICK_RET_RULESET':
            	 executionResults = rulesetUpload.save(resourceCategory, connectionId);
                break;
            case 'LEASE_CONTRACT_TYPE':
            	executionResults = LeaseContractTypeUpload.save(connectionId);
                break;
            case 'LESSOR':
            	executionResults = LessorUpload.save(connectionId);
            	break;
            case 'LEASE_CONTRACT':
            	executionResults = leaseContractUpload.save(resourceCategory, connectionId);
                break;
            case 'LEASE_CONTRACT_HIRE_TERM':
            	executionResults = leaseContractHireTermUpload.save(connectionId);
                break;
            case 'LEASE_CONTRACT_HIRE_CONDITION':
            	executionResults = leaseContractHireConditionUpload.save(connectionId);
                break;
            case 'FETCH_TU_GROUP':
                executionResults = rulesetGroupFetchTUUpload.save(resourceCategory,connectionId);
                break;
            case 'OPTIMIZE_TU_GROUP':
                executionResults = rulesetGroupOptimizeTUUpload.save(resourceCategory,connectionId);
                break;
            case 'FINALIZE_TU_GROUP':
                executionResults = rulesetGroupFinalizeTUUpload.save(resourceCategory,connectionId);

                break;
        }
        
        updateHistoryProc(newId, executionResults, STATUS_TYPE_ID_COMPLETED);
        return executionResults;
    } catch (e) {
        logger.error("MASSIVE_DATA_FILE_SAVE_FAILED", e);
        if(updateHistoryProc) {
        	updateHistoryProc(newId, [{'REC_CRTD': 0, 'REC_UPD': 0, 'RECORD_CNT':0}], STATUS_TYPE_ID_FAILED);
        	conn.commit();
        }
        throw new lib.InternalError(messages.MSG_ERROR_MASSIVE_DATA_UPLOAD, e);
    } finally {
        if (conn) {
            conn.close();
        }
    }
};

/**
 * Cancel Uploading CSV
 * 
 * @param tranFile
 */
massiveDataUploadService.cancel = function(params) {
    var metaData = params.obj[0];
    var connectionId = metaData.CONNECTION_ID;
    var type = metaData.OBJECT_TYPE;
    // Here are the mock data, just for test, need to remove after test
    // var connectionId = 'CONNECTION_ID_BEN_TEST';
    // var type = 'SUPP_DEMAND_PLAN';

    // write to the database
    try {
        switch (type) {
            case 'SUPP_DEMAND_PLAN':
               supplyDemandPlanUpload.cancel(connectionId);
                break;
            case 'LOC_GROUP_STOCK':
            	LocationGroupStockSettingsUpload.cancel(connectionId);
                break;
            case 'LOC_GROUP':
                LocationGroupsUpload.cancel(connectionId);
                break;
            case 'LOC_FILTERS':
               LocationFilterUpload.cancel(connectionId);
                break;
            case 'STOCK_LOC':
                //Stock Settings for Location
                LocationStockSettingsUpload.cancel(connectionId);
                break;
            case 'VIR_SUPP_DEMAND_PLAN':
                //Virtual Supply&Demand Plan
                VirtualSupplyDemandPlanUpload.cancel(connectionId);
                break;
            case 'KPI_PLAN':
            	scheduledKPIPlan.cancel(connectionId);
                break;
            case 'VIR_KPI_PLAN':
                virtualKPIPlanUpload.cancel(connectionId);
                break;
            case 'PICK_RET_RULESET':
            	rulesetUpload.cancel(connectionId);
                break;
            case 'LEASE_CONTRACT_TYPE':
            	LeaseContractTypeUpload.cancel(connectionId);
                break;
            case 'LESSOR':
            	LessorUpload.cancel(connectionId);
            	break;
            case 'LEASE_CONTRACT':
            	leaseContractUpload.cancel(connectionId);
                break;
            case 'LEASE_CONTRACT_HIRE_TERM':
            	leaseContractHireTermUpload.cancel(connectionId);
                break;
            case 'LEASE_CONTRACT_HIRE_CONDITION':
            	leaseContractHireConditionUpload.cancel(connectionId);
                break;
            case 'FETCH_TU_GROUP':
                rulesetGroupFetchTUUpload.cancel(connectionId);
                break;
            case 'OPTIMIZE_TU_GROUP':
                rulesetGroupOptimizeTUUpload.cancel(connectionId);
                break;
            case 'FINALIZE_TU_GROUP':
                rulesetGroupFinalizeTUUpload.cancel(connectionId);
                break;
        }
    } catch (e) {
        logger.error("MASSIVE_DATA_FILE_CANCEL_FAILED", e);
        throw new lib.InternalError(messages.MSG_ERROR_MASSIVE_DATA_UPLOAD, e);
    }
};

massiveDataUploadService.setRoutes([ {
    method : $.net.http.POST,
    scope : "collection",
    action : "upload"
}, {
    method : $.net.http.POST,
    scope : "collection",
    action : "save"
}, {
    method : $.net.http.PUT,
    scope : "collection",
    action : "cancel",
    response : $.net.http.NO_CONTENT
}]);

try {
    massiveDataUploadService.handle();
} finally {
    logger.close();
}