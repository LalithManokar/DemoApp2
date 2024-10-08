/*global jasmine, describe, beforeOnce, beforeEach, afterEach, afterOnce, xit, it, expect, spyOn*/
describe("Preference Test", function() {


    beforeEach(function(){
    })

 it("should delete one of the user preference", function() {
        var requestBody = '{ "LAST_USED_PLAN_ID": "99" }';
        var requestDELBody = '{ "JasmineTest": {"LAST_USED_PLAN_ID": "99" }}';

        var headers = {
            "Content-Type" : "application/json"
        };
        var response = jasmine.callHTTPService("/sap/tm/trp/service/user/preference.json/JasmineTest", $.net.http.PUT, requestBody, headers);
        expect(response.status).toBe($.net.http.NO_CONTENT); // check the response code

        response = jasmine.callHTTPService("/sap/tm/trp/service/user/preference.json", $.net.http.DEL, requestDELBody);
        expect(response.status).toBe($.net.http.NO_CONTENT);

        response = jasmine.callHTTPService("/sap/tm/trp/service/user/preference.json", $.net.http.GET);
        expect(response.status).toBe($.net.http.OK); // check the response code

        var body = JSON.parse(response.body.asString());
        if (body.data.JasmineTest) {
            expect(body.data.JasmineTest.LAST_USED_PLAN_ID).toBeUndefined();
        } else {
            expect(body.data.JasmineTest).toBeUndefined();
        }
    });

    it("should save user preference", function() {
        var requestBody = '{ "LAST_USED_PLAN_ID": "99" }';

        var headers = {
            "Content-Type" : "application/json"
        };
        var response = jasmine.callHTTPService("/sap/tm/trp/service/user/preference.json/JasmineTest", $.net.http.PUT, requestBody, headers);
        expect(response.status).toBe($.net.http.NO_CONTENT); // check the response code

        response = jasmine.callHTTPService("/sap/tm/trp/service/user/preference.json/JasmineTest", $.net.http.GET);

        var body = JSON.parse(response.body.asString());
        expect(body.data).toBeDefined();
        expect(body.data.LAST_USED_PLAN_ID).toBeDefined();
        expect(body.data.LAST_USED_PLAN_ID).toBe("99");

        //delete JasmineTest content
        response = jasmine.callHTTPService("/sap/tm/trp/service/user/preference.json/JasmineTest", $.net.http.DEL);
        expect(response.status).toBe($.net.http.NO_CONTENT);

        response = jasmine.callHTTPService("/sap/tm/trp/service/user/preference.json", $.net.http.GET);
        expect(response.status).toBe($.net.http.OK); // check the response code

        body = JSON.parse(response.body.asString());
        expect(body.data.JasmineTest).toBeUndefined();
    });

    it("should update user preference", function() {
        var requestBody = '{ "LAST_USED_PLAN_ID": "99" }';

        var headers = {
            "Content-Type" : "application/json"
        };
        var response = jasmine.callHTTPService("/sap/tm/trp/service/user/preference.json/JasmineTest", $.net.http.PUT, requestBody, headers);
        expect(response.status).toBe($.net.http.NO_CONTENT); // check the response code

        requestBody = '{ "LAST_USED_PLAN_ID": "199" }';

        response = jasmine.callHTTPService("/sap/tm/trp/service/user/preference.json/JasmineTest", $.net.http.PUT, requestBody, headers);
        expect(response.status).toBe($.net.http.NO_CONTENT); // check the response code

        response = jasmine.callHTTPService("/sap/tm/trp/service/user/preference.json/JasmineTest", $.net.http.GET);
        expect(response.status).toBe($.net.http.OK); // check the response code

        var body = JSON.parse(response.body.asString());
        expect(body.data.LAST_USED_PLAN_ID).toBeDefined();
        expect(body.data.LAST_USED_PLAN_ID).toBe("199");

        response = jasmine.callHTTPService("/sap/tm/trp/service/user/preference.json/JasmineTest", $.net.http.DEL);
        expect(response.status).toBe($.net.http.NO_CONTENT);

        response = jasmine.callHTTPService("/sap/tm/trp/service/user/preference.json", $.net.http.GET);
        expect(response.status).toBe($.net.http.OK); // check the response code

        body = JSON.parse(response.body.asString());
        expect(body.data.JasmineTest).toBeUndefined();
    });

    it("should delete user preference", function() {
        var requestBody = '{ "LAST_USED_PLAN_ID": "99" }';

        var headers = {
            "Content-Type" : "application/json"
        };
        var response = jasmine.callHTTPService("/sap/tm/trp/service/user/preference.json/JasmineTest", $.net.http.PUT, requestBody, headers);
        expect(response.status).toBe($.net.http.NO_CONTENT); // check the response code

        response = jasmine.callHTTPService("/sap/tm/trp/service/user/preference.json/JasmineTest", $.net.http.DEL);
        expect(response.status).toBe($.net.http.NO_CONTENT);

        response = jasmine.callHTTPService("/sap/tm/trp/service/user/preference.json", $.net.http.GET);
        expect(response.status).toBe($.net.http.OK); // check the response code

        var body = JSON.parse(response.body.asString());
        expect(body.data.JasmineTest).toBeUndefined();
    });

});