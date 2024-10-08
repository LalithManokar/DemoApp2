var lib = $.import("/sap/tm/trp/service/xslib/railxs.xsjslib");
var proc = $.import("sap.tm.trp.service.xslib", "procedures");
var bundleLib = $.import("sap.hana.xs.i18n", "text");
var constants = $.import('/sap/tm/trp/service/xslib/constants.xsjslib');
var logger = new($.import("/sap/tm/trp/service/xslib/applog.xsjslib")).AppLog();

var bundle = bundleLib.loadBundle("sap.tm.trp.service.xslib", "messages");

var UNRESTRICTED_READ_PREVILEGE = "sap.tm.trp.service::UnrestrictedRead";
var UNRESTRICTED_WRITE_PREVILEGE = "sap.tm.trp.service::UnrestrictedWrite";

var availabilityCheckService = new lib.SimpleRest({
    name: "AvailabilityCheck",
    desc: "availability check service"
});

/**
 * Builds the text message based on message id and arguments
 */
function buildTextMessage(messages) {
    var messageResult = {};

    messageResult.success = true;
    messageResult.messages = [];
    //Array.from(messages).forEach(function(message) {
    messages.forEach(function(message) {
        var text = bundle.getText(
            message.MESSAGE_ID, {
                0: message.VAR0,
                1: message.VAR1,
                2: message.VAR2,
                3: message.VAR3,
                4: message.VAR4
            });

        if (message.SEVERITY === 'E') {
            messageResult.success = false;
        }

        messageResult.messages.push({
            SEVERITY: message.SEVERITY,
            MESSAGE: text
        });
    });

    return messages;
}

function groupResultBySdPlan(spInterimresult) {
    var iter = null;
    var row = null;
    var sdIndex = -1;
    var curr_sd_plan, old_sd_plan, sdDetails, sdId, i;
	var finalResult = [];	
//	iter = spInterimresult.INTERIMRESULT.getIterator();
//	while (iter.next()) {
    for (i = 0; i< spInterimresult.check_result.length; i++ ) {
	    row = spInterimresult.check_result[i];
	    old_sd_plan = curr_sd_plan; 
	    curr_sd_plan = row.SD_PLAN;
	    if (curr_sd_plan === old_sd_plan ){
	        sdDetails = {
	            LOCATION_NO : row.LOCATION_NO,
	            EQUIP_TYPE  : row.EQUIP_TYPE,
	            START_TIME  : row.START_TIME,
	            END_TIME    : row.END_TIME,
	            SUPPLY      : row.SUPPLY,
	            DEMAND      : row.DEMAND,
	            LEVEL       : row.LEVEL  
	        }
	        finalResult[sdIndex].SD_DETAILS.push(sdDetails);
	        
	    }
	    else {
	        sdIndex ++;
	        sdDetails = {
	            LOCATION_NO : row.LOCATION_NO,
	            EQUIP_TYPE  : row.EQUIP_TYPE,
	            START_TIME  : row.START_TIME,
	            END_TIME    : row.END_TIME,
	            SUPPLY      : row.SUPPLY,
	            DEMAND      : row.DEMAND,
	            LEVEL       : row.LEVEL
	        }	        
	        finalResult[sdIndex] = {	        
	            SD_PLAN : row.SD_PLAN,
	            SD_DETAILS : [sdDetails]
	        }
	    }
	} 
    
    /*spInterimresult.CHECK_RESULT = finalResult;
	delete(spInterimresult.INTERIMRESULT);
	return spInterimresult; */
	return finalResult;
    
}


/**
 * Execute streeturn optimization
 *
 */
