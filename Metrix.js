const decrypt = (text) => {
    const cry = (a, b) => {
        try {
            var c = [''];
            var d = 0;
            for (var e = 0; e < b.length; ++e) {
                c.push(String.fromCharCode(a.charCodeAt(d) ^ b.charCodeAt(e)));
                d++;
                if (d >= a.length) {
                    d = 0;
                }
            }
            return c.join('');
        } catch (a) {
            return null;
        }
    }

    let result = ''
    if (result.length === 0) {
        var e = text.substr(0, 32);
        var f = '';
        for (var g = 32; g < text.length; g += 2) {
            f += String.fromCharCode(parseInt(text.substr(g, 2), 16));
        }
        result = cry(e, f);
    }

    return result
}

function decodeHexString(hexString) {
    const regex = /\\x([0-9a-fA-F]{2})/g;
    let decodedString = hexString.replace(regex, (match, hex) => {
        return String.fromCharCode(parseInt(hex, 16));
    });
    return decodedString;
}

class Metrix {
    constructor(requestFunc) {
        this.request = requestFunc

        this.orgId = '<placeholder>' // Get the organization id you are targeting. Can be found easily by intercepting the http requests.
        this.cookies = {}
    }

    extractFromTags(text) {
        text = decodeHexString(text)

        const regex = /\("([^"]+)"/gm
        const CIS3SIDRegex = /CIS3SID=([0-9A-F]{32})/
        const OrgIdRegex = /org_id=([0-9a-zA-Z]+)/
        const NonceRegex = /nonce=([0-9a-zA-Z]+)&/

        const results = text.matchAll(regex);

        let values = {}
        for (let result of results) {
            result = result?.[1];
            if (!result) continue

            const decoded = decrypt(result);

            const matchedCIS3SID = decoded.match(CIS3SIDRegex)?.[1]
            matchedCIS3SID && (values['CIS3SID'] = matchedCIS3SID)

            const matchedOrgId = decoded.match(OrgIdRegex)?.[1]
            matchedOrgId && (values['OrgId'] = matchedOrgId)

            const matchedNonce = decoded.match(NonceRegex)?.[1]
            matchedNonce && (values['Nonce'] = matchedNonce)
        }

        return values
    }

    tags = async (transactionId) => { // Transaction id is from the payment processor used. In my case it was stripe.
        const response = await this.request(`https://h.online-metrix.net/fp/tags.js?org_id=${this.orgId}&session_id=${transactionId}`, {
            ignoreCookies: true, // Ignore sending cookies in request headers from cookie jar inside the request function.
            headers: {
                'Host': 'h.online-metrix.net',
                'Connection': 'keep-alive',
                'Sec-Ch-Ua': '"Not/A)Brand";v="8", "Chromium";v="126", "Brave";v="126"',
                'Sec-Ch-Ua-Mobile': '?0',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
                'Sec-Ch-Ua-Platform': '"Windows"',
                'Accept': '*/*',
                'Sec-Gpc': '1',
                'Accept-Language': 'en-GB,en;q=0.5',
                'Sec-Fetch-Site': 'cross-site',
                'Sec-Fetch-Mode': 'no-cors',
                'Sec-Fetch-Dest': 'script',
                'Accept-Encoding': 'gzip, deflate, br, zstd'
            }
        })
      
        this.tags = this.extractFromTags(response.body)

        if (response.cookies)
            this.cookies = { ...this.cookies, ...response.cookies }

        return response
    }
}

module.exports = Metrix;
