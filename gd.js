const CryptoJS = require('crypto-js');
const Base64 = require('js-base64').Base64;
const authConfig = {
    "ase_password": "",
    "client_id": "",
    "client_secret": "",
    "refresh_token": ""
};

let gd;

addEventListener('fetch', event => {
    event.respondWith(handleRequest(event));
});

let oriEvent

async function handleRequest(event) {
    oriEvent = event
    let request = event.request

    const cache = caches.default
    let response = await cache.match(request)

    if (response) {
        return response
    }

    if (gd == undefined) {
        gd = new googleDrive(authConfig);
    }

    let url = new URL(request.url);
    let str = url.pathname.substr(1);

    let fileId;

    try {
        str = Base64.decode(str)
        fileId = CryptoJS.AES.decrypt(str, authConfig.ase_password).toString(CryptoJS.enc.Utf8);
    } catch (error) {
        console.error('error', error);
        return new Response(JSON.stringify({
            code: -2,
            msg: 'Access denied',
            data: {}
        }), {
            status: 403
        });
    }

    if (fileId || fileId.split('||!||').length === 2) {
        let result = fileId.split('||!||');
        authConfig.root = result[0]
        let range = request.headers.get('Range');
        return gd.download(result[1], range);
    } else {
        console.error('error', fileId)
        return new Response(JSON.stringify({
            code: -2,
            msg: 'Access denied',
            data: {}
        }), {
            status: 403
        });
    }
}

class googleDrive {
    constructor(authConfig) {
        this.authConfig = authConfig;
        this.accessToken();
    }

    async download(id, range = '') {
        let url = `https://www.googleapis.com/drive/v3/files/${id}?alt=media`;
        let requestOption = await this.requestOption();
        requestOption.headers['Range'] = range;
        requestOption.headers['Cache-Control'] = 'max-age=2592000';

        const cache = caches.default

        let response = await fetch(url, requestOption);
        let headers = Object.assign(response.headers, {
            'cache-control': 'public, max-age=946080000'
        })

        response = new Response(response.body, {
            ...response,
            headers
        })
    
        oriEvent.waitUntil(cache.put(oriEvent.request, response.clone()))

        return response
    }

    async accessToken() {
        console.log("accessToken");
        if (this.authConfig.expires == undefined || this.authConfig.expires < Date.now()) {
            const obj = await this.fetchAccessToken();
            if (obj.access_token != undefined) {
                this.authConfig.accessToken = obj.access_token;
                this.authConfig.expires = Date.now() + 3500 * 1000;
            }
        }
        return this.authConfig.accessToken;
    }

    async fetchAccessToken() {
        console.log("fetchAccessToken");
        const url = "https://www.googleapis.com/oauth2/v4/token";
        const headers = {
            'Content-Type': 'application/x-www-form-urlencoded'
        };
        const post_data = {
            'client_id': this.authConfig.client_id,
            'client_secret': this.authConfig.client_secret,
            'refresh_token': this.authConfig.refresh_token,
            'grant_type': 'refresh_token'
        }

        let requestOption = {
            'method': 'POST',
            'headers': headers,
            'body': this.enQuery(post_data)
        };

        const response = await fetch(url, requestOption);
        return await response.json();
    }

    async requestOption(headers = {}, method = 'GET') {
        const accessToken = await this.accessToken();
        headers['authorization'] = 'Bearer ' + accessToken;
        return {
            'method': method,
            'headers': headers
        };
    }

    enQuery(data) {
        const ret = [];
        for (let d in data) {
            ret.push(encodeURIComponent(d) + '=' + encodeURIComponent(data[d]));
        }
        return ret.join('&');
    }

    sleep(ms) {
        return new Promise(function (resolve, reject) {
            let i = 0;
            setTimeout(function () {
                console.log('sleep' + ms);
                i++;
                if (i >= 2) reject(new Error('i>=2'));
                else resolve(i);
            }, ms);
        })
    }
}