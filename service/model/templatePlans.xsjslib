var lib = $.import('/sap/tm/trp/service/model/planLib.xsjslib');

var Plans = new lib.Plans();

Plans.locationInit = lib.locationInit;

Plans.resultInit = lib.resultInit;

Plans.mapInit = lib.mapInit;

Plans.detailsInit = lib.detailsInit;

Plans.downloadInit = lib.downloadInit;

lib.Plans.prototype.afterInitialize.push({
    method : 'locationInit',
    on : [ 'locations' ]
}, {
    method : 'resultInit',
    on : [ 'download', 'supplyDemandByLocation', 'supplyDemandByResource',
            'locationSupplyDemand', 'resourceSupplyDemand' ]
}, {
    method : 'mapInit',
    on : [ 'alertsOnMap', 'bubbleOnMap', 'pieOnMap' ]
}, {
    method : 'detailsInit',
    on : [ 'detailsByLocation', 'detailsByResource', 'allDetailsByLocation',
            'allDetailsByResource', 'allDetailsExpandByLocation',
            'allDetailsExpandByResource' ]
}, {
    method : 'downloadInit',
    on : [ 'download' ]
});
