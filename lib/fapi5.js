function API_initialized() {
    FAPI.initialized = true;
    window.fapi_success(FAPI.mode);
}

var FAPI = {
    initialized:false,
    mode:'',              // Web,Flash,Mobile,Oauth

    /**
     * @param _args
     * @param _args.app_id application id
     * @param _args.app_key application key
     * @param [_args.oauth_scope='VALUABLE_ACCESS'] OAUTH scope
     * @param [_args.oauth_url=window.location.href] OAUTH redirect url
     * @param [_args.oauth_state=''] OAUTH state for security checking
     * @param {Function} _success success callback
     * @param {Function} _failure failure callback
     */
    init: function(_args, _success, _failure) {
        var args = _args || {};
        var success = _success;
        var failure = _failure;
        var isOldApi = _args == null || FAPI.Util.isString(_args);
        if (isOldApi) { // init(apiServerUrl, apiConnectionName, success, failure)
            args = {};
            success = arguments[2];
            failure = arguments[3];
        }
        window.fapi_success = FAPI.Util.isFunc(success) ? success : function () {};
        window.fapi_failure = FAPI.Util.isFunc(failure) ? failure : function () {};

        var params = FAPI.Util.getRequestParameters(args['location_search'] || window.location.search);
        var hParams = FAPI.Util.getRequestParameters(args['location_hash'] || window.location.hash);

        var api_server = params['api_server'] || (isOldApi ? arguments[0] : null);
        var apiConnection = params['apiconnection'] || (isOldApi ? arguments[1] : null);

        FAPI.Client.initialize(params, hParams, args);
        if (api_server) {
            this.mode = apiConnection ? 'W' : 'M';
            if (this.mode == 'W') {
                if (!FAPI.Util.isFunc(window.postMessage)) {
                    this.mode = 'F';
                    this.invokeUIMethod = FAPI.FLASH.invokeUIMethod;
                    FAPI.FLASH.init(api_server, apiConnection, params);
                } else {
                    this.invokeUIMethod = FAPI.HTML5.invokeUIMethod;
                    FAPI.HTML5.init(api_server, apiConnection, params);
                }
            } else {
                FAPI.MOBILE.init();
            }
        } else {
            if (!args.app_id || !args.app_key) {
                window.fapi_failure('FAPI was unable to detect launch platform. URL parameters and app_id/app_key not detected.');
                return;
            }
            this.mode = 'O';
            FAPI.OAUTH.init(args, params, hParams);
        }
    },
    invokeUIMethod: function () {
        API_callback(arguments[0], "error",
                {error_code: -1,error_message: "UI methods are available only for apps running on OK portal"});
    },
    HTML5:{
        webServerUrl:"",
        serverUrl:"",
        apiConnectionName:"",
        attachRetryCounter:0,

        init:function (serverUrl, apiConnectionName, params) {
            this.serverUrl = serverUrl;
            this.apiConnectionName = apiConnectionName;
            this.attachRetryCounter = 0;

            if (!FAPI.initialized) {
                this.webServerUrl = params["web_server"];
                if (this.webServerUrl.indexOf("://") == -1) {
                    this.webServerUrl = "http://" + this.webServerUrl;
                }

                if (FAPI.Util.isFunc(window.addEventListener)) {
                    window.addEventListener('message', this.onPostMessage, false);
                } else {
                    window.attachEvent('onmessage', this.onPostMessage);
                }
                this.doAttach();
            }
        },
        doAttach:function () {
            if( !FAPI.initialized ) {
                // Retrying attaching to odkl server window, trying 20 times each half of second
                if( FAPI.HTML5.attachRetryCounter++ < 20 ) {
                    FAPI.HTML5.invokeUIMethod("attach");
                    setTimeout(FAPI.HTML5.doAttach, 500);
                } else {
                    window.fapi_failure("Failed to init.");
                }
            }
        },
        onPostMessage:function (event) {
            if (FAPI.HTML5.webServerUrl != event.origin) {
                // Not our message
                return;
            }

            // this cannot be used here, as function is directly attached to window
            var args = event.data.split("$");

            if (args.length != 3) {
                // Not our message
                return;
            }

            var methodName = decodeURIComponent(args[0]);
            if (methodName == "attach") {
                API_initialized();
            } else {
                API_callback(methodName, decodeURIComponent(args[1]), decodeURIComponent(args[2]));
            }
        },
        invokeUIMethod:function () {
            // cannot be called within parent, as function is directly attached to FAPI
            var argStr = "";
            for (var i = 0; i < arguments.length; i++) {
                var arg = arguments[i];

                if (i > 0) {
                    argStr += '$';
                }
                if (arg != null) {
                    argStr += encodeURIComponent(String(arg));
                }
            }
            parent.postMessage("__FAPI__" + argStr, FAPI.HTML5.webServerUrl);
        }
    },
    UI:{
        showInvite:function (text, params, uids) {
            FAPI.invokeUIMethod("showInvite", text, params, uids);
        },
        showNotification:function (text, params, uids) {
            FAPI.invokeUIMethod("showNotification", text, params, uids);
        },
        showPermissions: function (permissions, uiConf) {
            if (Array.isArray(permissions)) {
                permissions = JSON.stringify(permissions);
            }

            FAPI.invokeUIMethod("showPermissions", permissions, uiConf);
        },
        showPayment:function (name, description, code, price, options, attributes, currency, callback, uiConf) {
            FAPI.invokeUIMethod("showPayment", name, description, code, price, options, attributes, currency, callback, uiConf);
        },
        showPortalPayment:function () {
            FAPI.invokeUIMethod("showPortalPayment");
        },
        showConfirmation:function (methodName, userText, signature) {
            FAPI.invokeUIMethod("showConfirmation", methodName, userText, signature);
        },
        setWindowSize:function (width, height) {
            FAPI.invokeUIMethod("setWindowSize", width, height);
        },
        changeHistory:function (params) {
            FAPI.invokeUIMethod("changeHistory", params);
        },
        scrollToTop:function () {
            FAPI.invokeUIMethod("scrollToTop");
        },
        scrollTo: function (x, y) {
            FAPI.invokeUIMethod("scrollTo", x, y);
        },
        getPageInfo:function () {
            FAPI.invokeUIMethod("getPageInfo");
        },
        navigateTo:function (relativeUrlPath) {
            FAPI.invokeUIMethod("navigateTo", relativeUrlPath);
        },
        postMediatopic: function(attachment, status, platforms) {
            FAPI.invokeUIMethod("postMediatopic", JSON.stringify(attachment), status ? 'on' : 'off', platforms ? platforms.join(',') : '');
        },
        showPromoPayment : function(friendId, presentId) {
            FAPI.invokeUIMethod("showPromoPayment", friendId, presentId);
        },
        isSupported: function () {
            return FAPI.mode == 'W' || FAPI.mode == 'F';
        }
    },
    MOBILE:{
        init: function () {
            API_initialized();
        }
    },
    OAUTH:{
        init: function (args, params, hParams) {
            if ((hParams['access_token'] == null) && (hParams['error'] == null)) {
                window.location = 'https://connect.ok.ru/oauth/authorize' +
                        '?client_id=' + args['app_id'] +
                        '&scope=' + (args.oauth_scope || 'VALUABLE_ACCESS') +
                        '&response_type=' + 'token' +
                        '&redirect_uri=' + (args['oauth_url'] || window.location.href) +
                        '&layout=' + 'a' +
                        '&state=' + (args['oauth_state'] || '');
                return;
            }
            if (hParams['error'] != null) {
                window.fapi_failure('Error with OAUTH authorization: ' + hParams['error']);
                return;
            }
            API_initialized();
        }
    },
    Util:{
        isFunc:function (obj) {
            return Object.prototype.toString.call(obj) === "[object Function]";
        },
        isString:function (obj) {
            return Object.prototype.toString.call(obj) === "[object String]";
        },
        calcSignature:function (query, secret) {
            var i, keys = [], sign;
            for (i in query) {
                keys.push(i.toString());
            }
            keys.sort();
            sign = "";
            for (i = 0; i < keys.length; i++) {
                var key = keys[i];
                if (("sig" != key) && ("resig" != key) && ("access_token" != key)) {
                    sign += keys[i] + '=' + query[keys[i]];
                }
            }
            sign += secret;
            sign = this.encodeUtf8(sign);
            return MD5.calc(sign);
        },
        encodeUtf8:function (string) {
            var res = "";
            for (var n = 0; n < string.length; n++) {
                var c = string.charCodeAt(n);
                if (c < 128) {
                    res += String.fromCharCode(c);
                }
                else if ((c > 127) && (c < 2048)) {
                    res += String.fromCharCode((c >> 6) | 192);
                    res += String.fromCharCode((c & 63) | 128);
                }
                else {
                    res += String.fromCharCode((c >> 12) | 224);
                    res += String.fromCharCode(((c >> 6) & 63) | 128);
                    res += String.fromCharCode((c & 63) | 128);
                }
            }
            return res;

        },
        /**
         * Parses parameters to a JS map<br/>
         * Supports both window.location.search and window.location.hash)
         * @param {String} [source=window.location.search] string to parse
         * @returns {Array}
         */
        getRequestParameters:function (source) {
            var res = {};
            var url = source || window.location.search;
            if (url) {
                url = url.substr(1);    // Drop the leading '?' / '#'
                var nameValues = url.split("&");

                for (var i = 0; i < nameValues.length; i++) {
                    var nameValue = nameValues[i].split("=");
                    var name = nameValue[0];
                    var value = nameValue[1];

                    if (name !== undefined && value !== undefined) {
                        value = decodeURIComponent(value.replace(/\+/g, " "));
                        res[name] = value;
                    }
                }
            }
            return res;
        }
    },
    Client:{
        counter:0,
        window:this,
        head:null,
        applicationKey:null,
        sessionKey:null,
        accessToken:null,
        sessionSecretKey:null,
        apiServer:null,
        baseUrl:null,
        uid:null,
        format:"JSON",
        initialized:false,
        errorListeners:{},
        stop: false,

        load:function (url, callback) {

            var xhr = new XMLHttpRequest(), self = this;

            xhr.open('GET', url, true);

            xhr.onreadystatechange = function() {
                if (xhr.readyState === 4) {
                    if (xhr.status == 200) {
                        try {
                            var response = JSON.parse(xhr.responseText);
                            if (response['error_code']) {
                                var errorListener = self.errorListeners[response['error_code']];
                                if (errorListener && typeof errorListener === "function") {
                                    errorListener();
                                }
                                callback("error", null, response);
                            } else {
                                callback("ok", response, null);
                            }
                        } catch (e) {
                            callback("error", "", "content");
                            console.log(xhr.responseText, e);
                        }
                    } else {
                        var errorListener = self.errorListeners[-1];
                        if (errorListener && typeof errorListener === "function") {
                            errorListener();
                        }
                        callback("error", "", "network");
                        console.log("error status:" + xhr.status);
                    }
                }
            };
            xhr.send();
        },
        call:function (params, userCallback, resig) {
            if(this.stop) {
                return;
            }
            if (!this.initialized) {
                this.initialize();
            }
            var query = "?";
            params = this.fillParams(params);
            params["sig"] = FAPI.Util.calcSignature(params, this.sessionSecretKey);
            if (resig != null) {
                params["resig"] = resig;
            }

            for (key in params) {
                if (params.hasOwnProperty(key)) {
                    query += key + "=" + encodeURIComponent(params[key]) + "&";
                }
            }
            this.load(this.baseUrl + query, userCallback);
        },
        calcSignature:function (params) {
            if (!this.initialized) {
                this.initialize();
            }
            params = this.fillParams(params);
            return FAPI.Util.calcSignature(params, this.sessionSecretKey);
        },
        fillParams:function (params) {
            if (!this.initialized) {
                this.initialize();
            }
            params = params || {};
            params["application_key"] = this.applicationKey;
            if (this.sessionKey) {
                params["session_key"] = this.sessionKey;
            } else {
                params["access_token"] = this.accessToken;
            }
            params["format"] = this.format;
            return params;
        },
        initialize:function (params, hParams, args) {
            params = params || FAPI.Util.getRequestParameters();
            hParams = hParams || {};
            args = args || {};
            this.uid = params["logged_user_id"];

            this.applicationKey = params["application_key"] || args['app_key'];
            this.sessionKey = params["session_key"];
            this.accessToken = hParams['access_token'];
            this.sessionSecretKey = params["session_secret_key"] || hParams['session_secret_key'];
            this.apiServer = params["api_server"] || 'https://api.ok.ru/';
            this.baseUrl = this.apiServer + "fb.do";

            this.initialized = true;
        }
    }
};
///UTILS
var MD5 = (function () {
    var hex_chr = "0123456789abcdef";

    function rhex(num) {
        var str = "";
        for (var j = 0; j <= 3; j++) {
            str += hex_chr.charAt((num >> (j * 8 + 4)) & 0x0F) +
                    hex_chr.charAt((num >> (j * 8)) & 0x0F);
        }
        return str;
    }

    /*
     * Convert a string to a sequence of 16-word blocks, stored as an array.
     * Append padding bits and the length, as described in the MD5 standard.
     */
    function str2blks_MD5(str) {
        var nblk = ((str.length + 8) >> 6) + 1;
        var blks = new Array(nblk * 16);
        for (var i = 0; i < nblk * 16; i++) {
            blks[i] = 0;
        }
        for (i = 0; i < str.length; i++) {
            blks[i >> 2] |= str.charCodeAt(i) << ((i % 4) * 8);
        }
        blks[i >> 2] |= 0x80 << ((i % 4) * 8);
        blks[nblk * 16 - 2] = str.length * 8;
        return blks;
    }

    /*
     * Add integers, wrapping at 2^32. This uses 16-bit operations internally
     * to work around bugs in some JS interpreters.
     */
    function add(x, y) {
        var lsw = (x & 0xFFFF) + (y & 0xFFFF);
        var msw = (x >> 16) + (y >> 16) + (lsw >> 16);
        return (msw << 16) | (lsw & 0xFFFF);
    }

    /*
     * Bitwise rotate a 32-bit number to the left
     */
    function rol(num, cnt) {
        return (num << cnt) | (num >>> (32 - cnt));
    }

    /*
     * These functions implement the basic operation for each round of the
     * algorithm.
     */
    function cmn(q, a, b, x, s, t) {
        return add(rol(add(add(a, q), add(x, t)), s), b);
    }

    function ff(a, b, c, d, x, s, t) {
        return cmn((b & c) | ((~b) & d), a, b, x, s, t);
    }

    function gg(a, b, c, d, x, s, t) {
        return cmn((b & d) | (c & (~d)), a, b, x, s, t);
    }

    function hh(a, b, c, d, x, s, t) {
        return cmn(b ^ c ^ d, a, b, x, s, t);
    }

    function ii(a, b, c, d, x, s, t) {
        return cmn(c ^ (b | (~d)), a, b, x, s, t);
    }

    /*
     * Take a string and return the hex representation of its MD5.
     */
    function calcMD5(str) {
        var x = str2blks_MD5(str);
        var a = 1732584193;
        var b = -271733879;
        var c = -1732584194;
        var d = 271733878;

        for (var i = 0; i < x.length; i += 16) {
            var olda = a;
            var oldb = b;
            var oldc = c;
            var oldd = d;

            a = ff(a, b, c, d, x[i + 0], 7, -680876936);
            d = ff(d, a, b, c, x[i + 1], 12, -389564586);
            c = ff(c, d, a, b, x[i + 2], 17, 606105819);
            b = ff(b, c, d, a, x[i + 3], 22, -1044525330);
            a = ff(a, b, c, d, x[i + 4], 7, -176418897);
            d = ff(d, a, b, c, x[i + 5], 12, 1200080426);
            c = ff(c, d, a, b, x[i + 6], 17, -1473231341);
            b = ff(b, c, d, a, x[i + 7], 22, -45705983);
            a = ff(a, b, c, d, x[i + 8], 7, 1770035416);
            d = ff(d, a, b, c, x[i + 9], 12, -1958414417);
            c = ff(c, d, a, b, x[i + 10], 17, -42063);
            b = ff(b, c, d, a, x[i + 11], 22, -1990404162);
            a = ff(a, b, c, d, x[i + 12], 7, 1804603682);
            d = ff(d, a, b, c, x[i + 13], 12, -40341101);
            c = ff(c, d, a, b, x[i + 14], 17, -1502002290);
            b = ff(b, c, d, a, x[i + 15], 22, 1236535329);

            a = gg(a, b, c, d, x[i + 1], 5, -165796510);
            d = gg(d, a, b, c, x[i + 6], 9, -1069501632);
            c = gg(c, d, a, b, x[i + 11], 14, 643717713);
            b = gg(b, c, d, a, x[i + 0], 20, -373897302);
            a = gg(a, b, c, d, x[i + 5], 5, -701558691);
            d = gg(d, a, b, c, x[i + 10], 9, 38016083);
            c = gg(c, d, a, b, x[i + 15], 14, -660478335);
            b = gg(b, c, d, a, x[i + 4], 20, -405537848);
            a = gg(a, b, c, d, x[i + 9], 5, 568446438);
            d = gg(d, a, b, c, x[i + 14], 9, -1019803690);
            c = gg(c, d, a, b, x[i + 3], 14, -187363961);
            b = gg(b, c, d, a, x[i + 8], 20, 1163531501);
            a = gg(a, b, c, d, x[i + 13], 5, -1444681467);
            d = gg(d, a, b, c, x[i + 2], 9, -51403784);
            c = gg(c, d, a, b, x[i + 7], 14, 1735328473);
            b = gg(b, c, d, a, x[i + 12], 20, -1926607734);

            a = hh(a, b, c, d, x[i + 5], 4, -378558);
            d = hh(d, a, b, c, x[i + 8], 11, -2022574463);
            c = hh(c, d, a, b, x[i + 11], 16, 1839030562);
            b = hh(b, c, d, a, x[i + 14], 23, -35309556);
            a = hh(a, b, c, d, x[i + 1], 4, -1530992060);
            d = hh(d, a, b, c, x[i + 4], 11, 1272893353);
            c = hh(c, d, a, b, x[i + 7], 16, -155497632);
            b = hh(b, c, d, a, x[i + 10], 23, -1094730640);
            a = hh(a, b, c, d, x[i + 13], 4, 681279174);
            d = hh(d, a, b, c, x[i + 0], 11, -358537222);
            c = hh(c, d, a, b, x[i + 3], 16, -722521979);
            b = hh(b, c, d, a, x[i + 6], 23, 76029189);
            a = hh(a, b, c, d, x[i + 9], 4, -640364487);
            d = hh(d, a, b, c, x[i + 12], 11, -421815835);
            c = hh(c, d, a, b, x[i + 15], 16, 530742520);
            b = hh(b, c, d, a, x[i + 2], 23, -995338651);

            a = ii(a, b, c, d, x[i + 0], 6, -198630844);
            d = ii(d, a, b, c, x[i + 7], 10, 1126891415);
            c = ii(c, d, a, b, x[i + 14], 15, -1416354905);
            b = ii(b, c, d, a, x[i + 5], 21, -57434055);
            a = ii(a, b, c, d, x[i + 12], 6, 1700485571);
            d = ii(d, a, b, c, x[i + 3], 10, -1894986606);
            c = ii(c, d, a, b, x[i + 10], 15, -1051523);
            b = ii(b, c, d, a, x[i + 1], 21, -2054922799);
            a = ii(a, b, c, d, x[i + 8], 6, 1873313359);
            d = ii(d, a, b, c, x[i + 15], 10, -30611744);
            c = ii(c, d, a, b, x[i + 6], 15, -1560198380);
            b = ii(b, c, d, a, x[i + 13], 21, 1309151649);
            a = ii(a, b, c, d, x[i + 4], 6, -145523070);
            d = ii(d, a, b, c, x[i + 11], 10, -1120210379);
            c = ii(c, d, a, b, x[i + 2], 15, 718787259);
            b = ii(b, c, d, a, x[i + 9], 21, -343485551);

            a = add(a, olda);
            b = add(b, oldb);
            c = add(c, oldc);
            d = add(d, oldd);
        }
        return rhex(a) + rhex(b) + rhex(c) + rhex(d);
    }

    return {
        calc:calcMD5
    };
}());