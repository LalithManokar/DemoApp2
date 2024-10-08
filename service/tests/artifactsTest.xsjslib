/*global jasmine, describe, beforeOnce, beforeEach, afterEach, afterOnce, xit, it, expect, spyOn*/
describe("artifacts unit test", function () {
    var artifacts;

    beforeOnce(function () {
        artifacts = $.import("/sap/tm/trp/service/xslib/artifacts.xsjslib");
    });

    it("should generate a hdbview content", function () {
        var hdbview = new artifacts.HDBView({
            schema: "SAP_TM_TRP",
            query: "SELECT 1 FROM DUMMY",
            depends_on_table: ["TABLE_1"],
            depends_on_view: ["VIEW_1"]
        });

        expect(hdbview.toString()).toEqual('schema="SAP_TM_TRP";\nquery="SELECT 1 FROM DUMMY";\ndepends_on_table=["TABLE_1"];\ndepends_on_view=["VIEW_1"];');
    });

    it("should generate a xsodata content", function () {
        var odata = new artifacts.XSOData({
            namespace: "test",
            objects: {
                Test: {
                    object: "sap.tm.trp.db::t_test_table",
                    readonly: true,
                    generateKey: false,
                    projection: ["COL1", "COL2"],
                    key: ["KEY1", "KEY2"],
                    etag: true,
                    parameters: "key and entity"
                },
                PostalCodes: '"sap.tm.trp.db.systemmanagement.location::v_postal_code" as "PostalCodes" key ("ZONE_ID", "COUNTER") create forbidden update forbidden delete forbidden;'
            },
            associations: {
                City_Country: {
                    principal: { object: "Cities", keys: ["COUNTRY_CODE"], multiplicity: "1" },
                    dependent: { object: "Countries", keys: ["CODE"], multiplicity: "1" },
                    over: { object: "sap.tm.trp.db.systemmanagement.user::t_role_location", principal: ["C1"], dependent: ["C2"] }
                }
            },
            nullable: false
        });

        expect(odata.toString()).toEqual(
            'service namespace "test"{\n' +
            '\t"sap.tm.trp.db::t_test_table" as "Test"\n' +
            '\t\twith ("COL1","COL2") \n' +
            '\t\tkey ("KEY1","KEY2") \n' +
            '\t\tparameters via key and entity\n' +
            '\t\tconcurrencytoken\n' +
            '\t\tcreate forbidden update forbidden delete forbidden;\n\n' +
            '"sap.tm.trp.db.systemmanagement.location::v_postal_code" as "PostalCodes" key ("ZONE_ID", "COUNTER") create forbidden update forbidden delete forbidden;\n\n' +
            '\tassociation "City_Country"\n' +
            '\t\tprincipal "Cities" ("COUNTRY_CODE") multiplicity "1"\n' +
            '\t\tdependent "Countries" ("CODE") multiplicity "1"\n' +
            '\t\tover "sap.tm.trp.db.systemmanagement.user::t_role_location" principal ("C1") dependent ("C2");\n' +
            '}');
    });

    it("should parse odata content by object/view name", function () {
        var odata = new artifacts.XSOData().parse(
            'service {\
                "sap.tm.trp.db.common::v_resource_head_ext_rc" as "ResourceRCExt"\
                     navigates ("ResourceGroup_ResourceTypes" as "ResourceTypes","ResourceGroup_Items" as "Items")\
                     create forbidden update forbidden delete forbidden;\
                "sap.tm.trp.db.common::v_freight_order_item_ext_rc" as "BookingRCExt"\
                     keys  ("ID","RESOURCE_CATEGORY")\
                     parameters via key and entity\
                     create forbidden update forbidden delete forbidden;\
                association "ActiveZone_AdminDivisions"\
                    principal "ActiveZones"("ID") multiplicity "1"\
                    dependent "AdminDivisions"("COUNTRY_CODE", "REGION_CODE") multiplicity "*"\
                    over "sap.tm.trp.db.semantic.location::v_zone_admin_gis" principal ("ZONE_ID") dependent ("COUNTRY_CODE", "STATE_CODE");\
            }');

        expect(Object.keys(odata.objects).length).toBe(2);
        expect(odata.objects.ResourceRCExt).toBeDefined();
        expect(odata.objects.ResourceRCExt.object).toBe("sap.tm.trp.db.common::v_resource_head_ext_rc");
        expect(odata.objects.ResourceRCExt.readonly).toBeTruthy();
        expect(Object.keys(odata.objects.ResourceRCExt.navigates).length).toBe(2);
        expect(odata.objects.ResourceRCExt.navigates.ResourceTypes).toBe("ResourceGroup_ResourceTypes");
        expect(odata.objects.BookingRCExt).toBeDefined();
        expect(odata.objects.BookingRCExt.parameters).toBe("key and entity");
        expect(odata.objects.BookingRCExt.key.length).toBe(2);
        expect(odata.objects.BookingRCExt.key[0]).toBe("ID");
        expect(odata.associations.ActiveZone_AdminDivisions).toBeDefined();
        expect(odata.associations.ActiveZone_AdminDivisions.principal).toBeDefined();
        expect(odata.associations.ActiveZone_AdminDivisions.principal.object).toBe("ActiveZones");
        expect(odata.associations.ActiveZone_AdminDivisions.principal.keys).toEqualObject(["ID"]);
        expect(odata.associations.ActiveZone_AdminDivisions.principal.multiplicity).toBe("1");
        expect(odata.associations.ActiveZone_AdminDivisions.dependent).toBeDefined();
        expect(odata.associations.ActiveZone_AdminDivisions.dependent.object).toBe("AdminDivisions");
        expect(odata.associations.ActiveZone_AdminDivisions.dependent.keys).toEqualObject(["COUNTRY_CODE", "REGION_CODE"]);
        expect(odata.associations.ActiveZone_AdminDivisions.dependent.multiplicity).toBe("*");
        expect(odata.associations.ActiveZone_AdminDivisions.over).toBeDefined();
        expect(odata.associations.ActiveZone_AdminDivisions.over.object).toBe("sap.tm.trp.db.semantic.location::v_zone_admin_gis");
        expect(odata.associations.ActiveZone_AdminDivisions.over.principal).toEqualObject(["ZONE_ID"]);
        expect(odata.associations.ActiveZone_AdminDivisions.over.dependent).toEqualObject(["COUNTRY_CODE", "STATE_CODE"]);
    });
});
