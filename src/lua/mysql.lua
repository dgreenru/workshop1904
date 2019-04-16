local db = {};

local mysql = require"resty.mysql"

db.query = function(url, callback)
    local pos, len, username, password, host, port, database = string.find(url, "^([^:@]*)([^@]*)@*([^/:]+):*([0-9]*)[/](.+)$")
    if pos then

        local db, err = mysql:new()
        if not db then
            ngx.log(ngx.ERR, err);
            ngx.exit(ngx.HTTP_INTERNAL_SERVER_ERROR)
            return
        end
        db:set_timeout(1000)
        local ok, err, errno, sqlstate = db:connect{
            host = host,
            port = port and tonumber(port) or 3306,
            database = database,
            user = username and username or "root",
            password = password and password or "",
            max_packet_size = 1024 * 1024 * 1024
        }
        if not ok then
            ngx.log(ngx.ERR, err);
            ngx.exit(ngx.HTTP_INTERNAL_SERVER_ERROR)
            return
        end

        local status, result = pcall(callback, db)
        local ok, err = db:set_keepalive(10000, 100)
        if not ok then
            ngx.log(ngx.ERR, err)
        end
        if status then
            return result;
        else
            ngx.log(ngx.ERR, result);
            ngx.exit(ngx.HTTP_INTERNAL_SERVER_ERROR)
        end
    else
        ngx.exit(ngx.HTTP_INTERNAL_SERVER_ERROR)
    end
end

return db;
