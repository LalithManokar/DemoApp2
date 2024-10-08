/*global jasmine, describe, beforeOnce, beforeEach, afterEach, afterOnce, xit, it, expect, spyOn*/
describe("extensibility unit test", function () {
    var extensibility;
    var service;
    var lib;

    var extLib;

    beforeOnce(function () {
        lib = $.import("/sap/tm/trp/service/xslib/railxs.xsjslib");
        lib.SimpleRest.prototype.handle = function() { return; };

        service = $.import("/sap/tm/trp/service/admin/extensibility.xsjslib");
        extensibility = service.entity;

        extLib = $.import("/sap/tm/trp/service/xslib/ext.xsjslib");
    });

    it("should create an extended column", function () {
        spyOn(service, "Procedure").and.returnValue(
            function (pageId, name, displayName, description, searchable, filterable) {
                expect(pageId).toBe(1);
                expect(name).toBe("EXT_COL");
                expect(displayName).toBe("DISP_NAME");
                expect(description).toBe("DESC");
                expect(searchable).toBe(1);
                expect(filterable).toBe(0);

                return {
                    EXT_FIELD_ID: 1
                };
            }
        );

        var result = extensibility.create({
            obj: {
                PAGE_ID: 1,
                NAME: "EXT_COL",
                DISPLAY_NAME: "DISP_NAME",
                DESCRIPTION: "DESC",
                FILTERABLE: 0
            }
        });

        expect(result).toEqualObject({ID: 1});
    });

    it("should update an extened column", function () {
        spyOn(service, "Procedure").and.returnValue(
            function (id, displayName, description, searchable, filterable) {
                expect(id).toBe(1);
                expect(displayName).toBe("DISP_NAME");
                expect(description).toBe("DESC");
                expect(searchable).toBe(1);
                expect(filterable).toBe(0);
            }
        );

        function update() {
            extensibility.update({
                id: 1,
                obj: {
                    DISPLAY_NAME: "DISP_NAME",
                    DESCRIPTION: "DESC",
                    FILTERABLE:0
                }
            });
        }

        expect(update).not.toThrowError();
    });

    it("should delete an extended column", function () {
        spyOn(service, "Procedure").and.returnValue(
            function (id) {
                expect(id).toBe(1);
            }
        );

        function destroy() {
            extensibility.destroy({id:1});
        }

        expect(destroy).not.toThrowError();
    });

    it("should query facet filters", function () {
        spyOn(service, "Procedure").and.returnValue(
            function (search, pageIds) {
                expect(search).toBeDefined();
                expect(pageIds).toBeDefined();

                return {
                    FILTERED_OUTPUT: [{ID: 1, DESC: "TEXT"}]
                };
            }
        );

        var result = extensibility.facetFilter({obj: {search: "s", PAGE_ID_LIST_INPUT: []}});

        expect(result.PAGE_ID).toEqualObject([{key: 1, text: "TEXT"}]);
    });

    it("should extend resource and booking view and the odata service", function() {
        spyOn(extLib, 'Procedure').and.callFake(function () {
            return function () {
                return {
                    EXTENDED_COLUMNS: [{NAME: "COL1", PAGE_ID: 1}, {NAME: "COL2", PAGE_ID: 2}]
                };
            };
        });

        spyOn(extLib, "File").and.callFake(function() {
            this.setContent = function() { return; };

            this.content =
'service {\
    "sap.tm.trp.db.common::v_resource_head_ext_rc" as "ResourceRCExt"\
        create forbidden update forbidden delete forbidden;\
    "sap.tm.trp.db.common::v_freight_order_item_ext_rc" as "BookingRCExt"\
        create forbidden update forbidden delete forbidden;\
}';

            this.grant = function() { return; };
            this.create = function() { return; };
        });

        var ext = new extLib.Extensibility("CN");
        ext.extend();
    });

    it("should remove resource and booking view and the odata if the resource category is deleted", function() {
        spyOn(extLib, 'Procedure').and.callFake(function () {
            return function (id) {
                return [{
                    CODE: "RC"
                }][id];
            };
        });

        spyOn(extLib, "File").and.callFake(function() {
            this.setContent = function(content) {
                expect(content.toString()).toBe(
'service {\n\
\t"sap.tm.trp.db.equipment::cv_equipment_visibility_equip_info" as "ResourceMasterTable"\n\
\t\tkey generate local "BOOKING_ID"\n\
\t\tparameters via entity\n\
\t\tcreate forbidden update forbidden delete forbidden;\n\
\n\
\t"sap.tm.trp.db.booking::cv_booking" as "EmptyBookingMasterTable"\n\
\t\tkey generate local "EQUIPMENT_ID"\n\
\t\tparameters via entity\n\
\t\tcreate forbidden update forbidden delete forbidden;\n\
\n\
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
            this.create = function() { return; };
        });

        var ext = new extLib.Extensibility("RC");
        ext.revert();
    });
});
