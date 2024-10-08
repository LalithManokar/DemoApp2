/*global jasmine, describe, beforeOnce, beforeEach, afterEach, afterOnce, xit, it, expect, spyOn*/
var lib, registrationObjectLib, registrationObject, proc, logger;

describe('registrationObject unit test', function() {
    // disable the handle method
    beforeOnce(function() {
        lib = $.import("/sap/tm/trp/service/xslib/railxs.xsjslib");
        lib.SimpleRest.prototype.handle = function() {};

        registrationObjectLib = $.import('/sap/tm/trp/service/user/registrationObject.xsjslib');

        registrationObject = registrationObjectLib.registrationObjectService;
        proc = registrationObjectLib.proc;
        logger = registrationObjectLib.logger;
    });

    beforeEach(function() {
        // stub logger
        spyOn(logger, 'error');
        spyOn(logger, 'success');
        spyOn(registrationObjectLib, 'updateResStockAlert').and.callFake(function(params) {
            return params;
        });
    });

    it("should create rule", function() {
        // create the virtual plan first
        var params = {
            obj: {}
        };

        spyOn(proc, "procedure").and.callFake(function() {
            return function() {
                return {
                    OUT_ALERT_RULE_ID: 1
                };
            };
        });

        var result = registrationObject.create(params);
        expect(result).toEqual({
            ID: 1
        });
    });

    it("should update rule", function() {
        // create the virtual plan first
        var params = {
            id: 2,
            obj: {}
        };

        spyOn(proc, "procedure").and.callFake(function() {
            return function() {
                return {
                    ENTRY_ID: 1
                };
            };
        });

        var result = registrationObject.update(params);
        expect(result).toBeUndefined();

    });

    it("should delete rule", function() {
        // create the virtual plan first
        var params = {
            id: 2,
            obj: {}
        };

        spyOn(proc, "procedure").and.callFake(function() {
            return function() {
                return {
                    MESSAGE: 'MSG_SUCCESS_STATUS'
                };
            };
        });

        var result = registrationObject.destroy(params);
        expect(result).toBeUndefined();

    });


    it("should face Filter", function() {
        // create the virtual plan first
        var params = {
            id: 2,
            obj: {}
        };

        spyOn(proc, "procedure").and.callFake(function() {
            return function() {
                return {
                    TYPE_LIST_OUTPUT: [{ID:1,DESC:"DESC1"},{ID:2,DESC:"DESC2"}],
                    CATEGORY_LIST_OUTPUT:[{ID:3,DESC:"DESC3"},{ID:4,DESC:"DESC4"}]
                };
            };
        });

        var result = registrationObject.facetFilter(params);
        expect(result.TYPE_ID).toEqual([{key:1,text:"DESC1"},{key:2,text:"DESC2"}]);
        expect(result.CATEGORY_ID).toEqual([{key:3,text:"DESC3"},{key:4,text:"DESC4"}]);

    });
});