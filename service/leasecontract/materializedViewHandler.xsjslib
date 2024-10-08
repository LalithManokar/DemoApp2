var proc = $.import("/sap/tm/trp/service/xslib/procedures.xsjslib");
var constants = $.import("/sap/tm/trp/service/xslib/constants.xsjslib");
var logger = new ($.import("/sap/tm/trp/service/xslib/applog.xsjslib")).AppLog();
var jobFactory = $.import("/sap/tm/trp/service/common/job/JobFactory.xsjslib");

var MAX_EXECUTION_NUM = 100000;

var STATUS = {
		DIRTY:1,
		SCHEDULED:2,
		PROCESSING:3,
		FINISHED:4,
		ERROR:5,
		ABANDONED:6
};


var ACTION={
		UPDATE:1,
		DELETE:2,
		EXTERNAL:3
};

var SOURCE={
		RESOURCE:1,
		LOCATION:2
};

function sourceToString(s)
{
	switch(s)
	{
		case SOURCE.RESOURCE : return "Resource"; break;
		case SOURCE.LOCATION : return "Location"; break;
	}
	
	return "";
}

function actionToString(s)
{
	switch(s)
	{
		case ACTION.UPDATE : return "Update"; break;
		case ACTION.DELETE : return "Delete"; break;
		case ACTION.EXTERNAL:return "External"; break;
	}
	
	return "";
}

function execute(params)
{
	try{
		 var isBusy = new proc.procedure(constants.SCHEMA_NAME, "sap.tm.trp.db.leasecontract::sp_lease_materialization_running");
		 var statusCount = isBusy().STATUS;
		 if(statusCount  > 0)
		 {
			 logger.info(
		                "LEASE_CONTRACT_MATERIALIZATION_SKIP",
		                statusCount
		            );
			 return;
		 }
		 var loopNum = 0;
		 while(true){
			
			 //check queue count
			 var getDirtyCount = new proc.procedure(constants.SCHEMA_NAME, "sap.tm.trp.db.leasecontract::sp_lease_object_change_get_dirty_count");
			 var dirtyCount = getDirtyCount().STATUS;
			 if(dirtyCount === 0 || loopNum++ > MAX_EXECUTION_NUM)
			 {
				 break; //Nothing to materialize
			 }
			 
			 var isFullMatrializationNeeded = new proc.procedure(constants.SCHEMA_NAME, "sap.tm.trp.db.leasecontract::sp_lease_need_full_materialization");
			 var isFull = isFullMatrializationNeeded().STATUS;
			 if(isFull > 0)
			 {
				 var abandonDeltaRequests = new proc.procedure(constants.SCHEMA_NAME, "sap.tm.trp.db.leasecontract::sp_lease_materialization_set_delta_abandoned");
				 abandonDeltaRequests();
				 
			 }
			 //update status 
			 var updateScheduled = new proc.procedure(constants.SCHEMA_NAME, "sap.tm.trp.db.leasecontract::sp_lease_object_change_status");
			 updateScheduled(STATUS.DIRTY ,STATUS.SCHEDULED);
			 
			 //Call recalc SP		 
			if(isFull >  0)
			{
				 var materializedViewFullUpdate = new proc.procedure(constants.SCHEMA_NAME, "sap.tm.trp.db.leasecontract::sp_lease_contract_hire_term_materialized_full");
				 materializedViewFullUpdate();
				 
			}else{
					 var materializedViewUpdate = new proc.procedure(constants.SCHEMA_NAME, "sap.tm.trp.db.leasecontract::sp_lease_contract_hire_term_materialized_delta");
					 materializedViewUpdate();
			}
			logger.success(
		                "LEASE_CONTRACT_MATERIALIZATION_SUCCESS",
		                dirtyCount
		            );
		 }
		
	}catch(e){
		 logger.error(
	                "LEASE_CONTRACT_MATERIALIZATION_FAILED",
	                e.message
	            );
		 
		 var updateStatus = new proc.procedure(constants.SCHEMA_NAME, "sap.tm.trp.db.leasecontract::sp_lease_object_change_status");
		 if(params.hasOwnProperty('error')   && params.error === true)
		 {
			 updateStatus(STATUS.SCHEDULED ,STATUS.ERROR);
			 
		 }else{ // Re execute one more time
			 updateStatus(STATUS.SCHEDULED ,STATUS.DIRTY);
			 jobFactory.create("MaterializedViewHandler job - Re execute","sap.tm.trp.service.leasecontract","materializedViewHandler","execute",{error:true});
		 }
		 throw new Error(e.message);
		
	}finally{
		logger.colse();
	}

}

function MaterializedViewNotifier(objectSource)
{
	this.source = objectSource;
	
	MaterializedViewNotifier.prototype.notify = function(objectId,objectType,actionType)
	{
		try{
			//Register entry
		    var addEntry = new proc.procedure(constants.SCHEMA_NAME, "sap.tm.trp.db.leasecontract::sp_lease_object_change_add_entry");
		    addEntry(objectId,this.source,mapObjectType(this.source,objectType),actionType);
		    
		    jobFactory.create("MaterializedViewHandler job - Notify","sap.tm.trp.service.leasecontract","materializedViewHandler","execute",{});
		    logger.success(
	                "LEASE_CONTRACT_MATERIALIZATION_SCHEDULE_SUCCESS",
	                sourceToString(this.source),
	                objectId,
	                objectType,
	                actionToString(actionType)
	            );
		    
		}catch(e)
		{
			logger.error(
	                "LEASE_CONTRACT_MATERIALIZATION_SCHEDULE_ERROR",
	                e.message,
	                sourceToString(this.source),
	                objectId,
	                objectType,
	                actionToString(actionType)
	            );
		    
			
		}finally{
			logger.close();
		}
		
		
	}



	function mapObjectType(source,type){
		
		if(source === SOURCE.LOCATION)
		{
			switch(type){
			
				case 1: return 2; break; //Location Group
				case 3: return 6; break; // region Group
				default: return type;
			}
		}
		
		return type;
	}
	

}