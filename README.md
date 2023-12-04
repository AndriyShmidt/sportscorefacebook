How to get token

1. Follow the link to get clinet-id
https://developers.facebook.com/apps/845546184238009/settings/basic/

login: Admin@sportscore.io
pass: Ssgeli9988!@

2. Follow the link to get code

    - client_id={app-id}: Your app’s ID from the app dashboard.

https://www.facebook.com/v15.0/dialog/oauth?response_type=code%20granted_scopes&client_id={YOUR-CLIENT-ID}&redirect_uri=https%3A%2F%2Fsportscore.io%2F&scope=pages_show_list,business_management,instagram_basic,instagram_content_publish,pages_read_engagement,pages_manage_posts,public_profile&state=12345


    - click "Reconect";
    - click "Got it";
    - copy "code" from url;

3. Exchange the Code for a User Access Token

    - code={auth-code}: The authorization code you copyed
    - client_id={app-id}: Your app’s ID from the developer portal
    - client_secret={app-secret}: Your app’s app secret from the developer portal

https://graph.facebook.com/v15.0/oauth/access_token?code={auth-code}&client_id={app-id}&client_secret={app-secret}&redirect_uri=https%3A%2F%2Fsportscore.io%2F

    - copy "access_token"

4. Token replacement on the server

    - open "Terminal"
    - enter the command "ssh root@45.61.138.203"
    - enter password "Ssgeli9988!@a"
    - enter the command "cd sportscorefacebook"
    - enter the command "pm2 stop post_article.js"
    - enter the command "echo {your-new-token} > token.txt"
    - enter the command "pm2 start post_article.js"

