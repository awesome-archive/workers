addEventListener('fetch', event => {
    event.respondWith(handleRequest(event))
})

async function handleRequest(event) {
    let request = event.request

    const cache = caches.default
    let response = await cache.match(request)

    if (response) {
        return response
    }

    let reqHeaders = new Headers(request.headers),
        outBody, outStatus = 200,
        outCt = null,
        outHeaders = new Headers({
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
            "Access-Control-Allow-Headers": reqHeaders.get('Access-Control-Allow-Headers') || "Accept, Authorization, Cache-Control, Content-Type, DNT, If-Modified-Since, Keep-Alive, Origin, User-Agent, X-Requested-With, Token, x-access-token"
        })
    try {
        let url = request.url.substr(8)
        url = url.substr(url.indexOf('/') + 1)
        if (request.method == "OPTIONS" || url.length < 3 || url.indexOf('.') == -1 || url == "favicon.ico" || url == "robots.txt") {
            outBody = JSON.stringify({
                code: -2,
                msg: 'Not allowed',
                data: {}
            })
            outCt = "application/json"
        } else {
            if (url.toLowerCase().indexOf("http") == -1) {
                url = "http://" + url
            }

            let fp = {
                method: request.method,
                headers: {}
            }

            let he = reqHeaders.entries()
            for (let h of he) {
                if (!['content-length', 'content-type'].includes(h[0])) {
                    fp.headers[h[0]] = h[1]
                }
            }

            if (["POST", "PUT", "PATCH", "DELETE"].indexOf(request.method) >= 0) {
                const ct = (reqHeaders.get('content-type') || "").toLowerCase()
                if (ct.includes('application/json')) {
                    fp.body = JSON.stringify(await request.json())
                } else if (ct.includes('application/text') || ct.includes('text/html')) {
                    fp.body = await request.text()
                } else if (ct.includes('form')) {
                    fp.body = await request.formData()
                } else {
                    fp.body = await request.blob()
                }
            }

            let fr = (await fetch(url, fp))
            outCt = fr.headers.get('content-type')
            outBody = fr.body
        }
    } catch (err) {
        outCt = "application/json"
        outBody = JSON.stringify(err.stack) || err
    }

    if (outCt && outCt != "") {
        outHeaders.set("content-type", outCt)
    }

    outHeaders.set('cache-control', 'public, max-age=946080000')

    response = new Response(outBody, {
        status: outStatus,
        headers: outHeaders
    })

    event.waitUntil(cache.put(event.request, response.clone()))

    return response
}