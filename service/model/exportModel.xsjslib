var messages = $.import("/sap/tm/trp/service/xslib/messages.xsjslib");

function ExportModel() {
    this.init = function(obj, getParams) {
        obj.USER_TIMEZONE_OFFSET = getParams("USER_TIMEZONE_OFFSET");
    };
}

ExportModel.prototype = {
	    validates: [
	    ],
	afterInitialize: ["init"]
};
