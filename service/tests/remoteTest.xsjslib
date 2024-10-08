/*global jasmine, describe, beforeOnce, beforeEach, afterEach, afterOnce, xit, it, expect, spyOn*/
describe("Remote Client Unit Test", function() {
    var remote;

    beforeEach(function() {
        spyOn($.net.http, "readDestination").and.returnValue({
            host: "dummy",
            port: "8080"
        });

        spyOn($.net.http, "Client").and.callFake(function() {
            return {
                request: function(req, dest) {
                    return {
                        request: req,
                        destination: dest
                    };
                },

                getResponse: function() {
                    return {
                        headers: [{name: "x-csrf-token", value: "f08945c47ab3d5e7d39252575e523443"}],
                        body: {
                            asString: function() {
                                return '{"a": "dummy"}';
                            }
                        },
                        status: $.net.http.OK
                    };
                }
            };
        });

        remote = new ($.import("/sap/tm/trp/service/xslib/remote.xsjslib")).RemoteClient();
    });

    it("should have correct interfaces", function() {
        expect(remote.request).toBeDefined();
    });

    it("should send request to remote", function() {
        var settings = {
            url: "/dummy/url",
            method: $.net.http.POST,
            data: { dummy: "data" },
            success: function(result) {
                expect(result.a).toBe("dummy");
            },
            error: function() {
                throw new Error("Should never be thrown");
            }
        };

        var spySuccess = spyOn(settings, "success").and.callThrough();
        remote.request(settings);

        expect(spySuccess).toHaveBeenCalled();
    });
});