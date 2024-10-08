/*global jasmine, describe, beforeOnce, beforeEach, afterEach, afterOnce, xit, it, expect, spyOn*/
var utils = $.import("/sap/tm/trp/service/xslib/utils.xsjslib");

function mockMassiveJSONInput(current) {
    var i;
    for (i = 0; i <= 1000; i++) { // it will have a max iteration number
        current["ID" + i] = {};
        current = current["ID" + i];
    }
    current["ID" + i] = 1000;
}

describe("utils Unit Test", function() {
    var resArray, resObject, requestBodyObject, requestBodyArray, separator;

    beforeEach(function() {

        resArray = null;
        resObject = null;

    });

    it("isNumerric should work", function() {
        var isNum;
        isNum = 100;
        expect(utils.isNumeric(isNum)).toBeDefined();
        expect(utils.isNumeric(isNum)).toBe(true);
        isNum = "ABC";
        expect(utils.isNumeric(isNum)).toBe(false);
        isNum = Number.MAX_VALUE * 2;
        expect(utils.isNumeric(isNum)).toBe(false);
    });

    it("uppercase should work", function() {
        var toUppercase;
        toUppercase = "abc";
        expect(utils.uppercase(toUppercase)).toBeDefined();
        expect(utils.uppercase(toUppercase)).toBe("ABC");
        toUppercase = null;
        expect(utils.uppercase(toUppercase)).toBe("");
    });

    it("trim should work", function() {
        var toTrim;
        toTrim = "abc   ";
        expect(utils.trim(toTrim)).toBeDefined();
        expect(utils.trim(toTrim)).toBe("abc");
        toTrim = null;
        expect(utils.trim(toTrim)).toBe("");
    });

    it("isEmpty should work", function() {
        var isEmpty;
        expect(utils.isEmpty(isEmpty)).toBe(true);
        isEmpty = "abc";
        expect(utils.isEmpty(isEmpty)).toBe(false);
    });

    it("capitalize should work", function() {
        var toCapitalize;
        toCapitalize = "abc";
        expect(utils.capitalize(toCapitalize)).toBeDefined();
        expect(utils.capitalize(toCapitalize)).toBe("Abc");
        toCapitalize = null;
        expect(utils.capitalize(toCapitalize)).toBe("");
    });

    it("titleize should work", function() {
        var toTitleize;
        toTitleize = "a_b_c";
        expect(utils.titleize(toTitleize)).toBeDefined();
        expect(utils.titleize(toTitleize)).toBe("A_b_c");
        toTitleize = null;
        expect(utils.titleize(toTitleize)).toBe("");
    });

    it("surround should work", function() {
        var toSurround;
        var wapper = "test";
        toSurround = "abc";
        expect(utils.surround(toSurround, wapper)).toBeDefined();
        expect(utils.surround(toSurround, wapper)).toBe("testabctest");
        toSurround = null;
        expect(utils.surround(toSurround, wapper)).toBe("testtest");
    });

    it("quote should work", function() {
        var toQuote;
        toQuote = "abc";
        expect(utils.quote(toQuote)).toBeDefined();
        expect(utils.quote(toQuote)).toBe('"abc"');
        toQuote = null;
        expect(utils.quote(toQuote)).toBe('""');
    });

    it("unquote should work", function() {
        var toUnquote;
        toUnquote = "abc";
        expect(utils.unquote(toUnquote)).toBeDefined();
        expect(utils.unquote(toUnquote)).toBe("abc");
        toUnquote = '"abc"';
        expect(utils.unquote(toUnquote)).toBeDefined();
        expect(utils.unquote(toUnquote)).toBe("abc");
        toUnquote = null;
        expect(utils.unquote(toUnquote)).toBe("");
    });

    it("localToUTC should work", function() {
        var localDate = new Date("April 04,2016 08:00:00");
        var utcDate = new Date("April 04,2016 00:00:00");
        expect(utils.localToUTC(localDate)).toBeDefined();
        expect(utils.localToUTC(localDate)).toEqual(utcDate);

    });

    it("utcToLocal should work", function() {
        var localDate = new Date("April 04,2016 08:00:00");
        var utcDate = new Date("April 04,2016 00:00:00");
        expect(utils.utcToLocal(utcDate)).toBeDefined();
        expect(utils.utcToLocal(utcDate)).toEqual(localDate);
    });

    it("localUITime should work", function() {
        var localDate = new Date("April 04,2016 08:00:00");
        var UIDate = '2016-04-04 07:00:00';
        expect(utils.localUITime(localDate, 60)).toBeDefined();
        expect(utils.localUITime(localDate, 60)).toBe(UIDate);
    });

    it("parseTime should work", function() {
        var timeStr = "Jul 8, 2005";
        var timeDate = new Date("July 08,2005 00:00:00");
        expect(utils.parseTime(timeStr)).toBeDefined();
        expect(utils.parseTime(timeStr)).toEqual(timeDate);
    });

    it("checkNonNegativeInteger should work", function() {
        var integerNum = 2016;
        expect(utils.checkNonNegativeInteger(integerNum)).toBeDefined();
        expect(utils.checkNonNegativeInteger(integerNum)).toEqual(true);
        integerNum = -2016;
        expect(utils.checkNonNegativeInteger(integerNum)).toEqual(false);
        integerNum = 2016.1;
        expect(utils.checkNonNegativeInteger(integerNum)).toEqual(false);
    });

    it("buildErrorResponse should work", function() {
        var response = {};
        response.body = {
            "SUCCESS": false,
            "MESSAGES": [
                {
                    "TYPE": "ERROR",
                    "MESSAGE": "MSG_TM_REQUEST_FAILED",
                    "ARGS": null
            },
                {
                    "TYPE": "ERROR",
                    "MESSAGE": "MSG_ERROR_CREATE_ZONE",
                    "ARGS": null
            }
        ]
        };
        response.body.asString = function() {
            return JSON.stringify(this);
        };

        var newResponse = [{
            message: 'MSG_TM_REQUEST_FAILED',
            args: [null]
        }, {
            message: 'MSG_ERROR_CREATE_ZONE',
            args: [null]
        }];

        var defaultMessage = "MSG_SERVER_ERROR";
        expect(utils.buildErrorResponse(response, defaultMessage)).toEqual(newResponse);

        response.body = {
            "SUCCESS": false
        };

        response.body.asString = function() {
            return JSON.stringify(this);
        };

        expect(utils.buildErrorResponse(response, defaultMessage)).toEqual([defaultMessage]);

        response.body = null;
        expect(utils.buildErrorResponse(response, defaultMessage)).toEqual([defaultMessage]);
    });

    it("facetFilterUtils should work", function() {

        var facetFilterUtils = utils.facetFilterUtils;

        //createUniqueFilterFunction Test
        var filteredData = [{
            TYPE: 'type1',
            TYPE_DESC: 'type1Desc'
        }, {
            TYPE: 'type2',
            TYPE_DESC: 'type2Desc'
        }, {
            TYPE: 'type1',
            TYPE_DESC: 'type1Desc2'
        }];

        var newData = [{
            key: 'type1',
            text: 'type1Desc'
        }, {
            key: 'type2',
            text: 'type2Desc'
        }];

        expect(filteredData.map(function(row) {
            return {
                key: row.TYPE,
                text: row.TYPE_DESC
            };
        }).filter(facetFilterUtils.createUniqueFilterFunction())).toEqual(newData);

        //sortFilterItem_NumericKey Test
        var a = {},
            b = {};
        a.key = null;
        b.key = null;
        expect(facetFilterUtils.sortFilterItem_NumericKey(a, b)).toEqual(NaN);
        a.key = 1;
        expect(facetFilterUtils.sortFilterItem_NumericKey(a, b)).toEqual(-Infinity);
        a.key = null;
        b.key = 2;
        expect(facetFilterUtils.sortFilterItem_NumericKey(a, b)).toEqual(Infinity);
        a.key = 1;
        expect(facetFilterUtils.sortFilterItem_NumericKey(a, b)).toEqual(-1);

        //sortFilterItem_StringKey Test
        a.key = null;
        b.key = null;
        expect(facetFilterUtils.sortFilterItem_StringKey(a, b)).toEqual(16);
        a.key = 'a';
        expect(facetFilterUtils.sortFilterItem_StringKey(a, b)).toEqual(-13);
        a.key = null;
        b.key = 'b';
        expect(facetFilterUtils.sortFilterItem_StringKey(a, b)).toEqual(28);
        a.key = 'a';
        expect(facetFilterUtils.sortFilterItem_StringKey(a, b)).toEqual(-1);

        //checkFilterObj Test
        var fieldList = ['RULE_TYPE', 'SD_PLAN_ID', 'TIME_RANGE_UNION',
                                'RESOURCE_FILTER_ID', 'LOCATION_FILTER_ID',
                                'NETWORK_SETTING_GROUP_ID', 'LOCATION_DETERMIN_ID',
                                'SCHEDULE_TIME_TYPE', 'OPTIMIZATION'];
        var filterObj = {};
        expect(facetFilterUtils.checkFilterObj(filterObj, fieldList)).toEqual(true);
        filterObj = {
            "RULE_TYPE": "RULE_TYPE_VALUE"
        };
        expect(facetFilterUtils.checkFilterObj(filterObj, fieldList)).toEqual(false);
        filterObj = {
            "RULE_TYPE": ["RULE_TYPE_VALUE1", "RULE_TYPE_VALUE2"]
        };
        expect(facetFilterUtils.checkFilterObj(filterObj, fieldList)).toEqual(true);

        //generateServiceReturnObj Test
        var data = [{
            "KEY": 1,
            "TEXT": "TEXT1"
        }, {
            "KEY": 2,
            "TEXT": "TEXT2"
        }];
        var procReturnObj = {
            "RULE_TYPE_LIST_OUTPUT": data,
            "SD_PLAN_ID_LIST_OUTPUT": data,
            "TIME_RANGE_UNIT_LIST_OUTPUT": data,
            "RESOURCE_FILTER_ID_LIST_OUTPUT": data,
            "LOCATION_FILTER_ID_LIST_OUTPUT": data,
            "NETWORK_SETTING_GROUP_ID_LIST_OUTPUT": data,
            "LOC_DET_ID_LIST_OUTPUT": data,
            "SCHEDULE_TIME_TYPE_LIST_OUTPUT": data,
            "OPTIMIZATION_LIST_OUTPUT": data
        };

        var outputInfoList = [
            {
                field: "RULE_TYPE",
                varName: "RULE_TYPE_LIST_OUTPUT"
            },
            {
                field: "SD_PLAN_ID",
                varName: "SD_PLAN_ID_LIST_OUTPUT"
            },
            {
                field: "RESOURCE_FILTER_ID",
                varName: "RESOURCE_FILTER_ID_LIST_OUTPUT"
            },
            {
                field: "LOCATION_FILTER_ID",
                varName: "LOCATION_FILTER_ID_LIST_OUTPUT"
            },
            {
                field: "NETWORK_SETTING_GROUP_ID",
                varName: "NETWORK_SETTING_GROUP_ID_LIST_OUTPUT"
            },
            {
                field: "LOCATION_DETERMIN_ID",
                varName: "LOC_DET_ID_LIST_OUTPUT"
            },
            {
                field: "OPTIMIZATION",
                varName: "OPTIMIZATION_LIST_OUTPUT"
            },
            {
                field: "SCHEDULE_TIME_TYPE",
                varName: "SCHEDULE_TIME_TYPE_LIST_OUTPUT"
            }
        ];

        var expectedRes = {
            RULE_TYPE: [{
                key: 1,
                text: 'TEXT1'
            }, {
                key: 2,
                text: 'TEXT2'
            }],
            SD_PLAN_ID: [{
                key: 1,
                text: 'TEXT1'
            }, {
                key: 2,
                text: 'TEXT2'
            }],
            RESOURCE_FILTER_ID: [{
                key: 1,
                text: 'TEXT1'
            }, {
                key: 2,
                text: 'TEXT2'
            }],
            LOCATION_FILTER_ID: [{
                key: 1,
                text: 'TEXT1'
            }, {
                key: 2,
                text: 'TEXT2'
            }],
            NETWORK_SETTING_GROUP_ID: [{
                key: 1,
                text: 'TEXT1'
            }, {
                key: 2,
                text: 'TEXT2'
            }],
            LOCATION_DETERMIN_ID: [{
                key: 1,
                text: 'TEXT1'
            }, {
                key: 2,
                text: 'TEXT2'
            }],
            OPTIMIZATION: [{
                key: 1,
                text: 'TEXT1'
            }, {
                key: 2,
                text: 'TEXT2'
            }],
            SCHEDULE_TIME_TYPE: [{
                key: 1,
                text: 'TEXT1'
            }, {
                key: 2,
                text: 'TEXT2'
            }]
        };
        expect(facetFilterUtils.generateServiceReturnObj(procReturnObj, outputInfoList)).toEqual(expectedRes);

    });

    it("should convert an object to an array", function() {
        requestBodyObject = {
            "RESOURCE": {
                "LAST_USED_LOCATION_FILTER": "DUMMY FILTER"
            }
        };
        requestBodyArray = [{
            key: "RESOURCE|LAST_USED_LOCATION_FILTER",
            value: "DUMMY FILTER"
}];

        separator = "|";

        resArray = utils.objectToArray(requestBodyObject);

        expect(resArray).toBeDefined();
        expect(resArray).toEqual(requestBodyArray);
        expect(resArray).toEqual([{
            key: "RESOURCE|LAST_USED_LOCATION_FILTER",
            value: "DUMMY FILTER"
}]);
    });

    it("should convert an array to an object", function() {

        requestBodyObject = {
            "RESOURCE": {
                "LAST_USED_LOCATION_FILTER": "DUMMY FILTER"
            }
        };
        requestBodyArray = [{
            key: "RESOURCE|LAST_USED_LOCATION_FILTER",
            value: "DUMMY FILTER"
}];

        separator = "|";

        resObject = utils.arrayToObject(requestBodyArray, separator);

        expect(resObject).toBeDefined();
        expect(resObject).toEqual(requestBodyObject);
        expect(resObject).toEqual({
            "RESOURCE": {
                "LAST_USED_LOCATION_FILTER": "DUMMY FILTER"
            }
        });
    });

    it("should validate objectToArray and arrayToObject transtive", function() {

        requestBodyObject = {
            "RESOURCE": {
                "LAST_USED_LOCATION_FILTER": "DUMMY FILTER"
            }
        };
        requestBodyArray = [{
            key: "RESOURCE|LAST_USED_LOCATION_FILTER",
            value: "DUMMY FILTER"
}];

        separator = "|";

        resArray = utils.objectToArray(requestBodyObject);
        resObject = utils.arrayToObject(resArray, separator);

        expect(resArray).toBeDefined();
        expect(resObject).toBeDefined();

        expect(resObject).toEqual(requestBodyObject);
        expect(resArray).toEqual([{
            key: "RESOURCE|LAST_USED_LOCATION_FILTER",
            value: "DUMMY FILTER"
}]);
        expect(resObject).toEqual({
            "RESOURCE": {
                "LAST_USED_LOCATION_FILTER": "DUMMY FILTER"
            }
        });

    });

    it("should accept empty input", function() {

        var JSONInput = {};
        requestBodyObject = JSONInput;

        separator = "|";

        resArray = utils.objectToArray(JSONInput);
        resObject = utils.arrayToObject(resArray, separator);

        expect(resArray).toBeDefined();
        expect(resObject).toBeDefined();

        expect(resObject).toEqual(requestBodyObject);
        expect(resArray).toEqual([]);
        expect(resObject).toEqual({});

    });

    it("should accept massive input", function() {

        var JSONInput = {};
        mockMassiveJSONInput(JSONInput);

        requestBodyObject = JSONInput;

        separator = "|";

        resArray = utils.objectToArray(requestBodyObject);
        resObject = utils.arrayToObject(resArray, separator);

        expect(resArray).toBeDefined();
        expect(resObject).toBeDefined();

        expect(resObject).toEqual(requestBodyObject);
        expect(resObject).toEqual(JSONInput);

    });

    it("should not accept other symbols as separator", function() {

        requestBodyObject = {
            "RESOURCE": {
                "LAST_USED_LOCATION_FILTER": "DUMMY FILTER"
            }
        };

[";", ":", "+", "-"].forEach(function(key) {
            resArray = utils.objectToArray(requestBodyObject); // can add a
            // separator as
            // an argument
            // for
            // objectToArray
            // function
            resObject = utils.arrayToObject(resArray, key);

            expect(resArray).toBeDefined();
            expect(resObject).toBeDefined();

            expect(resObject).not.toEqual(requestBodyObject);
        });

    });

    it("sampleArray should work", function() {
        var tableStr = "ABCDEFGHI";
        var table = tableStr.split("");
        var offset = 1;
        expect(utils.sampleArray(table, offset)).toEqual(table);
        offset = 2;
        expect(utils.sampleArray(table, offset)).toEqual(['A', 'C', 'E', 'G', 'I']);
    });

});