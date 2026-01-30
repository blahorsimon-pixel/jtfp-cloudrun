你根据这上面的要求操作

明确一点，小程序是在服务器端开发，完成后，须在服务器完成模拟测试，然后上传微信小程序后台
服务器端，环境LINUX

服务器上如何一键上传
你每次在服务器改完 /www/wwwroot/H5/miniapp/ 后，执行：

cd /www/wwwroot/H5MINI_BUILD=1 MINI_DESC="本次更新说明" npm run miniapp:upload

版本号规则（你选的 2）：YYYY.MM.DD-<MINI_BUILD>，例如 2026.01.07-1
已验证成功上传：刚才已实际跑通上传，后台会出现对应版本。