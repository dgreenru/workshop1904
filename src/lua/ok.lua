local ok = {};

local mysql = require "mysql";
local json = require "cjson";

local payments = {
    ok25 = 40,
    ok50 = 100,
    ok100 = 250,
    ok250 = 750
}

local xml_success = [[
<?xml version="1.0" encoding="UTF-8"?>
<callbacks_payment_response xmlns="http://api.forticom.com/1.0/">
        true
</callbacks_payment_response>]]

local xml_error_invalid_payment = [[
<?xml version="1.0" encoding="UTF-8"?>
<ns2:error_response xmlns:ns2='http://api.forticom.com/1.0/'>
    <error_code>1001</error_code>
    <error_msg>CALLBACK_INVALID_PAYMENT : Payment is invalid and can not be processed</error_msg>
</ns2:error_response>]]

local xml_error_signature = [[
<?xml version="1.0" encoding="UTF-8"?>
<ns2:error_response xmlns:ns2='http://api.forticom.com/1.0/'>
    <error_code>104</error_code>
    <error_msg>PARAM_SIGNATURE : Invalid signature</error_msg>
</ns2:error_response>]]

local xml_error_unknown = [[
<?xml version="1.0" encoding="UTF-8"?>
<ns2:error_response xmlns:ns2='http://api.forticom.com/1.0/'>
    <error_code>1</error_code>
    <error_msg>UNKNOWN : unknown error</error_msg>
</ns2:error_response>]]

local xml_error_service = [[
<?xml version="1.0" encoding="UTF-8"?>
<ns2:error_response xmlns:ns2='http://api.forticom.com/1.0/'>
    <error_code>2</error_code>
    <error_msg>SERVICE : service temporary unavailable/error_msg>
</ns2:error_response>]]


ok._hash = function(a, secret, ignore)
    local src = ""
    local args = {}
    for k, v in pairs(a) do
        if ignore[k] == nil then
            args[#args + 1] = k .. "=" .. v;
        end
    end
    table.sort(args);
    for i = 1, #args do
        src = src .. args[i];
    end
    return ngx.md5(src .. secret);
end

ok.hash = function(secret, ignore)
    return ok._hash(ngx.req.get_uri_args(), secret, ignore);
end


ok.check = function()
    local secret = ngx.var.ok_key;
    local ignore = { sig = true, result = true };
    ignore['app.params'] = true;
    local hash = ok.hash(secret, ignore);
    local args = ngx.req.get_uri_args();
    if hash ~= args.sig then
        if args.sig then
            ngx.log(ngx.ERR, hash .. ' but got ' .. args.sig)
        end
        ngx.exit(403)
        return
    end
    return args.logged_user_id;
end

ok.auth_sig = function()
    local secret = ngx.var.ok_key;
    local args = ngx.req.get_uri_args();
    if args.logged_user_id and args.session_key and args.auth_sig and ngx.md5(args.logged_user_id .. args.session_key .. secret) == args.auth_sig then
        return args.logged_user_id;
    end
    ngx.exit(403)
    return -1;
end



ok.payment_conf = function()
    ngx.say(json.encode(payments));
end


ok.payment = function()
    local secret = ngx.var.ok_key;
    local hash = ok.hash(secret, { sig = true });
    local args = ngx.req.get_uri_args();
    if hash ~= args.sig then
        ngx.say(xml_error_signature);
        ngx.exit(200);
    end
    if args.product_code and payments[args.product_code] then
        local v = function(v)
            if args[v] then
                return ngx.quote_sql_str(args[v]);
            end
            return "''";
        end
        mysql.query(ngx.var.mysql, function(db)
            local res, err, errno, sqlstate = db:query("start transaction");
            if err then
                ngx.log(ngx.ERR, "payment error", err)
            end
            local q = "insert into ok_payment(uid,transaction_id,transaction_time,product_code,product_option,amount,currency,payment_system,extra_attributes) values(%s,%s,%s,%s,%s,%s,%s,%s,%s)";
            local fq = string.format(q, v('uid'), v('transaction_id'), v('transaction_time'), v('product_code'), v('product_option'), v('amount'), v('currency'), v('payment_system'), v('extra_attributes'));
            local res, err, errno, sqlstate = db:query(fq);
            if err then
                ngx.log(ngx.ERR, "payment error: " .. fq, err)
            end
            if res then
                local res, err, errno, sqlstate = db:query(string.format("update player set balance = balance + %d where uid = %s ", payments[args.product_code], v('uid')));
                if err then
                    ngx.log(ngx.ERR, "payment error", err)
                end
                local res, err, errno, sqlstate = db:query("commit");
                if err then
                    ngx.log(ngx.ERR, "payment error", err)
                end
                ngx.say(xml_success);
                ngx.exit(200);
            elseif errno == 1022 then
                ngx.say(xml_success);
                ngx.exit(200);
            end
            db:query("rollback");
        end);
    end
    ngx.header['Invocation-error'] = 1001;
    ngx.log(ngx.ERR, "invalid payment " .. ngx.var.uri);
    ngx.say(xml_error_invalid_payment);
    ngx.exit(200);
end

ok.player = function()
    local uid = ok.auth_sig();
    mysql.query(ngx.var.mysql, function(db)
        local res, err, errno, sqlstate = db:query(string.format("select * from player where uid = %d ", uid));
        if err then
            ngx.log(ngx.ERR, "player error: " .. uid, err)
            ngx.exit(400);
            return
        end
        if #res >= 1 then
            ngx.say(json.encode(res[1]));
        else
            ngx.exit(404);
        end
    end);
end


return ok;