function executeStoredProcedure(request) {

    var conn, executeSP, messageResult, spResult, FinalResult; 
    var spFinalResult = {
	RESULT_MAPPING: [],
	MESSAGE: [],
	SUCCESS:'',
	CHECK_RESULT:[]
    };
 
    // conn = $.db.getConnection($.db.isolation.READ_COMMITTED);
    // conn.setAutoCommit(false);

    // //Run optimization
    // executeSP = new proc.procedure(
    //     constants.SCHEMA_NAME,
    //     "sap.tm.trp.db.availabilitycheck::p_batch_check_availability", {
    //         connection: conn
    //     }
    // ); 
   
    var conn = $.hdb.getConnection({"isolationLevel": $.hdb.isolation.READ_COMMITTED});    
    var executeSP = conn.loadProcedure(constants.SCHEMA_NAME,"sap.tm.trp.db.availabilitycheck::p_batch_check_availability"); 
    
    //Generate request Clob
      
      var lv_request_clob = "";
      for (var i = 0; i < request.length; i++) {
          if (request[i].ITEM_ID === "")     { request[i].ITEM_ID = ' '; }
          if (request[i].LOCATION_NO === "") { request[i].LOCATION_NO = ' '; }
          if (request[i].EQUIP_TYPE === "")  { request[i].EQUIP_TYPE = ' '; }
          if (request[i].TIME === "")        { request[i].TIME = ' '; }
          if (request[i].QUANTITY === "")    { request[i].QUANTITY = 0; }
          if (request[i].REQUEST_CHECK_TYPE === "") { request[i].REQUEST_CHECK_TYPE = ' '; }
          
          if (i !== request.length - 1) {
              lv_request_clob = lv_request_clob +   request[i].ITEM_ID + "," + 
                                                    request[i].LOCATION_NO + "," + 
                                                    request[i].EQUIP_TYPE + "," + 
                                                    request[i].TIME + "," + 
                                                    request[i].QUANTITY + "," + 
                                                    request[i].REQUEST_CHECK_TYPE + "~";
                                                    
          } else {
              //last request - no title concat required
              lv_request_clob = lv_request_clob + request[i].ITEM_ID + "," + 
                                                  request[i].LOCATION_NO + "," + 
                                                  request[i].EQUIP_TYPE + "," + 
                                                  request[i].TIME + "," + 
                                                  request[i].QUANTITY + "," +                                                
                                                  request[i].REQUEST_CHECK_TYPE; 
          }
      }     
    

    //spResult = executeSP(request);
    spResult = executeSP(lv_request_clob);
    
	if (spResult.T_MESSAGE && spResult.T_MESSAGE.length > 0) {
        messageResult = buildTextMessage(spResult.T_MESSAGE);
        spFinalResult.SUCCESS = messageResult.success;
        spFinalResult.MESSAGES = messageResult.messages;
    } else {
        spFinalResult.SUCCESS = true;
    }
     
    var row = null;
    var row1 = null;
    for (i = 0; i< spResult.result_mapping.length; i++ ) {
	    row = spResult.result_mapping[i];
	   spFinalResult.RESULT_MAPPING.push(row);
     }
     for (i = 0; i< spResult.message.length; i++ ) {
	    row1 = spResult.message[i];
	   spFinalResult.MESSAGE.push(row1);
     }     
    
    FinalResult=groupResultBySdPlan(spResult);
    if(FinalResult.length>0){
	   spFinalResult.CHECK_RESULT = FinalResult;   
     }
	return spFinalResult;
}


/**
 *  Request handling starts here.
 *  Existing framework not used due to some mismatch.
 *  Check to see whether it can be enhanced to support message handling.
 */
availabilityCheckService.check = function(params) {
    var result = {};
    result.SUCCESS = true;
    result.MESSAGES = [];
    try {

        result = executeStoredProcedure(
            params.obj
        );
        logger.success("AVAILABILITY_CHECK", params);
    } catch (e) {
        logger.error("AVAILABILITY_CHECK_FAILED",
            params,
            e
        );
        throw new lib.InternalError(e);
    }

    return result;
};

// Customized template to reutrn the result with success flag set
availabilityCheckService.template = function(obj) {
    var response = {};
    if (obj instanceof Error) {
        response.SUCCESS = false;
        response.MESSAGES = (obj.hasOwnProperty("cause") && Array.isArray(obj.cause) ? obj.cause : [obj.message || obj.cause]).map(function(i, d, a) {
            return {
                type: "ERROR",
                message: typeof i === "string" ? i : i.message,
                args: i.args
            };
        });
    } else {
        response = obj;
    }

    return response;
};

availabilityCheckService.setRoutes([{
    method: $.net.http.POST,
    scope: "collection",
    action: "check"
}]);

try {
    availabilityCheckService.handle();
} finally {
    logger.close();
}
