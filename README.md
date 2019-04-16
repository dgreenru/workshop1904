
Start server
~~~~
mkdir nginx
openresty -p $(pwd)/nginx -c ../src/nginx/dev.ngx.conf
~~~~


Reload server
~~~~
openresty -p $(pwd)/nginx -c ../src/nginx/dev.ngx.conf -s reload
~~~~

Stop server
~~~~
openresty -p $(pwd)/nginx -c ../src/nginx/dev.ngx.conf -s stop
~~~~
