function Consent() {
    this.deleteInit = function(obj, getParams) {
        obj.userName = getParams("USER_NAME");
    };
}
Consent.prototype = {
    afterInitialize : [ {
        method : 'deleteInit',
        on : [ 'delete' ]
    } ]
};

function userConsent() {
    this.downloadInit = function(obj, getParams) {
        obj.userName = getParams("USER_NAME");
        obj.timeZoneSet = getParams("TIME_ZONE_SET");
    };
}
userConsent.prototype = {
    afterInitialize : [ {
        method : 'downloadInit',
        on : [ 'download' ]
    } ]
};


function mainData() {
    this.downloadInit = function(obj, getParams) {
        obj.userName = getParams("USER_NAME");
        obj.timeZoneSet = getParams("TIME_ZONE_SET");
    };
}
mainData.prototype = {
        afterInitialize : [ {
            method : 'downloadInit',
            on : [ 'download' ]
        } ]
};


function appPrivilege() {
    this.downloadInit = function(obj, getParams) {
        obj.userName = getParams("USER_NAME");
    };
}
appPrivilege.prototype = {
        afterInitialize : [ {
            method : 'downloadInit',
            on : [ 'download' ]
        } ]
};


function whereUsed() {
    this.downloadInit = function(obj, getParams) {
        obj.userName = getParams("USER_NAME");
    };
}
whereUsed.prototype = {
        afterInitialize : [ {
            method : 'downloadInit',
            on : [ 'download' ]
        } ]
};

function userRole() {
    this.downloadInit = function(obj, getParams) {
        obj.userName = getParams("USER_NAME");
    };
}
userRole.prototype = {
        afterInitialize : [ {
            method : 'downloadInit',
            on : [ 'download' ]
        } ]
};