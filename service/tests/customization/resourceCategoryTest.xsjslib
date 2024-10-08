/*global jasmine, describe, beforeOnce, beforeEach, afterEach, afterOnce, xit, it, expect, spyOn*/
var lib;
var rc;
var rcLib;
var proc;
var logger;
describe('resource category unit test', function() {

    // disable the handle method
    beforeOnce(function() {
        lib = $.import("/sap/tm/trp/service/xslib/railxs.xsjslib");
        lib.SimpleRest.prototype.handle = function() { return; };
        rcLib = $.import('/sap/tm/trp/service/customization/resourceCategory.xsjslib');
        rc = rcLib.resourceCategory;
        logger = rcLib.logger;
    });

    it('should create a resource category', function() {
        // mock the procedure
        spyOn(rcLib, 'Procedure').and.callFake(function() {
            return function(name, desc, resourceCategoryType, resourceGroupType, enableFlag, leaseContractFlag, baseResourceType, resourceClass,
                resourceGroups, positioningParameter) {
                if (name === 'notInSelectedCategory') {
                    return {
                        RESOURCE_CATEGORY_ID: name,
                        MESSAGE: 'MSG_BASE_RESOURCE_TYPE_NOT_IN_SELECTED_CATEGORY'
                    };
                } else if (name === 'toThrowError') {
                    throw new Error('execute error');
                }
                return {
                    RESOURCE_CATEGORY_ID: name,
                    MESSAGE: ''
                };
            };
        });

        spyOn(rcLib, "extendView");

        var params = {
            obj: {
                NAME: '1'
            }
        };

        expect(rc.create(params)).toEqual({
            ID: '1'
        });

        params.obj.NAME = 'notInSelectedCategory';
        expect(function() {
            rc.create(params);
        }).toThrowError('MSG_BASE_RESOURCE_TYPE_NOT_IN_SELECTED_CATEGORY');

        params.obj.NAME = 'toThrowError';
        expect(function() {
            rc.create(params);
        }).toThrowError('execute error');
    });

    it('should update a resource category', function () {
        spyOn(rcLib, 'Procedure').and.callFake(function () {
            return function (id, name) {
                if (name === 'notInSelectedCategory') {
                    return {
                        RESOURCE_CATEGORY_ID: id,
                        MESSAGE: 'MSG_BASE_RESOURCE_TYPE_NOT_IN_SELECTED_CATEGORY'
                    };
                } else if (name === 'throwWebApplicationError') {
                    throw new lib.WebApplicationError('WEB_APPLICATION_ERROR');
                } else if (name === 'throwError') {
                    throw new Error('error');
                }
                return {
                    RESOURCE_CATEGORY_ID: id,
                    MESSAGE: ''
                };
            };
        });
        spyOn(rcLib, "extendView");
        spyOn(logger, 'success');

        var params = {
            obj: {
                id: 1
            }
        };

        rc.update(params);
        expect(logger.success).toHaveBeenCalled();

        params.obj.NAME = 'notInSelectedCategory';
        expect(function () {
            rc.update(params);
        }).toThrowError('MSG_BASE_RESOURCE_TYPE_NOT_IN_SELECTED_CATEGORY');

        params.obj.NAME = 'throwError';
        expect(function () {
            rc.update(params);
        }).toThrowError('error');

        params.obj.NAME = 'throwWebApplicationError';
        expect(function () {
            rc.update(params);
        }).toThrowError(lib.WebApplicationError);
    });

    it('should delete a resource category', function () {
        spyOn(rcLib, 'Procedure').and.callFake(function () {
            return function (id) {
                switch (id) {
                    case 1:
                        break;
                    case 2:
                        throw new lib.WebApplicationError();
                    default:
                        throw new Error('error');
                }
            };
        });
        spyOn(rcLib, "removeExtendView");
        spyOn(logger, 'success');

        var params = {
            id: 1
        };

        rc.destroy(params);
        expect(logger.success).toHaveBeenCalled();

        params.id = 2;
        expect(function () {
            rc.destroy(params);
        }).toThrowError(lib.WebApplicationError);

        params.id = null;
        expect(function () {
            rc.destroy(params);
        }).toThrowError('error');
    });

    it('should get group type by resource category', function() {
        // mock the procedure
        spyOn(rcLib, 'Procedure').and.callFake(function() {
            return function(type) {
                var groupType;
                switch (type) {
                    case 'CN':
                        groupType = 1;
                        break;
                    case 'RC':
                        groupType = 2;
                        break;
                    case 'GE':
                        groupType = 3;
                        break;
                        // otherwise throw an error which will be caught by outside method
                    default:
                        throw new Error('type error');
                }
                return [
                    {
                        RESOURCE_GROUP_TYPE: groupType,
                        GROUP_TYPE_DESC: 'desc'
                    }
                ];
            };
        });
        // mock the logger
        spyOn(logger, 'success');

        // initialize the params
        var params = {
            obj: {
                resourceCategoryType: 'CN'
            }
        };

        var result = rc.getGroupTypes(params);
        // check the result
        expect(result).toEqual([
            {
                RESOURCE_GROUP_TYPE: 1,
                GROUP_TYPE_DESC: 'desc'
            }
        ]);

        // check the wrong params
        params.obj.resourceCategoryType = 'test';
        expect(function() {
            rc.getGroupTypes(params);
        }).toThrowError('type error');
    });

    it('should get resource type', function() {
        // mock the procedure
        spyOn(rcLib, 'Procedure').and.callFake(function() {
            return function(resourceGroups) {
                if (resourceGroups === null) {
                    throw new Error('wrong');
                }
                return resourceGroups.map(function(i) {
                    return {
                        RESOURCE_TYPE: i.EQUI_TYPE,
                        RESOURCE_TYPE_DESC: 'desc'
                    };
                });
            };
        });

        var params = {
            obj: {
                RESOURCE_GROUPS: [
                    {
                        EQUI_TYPE: 'TL'
                    },
                    {
                        EQUI_TYPE: 'ZTL'
                    }
                ]
            }
        };

        expect(rc.getResourceTypes(params)).toEqual(
            [{
                RESOURCE_TYPE: 'TL',
                RESOURCE_TYPE_DESC: 'desc'
            }, {
                RESOURCE_TYPE: 'ZTL',
                RESOURCE_TYPE_DESC: 'desc'
            }]
        );

        // check the wrong params
        params.obj.RESOURCE_GROUPS = null;
        expect(function() {
            rc.getResourceTypes(params);
        }).toThrowError();
    });

    it('should query by filter', function () {
        spyOn(rcLib, 'Procedure').and.callFake(function () {
            return function (search, RESOURCE_CATEGORY_TYPE_LIST, ENABLE_FLAG_LIST) {
                if (!search) {
                    throw new Error('search error');
                }
                return {
                    RESOURCE_CATEGORY_TYPE_OUTPUT: [
                        {
                            KEY: 1,
                            TEXT: 'text1'
                        }, {
                            KEY: 2,
                            TEXT: 'text2'
                        }
                    ],
                    ENABLE_FLAG_OUTPUT: [
                        {
                            KEY: 1,
                            TEXT: 'flag1'
                        }
                    ]
                };
            };
        });


        var params = {
            obj: {
                search: 'test'
            }
        };

        expect(rc.queryFacetFilter(params)).toEqual({
            RESOURCE_CATEGORY_TYPE: [
                {
                    key: 1,
                    text: 'text1'
                }, {
                    key: 2,
                    text: 'text2'
                }
            ],
            ENABLE_FLAG: [
                {
                    key: 1,
                    text: 'flag1'
                }
            ]
        });
    });

    it("should extend resource and booking view and the odata service", function() {
        expect(rcLib.extendView).toBeDefined();

        spyOn(rcLib, 'Procedure').and.callFake(function () {
            return function () {
                return {
                    EXTENDED_COLUMNS: [{NAME: "COL1", PAGE_ID: 1}, {NAME: "COL2", PAGE_ID: 2}]
                };
            };
        });

        spyOn(rcLib, "File").and.callFake(function() {
            this.setContent = function() { return; };

            this.content =
'service {\
    "sap.tm.trp.db.common::v_resource_head_ext_rc" as "ResourceRCExt"\
        create forbidden update forbidden delete forbidden;\
    "sap.tm.trp.db.common::v_freight_order_item_ext_rc" as "BookingRCExt"\
        create forbidden update forbidden delete forbidden;\
}';

            this.grant = function()  { return; };
        });

        rcLib.extendView(1, "CN");
    });

    it("should remove resource and booking view and the odata if the resource category is deleted", function() {
        expect(rcLib.removeExtendView).toBeDefined();

        spyOn(rcLib, 'Procedure').and.callFake(function () {
            return function (id) {
                return [{
                    CODE: "RC"
                }][id];
            };
        });

        spyOn(rcLib, "File").and.callFake(function() {
            this.setContent = function(content) {
                expect(content.toString()).toBe('service {\n\
\t"sap.tm.trp.db.booking::cv_booking" as "EmptyBookingMasterTable"\n\
\t\tkey generate local "BOOKING_ID"\n\
\t\tparameters via key and entity\n\
\t\tcreate forbidden update forbidden delete forbidden;\n\
\n\
\t"sap.tm.trp.db.equipment::cv_equipment_visibility_equip_info" as "ResourceMasterTable"\n\
\t\tkey generate local "EQUIPMENT_ID"\n\
\t\tparameters via entity\n\
\t\tcreate forbidden update forbidden delete forbidden;\n\
\n\
}');
            };

            this.content =
'service {\
    "sap.tm.trp.db.common::v_resource_head_ext_rc" as "ResourceRCExt"\
        create forbidden update forbidden delete forbidden;\
    "sap.tm.trp.db.common::v_freight_order_item_ext_rc" as "BookingRCExt"\
        create forbidden update forbidden delete forbidden;\
}';

            this.remove = function() { return; };
        });

        rcLib.removeExtendView(0);
    });
});
