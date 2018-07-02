process.env.NODE_ENV = 'production';

const unhandledRejections = new Map();
const config = require('./config.json');
const http = require('http');
const createHandler = require('node-github-webhook');
const handler = createHandler({ path: '/github', secret: config.github.secret });
const { exec } = require('child_process');

process.on('exit', (code) => {
    if (config.debug) {console.log(`forced exit of code: ${code}`);} else {return;}
});
process.on('unhandledRejection', (reason, p) => {
    unhandledRejections.set(p, reason);
    if (config.debug) {console.log(`Unhandled rejection: ${p} : ${reason}`);} else {return;}
});
process.on('rejectionHandled', (p) => {
    unhandledRejections.delete(p);
    if (config.debug) {console.log(`Rejection handled: ${p}`);} else {return;}
});
process.on('uncaughtException', (err) => {
    if (config.debug) {console.log(`Caught exception: ${err.stack}`);} else {return;}
});
process.on('warning', (warning) => {
    if (config.debug) {console.log(`Process warning: ${warning.name}\nMessage: ${warning.message}\nStack trace:\n${warning.trace}`);} else {return;}
});

http.createServer((req, res) => {
    handler(req, res, (err) => {
        if (err) { throw err; }
        res.statusCode = 404;
        res.end('Error: 404');
    });
}).listen(config.http.port);

handler.on('error', (err) => {
    if (config.debug) {console.error('Error:', err.message);} else {return;}
});

handler.on('push', (event) => {
    Name = event.payload.repository.name;
    Branch = event.payload.ref.replace("refs/heads/", "");

    if (config.debug) {console.log(`Pull Request From ${Name}/${Branch}`);}

    switch (Name) {
        case "Panel-Website":
            switch (Branch) {
                case "master":
                    Dir = '/var/www/Panel-Website';
                    End = 'pm2 restart Panel-Website';
                    break;
                /*
                case "development":
                    Dir = '/var/www/ALPanelDEV';
                    End = 'pm2 restart Panel-WebsiteDEV';
                    break;
                */

                default:
                    return;
            };
            break;

        case "Panel-API":
            switch (Branch) {
                case "master":
                    Dir = '/var/www/Panel-API';
                    End = 'pm2 restart Panel-API';
                    break;

                default:
                    return;
            };
            break;

        default:
            return;
    };

    exec('cd '+Dir+' && git add -A . && git stash && git pull && npm install && '+End, (error, stdout, stderr) => {
        if (error) {
            if (config.debug) {return console.error(`exec error: ${error}`);} else {return;}
        } else {
            if (config.debug) {console.log(`${Name}/${Branch} Pull & Restart Success`);} else {return;}
        }
    });
});

handler.on('issues', (event) => {
    if (config.debug) {console.log('Received an issue event for %s action=%s: #%d %s', event.payload.repository.name, event.payload.action, event.payload.issue.number, event.payload.issue.title);} else {return;}
});
