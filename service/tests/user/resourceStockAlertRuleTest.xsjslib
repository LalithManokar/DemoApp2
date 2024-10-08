/*global jasmine, describe, beforeOnce, beforeEach, afterEach, afterOnce, xit, it, expect, spyOn*/
var lib, resourceStockAlertRuleLib, resourceStockAlertRule, proc, logger, registrationObjectLib;
describe('resource stock alert rule', function () {
    // disable the handle method
    beforeOnce(function() {
        lib = $.import("/sap/tm/trp/service/xslib/railxs.xsjslib");
        lib.SimpleRest.prototype.handle = function() {};

        resourceStockAlertRuleLib = $.import('/sap/tm/trp/service/user/resourceStockAlertRule.xsjslib');

        resourceStockAlertRule = resourceStockAlertRuleLib.resourceStockAlertRuleService;
        proc = resourceStockAlertRuleLib.proc;
        logger = resourceStockAlertRuleLib.logger;
        registrationObjectLib = resourceStockAlertRuleLib.registrationObjectLib;
    });

    beforeEach(function () {
        spyOn(logger, 'success');
        spyOn(logger, 'error');
    });

    it('should update rule', function () {
        spyOn(registrationObjectLib, 'update');
        spyOn(registrationObjectLib, 'updateResStockAlert');
        var params = {
            obj: {
                CATEGORY: 11
            }
        };
        resourceStockAlertRule.update(params);
        expect(registrationObjectLib.update).toHaveBeenCalled();
    });

    it('should update res stock alert', function () {
        spyOn(registrationObjectLib, 'update');
        spyOn(registrationObjectLib, 'updateResStockAlert');
        var params = {
            obj: {
                CATEGORY: 10
            }
        };
        resourceStockAlertRule.update(params);
        expect(registrationObjectLib.updateResStockAlert).toHaveBeenCalled();
    });
});
