/*global jasmine, describe, beforeOnce, beforeEach, afterEach, afterOnce, xit, it, expect, spyOn*/
var lib, activityLib, activity, logger, constants;

describe('activity unit test', function () {
    beforeOnce(function () {
        lib = $.import('/sap/tm/trp/service/xslib/railxs.xsjslib');
        lib.SimpleRest.prototype.handle = function() {
        };

        activityLib = $.import('/sap/tm/trp/service/planningcockpit/activity.xsjslib');
        activity = activityLib.activity;
        logger = activityLib.logger;
        constants = activity.constants;
    });

    beforeEach(function () {
        spyOn(logger, 'success');
        spyOn(logger, 'error');
    });

    it('should update the activity', function () {
        spyOn(activityLib, 'Procedure').and.returnValue(
            function () {
                return {
                    MESSAGE: 'MSG_SUCCESS_STATUS',
                    MODIFIED_BY: 'TRPADM'
                };
            }
        );

        var params = {
            obj: {

            }
        };

        activity.update(params);
        expect(logger.success).toHaveBeenCalled();
    });

    it('should throw an error while update', function () {
        spyOn(activityLib, 'Procedure').and.returnValue(
            function () {
                return {
                    MESSAGE: 'MSG_ERROR_STATUS',
                    MODIFIED_BY: 'TRPADM'
                };
            }
        );

        var params = {
            obj: {}
        };
        expect(function () {
            activity.update(params);
        }).toThrowError(lib.InternalError);
    });

    it('should delete an activity', function () {
        spyOn(activityLib, 'Procedure').and.returnValue(
            function () {
                return {
                    MESSAGE: 'MSG_SUCCESS_STATUS',
                    MODIFIED_BY: 'TRPADM'
                };
            }
        );

        var params = {
            id: 1
        };

        activity.destroy(params);
        expect(logger.success).toHaveBeenCalled();
    });

    it('should throw an error', function () {
        var params = {};
        expect(function () {
            activity.destroy(params);
        }).toThrowError(lib.InternalError);
    });
});
