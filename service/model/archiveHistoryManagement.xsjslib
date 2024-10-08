var messages = $.import("/sap/tm/trp/service/xslib/messages.xsjslib");

function ArchiveHistoryManagement() {
    this.initfacetFilter = function(obj){
        obj.search = obj.search ? obj.search.toLowerCase() : ""
        var filterObj = obj.filters || {};
        obj.TYPES = filterObj.hasOwnProperty('TYPE') ? filterObj.TYPE.map(function(value){ return {ID: value}; }) : [];
        obj.STATUS = filterObj.hasOwnProperty('STATUS') ? filterObj.STATUS.map(function(value){ return {ID: value}; }) : [];
    };

}

ArchiveHistoryManagement.prototype = {
validates: [
    {
        field: 'filters',
        on: ['facetFilter'],
        validateWith: function(obj){
            var filterObj = obj.filters;
            if (!filterObj){
                return true;
            }
            else {
                if (!(filterObj instanceof Object)){
                    return false;
                }
                if (filterObj.hasOwnProperty('TYPE') && !(filterObj.TYPE instanceof Array)){
                    return false;
                }
                return true;
            }
        },
        message: messages.MSG_FIELD_INVALID,
        args: ['{filters}']
    }

],

afterInitialize: [
{
	method:'initfacetFilter',
	on:['facetFilter']
}

]
};
