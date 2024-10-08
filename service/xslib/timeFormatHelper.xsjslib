var utils = $.import("/sap/tm/trp/service/xslib/utils.xsjslib");

var secondFormat = function(time) {
    return time.getFullYear() + "-" + (time.getMonth() + 1) + "-" + time.getDate() + "T" + time.getHours() + ":" + time.getMinutes() + ":" + time.getSeconds();
    //2014-04-27T17:39:00
};

var minuteFormat = function(time) {
    return time.getFullYear() + "-" + (time.getMonth() + 1) + "-" + time.getDate() + "T" + time.getHours() + ":" + time.getMinutes() + ":00";
    //2014-04-27T17:39:00
};

var hourFormat = function(time) {
    return time.getFullYear() + "-" + (time.getMonth() + 1) + "-" + time.getDate() + "T" + time.getHours() + ":00:00";
    //2014-05-17T08:00:00
};

var hourMinuteSecondFormat = function(time) {
    return time.getHours() + ":" + time.getMinutes() + ":" + time.getSeconds();
    //2014-04-27T17:39:00
};

var dayFormat = function(time) {
    return time.getFullYear() + "-" + (time.getMonth() + 1) + "-" + time.getDate();
    //2014-05-17
};

var hourMinuteSecondFormat_new = function(time) {

    //return time.getHours() + ":" + time.getMinutes() + ":" + time.getSeconds();
    if (time.getSeconds() === 0){
        return time.getHours() + ":" + time.getMinutes() + ":" + '00';
    } else if (time.getSeconds() < 10) {
        return time.getHours() + ":" + time.getMinutes() + ":0" + time.getSeconds();
    } else {
        return time.getHours() + ":" + time.getMinutes() + ":" + time.getSeconds();
    }

    //2014-04-27T173900
};

var dayFormat_new = function(time) {

    if (time.getMonth() < 9) {
        if (time.getDate() < 10){
            return time.getFullYear() + "-0" + (time.getMonth() + 1) + "-0" + time.getDate();
        } else {
            return time.getFullYear() + "-0" + (time.getMonth() + 1) + "-" + time.getDate();
        }
    //2014-05-17
    } else
    {
        if (time.getDate() < 10){
           return time.getFullYear() + "-" + (time.getMonth() + 1) + "-0" + time.getDate();
        } else {
           return time.getFullYear() + "-" + (time.getMonth() + 1) + "-" + time.getDate();
        }
    }
};

var weekFormat = function(time, timeDuration) {
    return time.getFullYear() + "-W" + timeDuration;
    //2014-W03
};

var monthFormat = function(time) {
    return time.getFullYear() + "-" + (time.getMonth() + 1);
    //2014-05
};

var quarterFormat = function(time) {
    var quarter;
    quarter = (time.getMonth() + 1) % 3 + 1;
    return time.getFullYear() + "-Q" + quarter;
    //2014-Q2
};

var yearFormat = function(time) {
    return String(time.getFullYear());
    //2014
};

var dateFormat = function(fmt, date) {
    let ret;
    const opt = {
        "M+": (date.getMonth() + 1).toString(),
        "d+": date.getDate().toString(),
        "H+": date.getHours().toString(),
        "m+": date.getMinutes().toString(),
        "s+": date.getSeconds().toString()
    };

    if (/(y+)/.test(fmt)) {
        fmt = fmt.replace(RegExp.$1, (date.getFullYear() + "").substr(4 - RegExp.$1.length));
    }
    for (var k in opt){
        ret = new RegExp("(" + k + ")").exec(fmt);
        if (ret) {
            fmt = fmt.replace(RegExp.$1, (RegExp.$1.length === 1) ? (opt[k]) : (("00" + opt[k]).substr(("" + opt[k]).length)));
        }
    }

    return fmt;
};

var dateUTCFormat = function(fmt, date) {
    let ret;
    const opt = {
        "M+": (date.getUTCMonth() + 1).toString(),
        "d+": date.getUTCDate().toString(),
        "H+": date.getUTCHours().toString(),
        "m+": date.getUTCMinutes().toString(),
        "s+": date.getUTCSeconds().toString()
    };

    if (/(y+)/.test(fmt)) {
        fmt = fmt.replace(RegExp.$1, (date.getUTCFullYear() + "").substr(4 - RegExp.$1.length));
    }
    for (var k in opt){
        ret = new RegExp("(" + k + ")").exec(fmt);
        if (ret) {
            fmt = fmt.replace(RegExp.$1, (RegExp.$1.length === 1) ? (opt[k]) : (("00" + opt[k]).substr(("" + opt[k]).length)));
        }
    }

    return fmt;
};
