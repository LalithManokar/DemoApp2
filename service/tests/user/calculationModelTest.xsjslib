/*global jasmine, describe, beforeOnce, beforeEach, afterEach, afterOnce, xit, it, expect, spyOn*/
var lib, calculationModelLib, calculationModel, proc, logger;

describe('calculationModel unit test', function() {
    // disable the handle method
    beforeOnce(function() {
        lib = $.import("/sap/tm/trp/service/xslib/railxs.xsjslib");
        lib.SimpleRest.prototype.handle = function() {};

        calculationModelLib = $.import('/sap/tm/trp/service/user/calculationModel.xsjslib');

        calculationModel = calculationModelLib.CalculationModelService;
        proc = calculationModelLib.proc;
        logger = calculationModelLib.logger;
    });

    beforeEach(function() {
        // stub logger
        spyOn(logger, 'error');
        spyOn(logger, 'success');
        spyOn(calculationModelLib, 'buildAlertRule').and.callFake(function(params) {
            return params;
        });
    });

    it("should create calculation mode", function() {
        // create the virtual plan first
        var params = {
            obj: {}
        };

        spyOn(proc, "Procedure").and.callFake(function() {
            return function() {
                return {
                    PIPELINE_MODEL_ID: 1
                };
            };
        });

        var result = calculationModel.create(params);
        expect(result).toEqual({
            ID: 1
        });
    });

    it("should update calculation mode", function() {
        // create the virtual plan first
        var params = {
            id: 2,
            obj: {}
        };

        spyOn(proc, "Procedure").and.callFake(function() {
            return function() {
                return {
                    ENTRY_ID: 1
                };
            };
        });

        var result = calculationModel.update(params);
        expect(result).toEqual({
            ID: 2
        });

    });

    it("should delete calculation mode", function() {
        // create the virtual plan first
        var params = {
            id: 2,
            obj: {}
        };

        spyOn(proc, "Procedure").and.callFake(function() {
            return function() {
                return {
                    MESSAGE: 'MSG_SUCCESS_STATUS'
                };
            };
        });

        var result = calculationModel.destroy(params);
        expect(result).toBeUndefined();

    });
});