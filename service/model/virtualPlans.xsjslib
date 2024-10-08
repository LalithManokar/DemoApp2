var lib = $.import('/sap/tm/trp/service/model/planLib.xsjslib');

var Plans = new lib.Plans();

Plans.availableInit = lib.availableInit;

Plans.checkInit = lib.checkInit;

Plans.infoInit = lib.infoInit;

Plans.resultInit = lib.resultInit;

Plans.mapInit = lib.mapInit;

Plans.detailsInit = lib.detailsInit;

Plans.downloadInit = lib.downloadInit;

lib.Plans.prototype.afterInitialize.push({
    method: 'availableInit',
    on: ['availablePlans']
}, {
    method: 'checkInit',
    on: ['checkSubPlan']
}, {
    method: 'infoInit',
    on: ['virtualPlanInfo']
}, {
    method: 'resultInit',
    on: ['supplyDemandByLocation', 'supplyDemandByResource', 'locationSupplyDemand', 'locationSupplyDemand', 'resourceSupplyDemand', 'download']
}, {
    method: 'mapInit',
    on: ['alertsOnMap', 'bubbleOnMap', 'pieOnMap']
}, {
    method: 'detailsInit',
    on: ['detailsByLocation', 'detailsByResource' , 'allDetailsByLocation', 'allDetailsByResource', 'allDetailsExpandByLocation', 'allDetailsExpandByResource']
}, {
    method : 'downloadInit',
    on : [ 'download' ]
});
