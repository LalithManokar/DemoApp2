var quote = function(str, quoteChar) {
    var surround = function(str, wrapper) {
        return [wrapper, str, wrapper].join("");
    };

    return surround(str, quoteChar || '"');
};

/**
 * @param {object} args
 * {
 *      schema: "SAP_TM_TRP",
 *      query: "SELECT 1 FROM DUMMY",
 *      depends_on_table: ["TABLE_1"]
 * }
 */
function HDBView(args) {
    this.args = args || {};
    this.attributes = ["schema", "query", "depends_on_table", "depends_on_view"];

    this.toString = function() {
        return this.attributes.filter(function(key) {
                return this.args.hasOwnProperty(key);
            }, this).map(function(key) {
                var val = this.args[key];

                if (Array.isArray(val)) {
                    if (val.length > 0) {
                        val = "[" + val.map(function(i) { return quote(i); }).join(",") + "]";
                    } else {
                        return "";
                    }
                } else {
                    val = quote(val);
                }
                return key + "=" + val + ";";
            }, this).join("\n");
    };
}

function HDBSchema(args) {
    this.args = args || {};

    this.toString = function() {
        if(args.hasOwnProperty("schema_name")) {
            return "schema_name = " + quote(args.schema_name) + ";";
        }
    };

    this.parse = function(content) {
        var regex = /schema_name\s*=\s*"(\w+)"/;

        if (regex.test(content)) {
            regex.lastIndex = 0;

            return {
                schema: regex.exec(content)[1]
            };
        }
    };
}

/**
 * @param {object} args
 * {
 *     namespace: "test",
 *     objects: {
 *         Test: {
 *             object: "sap.tm.trp.db::t_test_table",
 *             readonly: true,
 *             generateKey: false,
 *             projection: ["COL1", "COL2"],
 *             key: ["KEY1", "KEY2"],
 *             etag: true,
 *             navigates: {
 *                 Nav: "City_Country"
 *             },
 *             parameters: "via entity"
 *         },
 *         PostalCodes: '"sap.tm.trp.db.systemmanagement.location::v_postal_code" as "PostalCodes" key ("ZONE_ID", "COUNTER") create forbidden update forbidden delete forbidden;',
 *     associations: {
 *         City_Country: {
 *             principal: { object: "Cities", keys: ["COUNTRY_CODE"], multiplicity: "1" },
 *             dependent: { object: "Countries", keys: ["CODE"], multiplicity: "1" },
 *             over: { object: "sap.tm.trp.db.systemmanagement.user::t_role_location", principal: ["C1"], dependent: ["C2"] }
 *         }
 *     },
 *     nullable: false
 * }
 */
