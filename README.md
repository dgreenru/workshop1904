mkdir nginx
openresty -p $(pwd)/nginx -c ../src/nginx/dev.ngx.conf -s reload