var remote = new($.import("sap.tm.trp.service.xslib", "remote").RemoteClient)();
var InternalError = ($.import("/sap/tm/trp/service/xslib/railxs.xsjslib")).InternalError;

function callLDDservice(reqObj) {
   
	try {
		var serviceRequest = {
			REQUEST: reqObj
		};

		var result;

		remote.request({
			url: '/sap/bc/rest_trp/network_lddd',
			data: serviceRequest,
			method: $.net.http.POST,
			csrfDisabled: true,
			success: function(data) {
				result = {
					data: [],
					success: true
				};
				if (data.RESULT){
			        result.data = data.RESULT.map(function(lane){
            	        lane.DURATION = Math.floor(lane.DURATION / 10000) * 3600 + 
                        Math.floor((lane.DURATION % 10000) / 100) * 60 + 
                        lane.DURATION % 100;
                        return lane;
	                });
				}
			},
			error: function(data) {
			    try{
    				result = {
    					message: data.body ? JSON.parse(data.body.asString()).MESSAGE : [{SEVERITY: 'E', MESSAGE: data.status}],
    					success: false
    				}; 
			    } catch (e) {
                    throw new InternalError("MSG_TRP_INTERNAL_OUTBOUND_CONNECT_ERROR", data.body ? data.body.asString() : '');
                }
			}
		});
		return result;
	} catch (e) {
		// Handling exception later
		throw e;
	}
}

function getGatewayConns(locations) {
	var arrayValues = [];
	
	if(typeof(locations)==='object'){
	    Object.keys(locations).map(function(item) {
		arrayValues.push(locations[item].LOCATION_ID);
	});
	}else{
	locations.map(function(item) {
		arrayValues.push(item.LOCATION_ID);
	});}

	var reqObj = {
		LOC_PAIR: [],
		LOC_FROM: arrayValues,
		LOC_TO: [],
		FROM_TIME: "",
		TO_TIME: "",
		ADD_GTW: "X",
		ADD_TSP: "X",
		PARALLEL: ""
	};

	return callLDDservice(reqObj);
}

function getDirectedGWConns(fromLocations, toLocations) {
	var reqObj = {
		LOC_PAIR: [],
		LOC_FROM: fromLocations,
		LOC_TO: toLocations,
		FROM_TIME: "",
		TO_TIME: "",
		ADD_GTW: "X",
		ADD_TSP: "X",
		PARALLEL: ""
	};
	return callLDDservice(reqObj);
}

function getDirectedConns(fromLocations, toLocations) {
	var reqObj = {
		LOC_PAIR: [],
		LOC_FROM: fromLocations,
		LOC_TO: toLocations,
		FROM_TIME: "",
		TO_TIME: "",
		ADD_GTW: "",
		ADD_TSP: "X",
		PARALLEL: ""
	};
	return callLDDservice(reqObj);
}