function XSOData(args) {
    this.args = args || {};

    this.toString = function() {
        var content = "service ";

        if (this.args.hasOwnProperty("namespace")) {
            content += "namespace " + quote(this.args.namespace);
        }
        content += "{\n";

        if (this.args.objects) {
            content += Object.keys(this.args.objects).map(function(key) {
                var obj = this.args.objects[key];

                if (typeof obj === "string") { // if put string here, means the content has been prepared
                    return obj;
                }

                if (!obj.hasOwnProperty("object")) {
                    throw new Error("Invalid object", obj);
                }

                var entry = "\t" + quote(obj.object) + " as ";

                entry += quote(key);

                if (obj.hasOwnProperty("projection")) {
                    entry += "\n\t\twith (" + obj.projection.map(function(col) { return quote(col); }).join(",") + ") ";
                }

                if (obj.hasOwnProperty("key")) {
                    entry += "\n\t\tkey (" + obj.key.map(function(col) { return quote(col); }).join(",") + ") ";
                }

                if (obj.generateKey && !obj.hasOwnProperty("key")) {
                    entry += "\n\t\tkey generate local \"" + (typeof obj.generateKey === "string" ? obj.generateKey : "GenID") + "\"";
                }

                if (obj.hasOwnProperty("navigates") && Object.keys(obj.navigates).length > 0) {
                    entry += "\n\t\tnavigates(\n\t\t\t" + Object.keys(obj.navigates).map(function(k) { return quote(obj.navigates[k]) + " as " + quote(k); }).join(",\n\t\t\t") + "\n\t\t)";
                }

                if (obj.hasOwnProperty("parameters")) {
                    entry += "\n\t\tparameters via " + (obj.parameters.indexOf("key") !== -1 ? "key and entity" : "entity");
                }

                if (obj.etag) {
                    entry += "\n\t\tconcurrencytoken";
                }

                if (obj.readonly || !obj.hasOwnProperty("readonly")) {
                    entry += "\n\t\tcreate forbidden update forbidden delete forbidden";
                }

                entry += ";";

                return entry;
            }, this).join("\n\n");
        }

        if (this.args.associations) {
            content += "\n\n";
            content += Object.keys(this.args.associations).map(function(key) {
                var association = this.args.associations[key];

                if (typeof association === "string") {
                    return association;
                }

                var entry = "\tassociation " + quote(key);

                entry += "\n\t\tprincipal "
                         + quote(association.principal.object)
                         + " ("
                         + association.principal.keys.map(function(col) { return quote(col); }).join(",")
                         + ") multiplicity "
                         + quote(association.principal.multiplicity);

                entry += "\n\t\tdependent "
                         + quote(association.dependent.object)
                         + " ("
                         + association.dependent.keys.map(function(col) { return quote(col); }).join(",")
                         + ") multiplicity "
                         + quote(association.dependent.multiplicity);

                if (association.hasOwnProperty("over")) {
                    entry += "\n\t\tover "
                             + quote(association.over.object)
                             + " principal ("
                             + association.over.principal.map(function(col) { return quote(col); }).join(",")
                             + ") dependent ("
                             + association.over.dependent.map(function(col) { return quote(col); }).join(",")
                             + ")";
                }

                entry += ";";

                return entry;
            }, this).join("\n\n");
        }

        content += "\n}";

        if (this.args.nullable) {
            content += "\nsettings { support null; }";
        }

        return content;
    };

    this.parse = function(content) {
        var regex = /service[ \w"]*\{(.*?)\}.*/m;
        var objects = {};
        var associations = {};
        content = (content || "").replace(/\n/g, "");

        if (regex.test(content)) {
            regex.lastIndex = 0;
            regex.exec(content)[1].split(";").forEach(function(entry) {
                entry = entry.replace(/\s{2,}/g, " ").trim();

                var r;
                var result = /"(.+?)" as "([\w_]+)"(.+)/.exec(entry);
                if (result) {
                    var obj = {
                        object: result[1],
                        readonly: result[3].indexOf("forbidden") !== -1
                    };


                    if (result[3].indexOf("key") !== -1) {
                        if (result[3].indexOf("generate local") !== -1) {
                            r = /.*generate local\s+"(\w+)".*/.exec(result[3]);

                            if (r) {
                                obj.generateKey = r[1];
                            } else {
                                obj.generateKey = true;
                            }
                        } else {
                            r = /.*keys?\s+\(([\w_,\s"]+)\).*/.exec(result[3]);

                            if (r) {
                                obj.key = r[1].split(",").map(function(c) { return c.trim().replace(/"/g, ""); });
                            }
                        }
                    }

                    obj.navigates = {};
                    if (result[3].indexOf("navigates") !== -1) {
                        r = /.*navigates\s*\(([\w,\s"]+)\).*/.exec(result[3]);

                        if (r) {
                            r[1].split(",").forEach(function(e) {
                                r = /\s*"(\w+)"\s+as\s+"(\w+)"\s*/.exec(e);

                                if (r) {
                                    obj.navigates[r[2]] = r[1];
                                }
                            });
                        }
                    }

                    if (result[3].indexOf("parameters via") !== -1) {
                        obj.parameters = result[3].indexOf("via key") !== -1 ? "key and entity" : "entity";
                    }

                    objects[result[2]] = obj;
                }

                result = /association "(\w+)"(.+)/.exec(entry);
                if (result) {
                    var name = result[1];
                    var association = {};

                    r = /.*principal\s+"(\w+)"\s*\(([\w\s",]+)\)\s+multiplicity\s+"([\d\*]+)".+/.exec(result[2]);
                    if (r) {
                        association.principal = {
                            object: r[1],
                            keys: r[2].split(",").map(function(k) { return k.trim().replace(/"/g, ""); }),
                            multiplicity: r[3]
                        };
                    }

                    r = /.*dependent\s+"(\w+)"\s*\(([\w\s",]+)\)\s+multiplicity\s+"([\d\*]+)".*/.exec(result[2]);
                    if (r) {
                        association.dependent = {
                            object: r[1],
                            keys: r[2].split(",").map(function(k) { return k.trim().replace(/"/g, ""); }),
                            multiplicity: r[3]
                        };
                    }

                    r = /.*over\s+"([\w\.:]+)"\s*principal\s+\((["\w,\s]+)\)\s*dependent\s+\((["\w,\s]+)\).*/.exec(result[2]);
                    if (r) {
                        association.over = {
                            object: r[1],
                            principal: r[2].split(",").map(function(k) { return k.trim().replace(/"/g, ""); }),
                            dependent : r[3].split(",").map(function(k) { return k.trim().replace(/"/g, ""); })
                        };
                    }

                    associations[name] = association;
                }
            });
        }

        return {
            objects: objects,
            associations: associations,
            nullable: content.indexOf("support null") !== -1
        };
    };
}

function XSApp() {
    this.toString = function() {
        return "";
    };
}

/**
 * {
 *     exposed: true,
 *     authentication: [{method : "Basic"}]
 * }
 */
function XSAccess(args) {
    this.args = args || {};

    this.toString = function() {
        return JSON.stringify(this.args);
    };

    this.parse = function(content) {
        return JSON.parse(content);
    };
}

var XSSQLConnectionConfiguration = XSAccess;