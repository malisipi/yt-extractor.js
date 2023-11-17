const vm = require("vm");

var video = {
    __signature_cipher: null,
    __default_headers: {
        "Accept": "*/*",
        "Cache-Control": "no-cache",
        "Content-Type": "application/json",
        "Pragma": "no-cache",
        "Sec-Ch-Ua": `"Google Chrome";v="119", "Chromium";v="119", "Not?A_Brand";v="24"`,
        "Sec-Ch-Ua-Arch": `"x86"`,
        "Sec-Ch-Ua-Bitness": `"64"`,
        "Sec-Ch-Ua-Full-Version": `"119.0.6045.123"`,
        "Sec-Ch-Ua-Full-Version-List": `"Google Chrome";v="119.0.6045.123", "Chromium";v="119.0.6045.123", "Not?A_Brand";v="24.0.0.0"`,
        "Sec-Ch-Ua-Mobile": "?0",
        "Sec-Ch-Ua-Model": `""`,
        "Sec-Ch-Ua-Platform": `"Linux"`,
        "Sec-Ch-Ua-Platform-Version": `"6.5.0"`,
        "Sec-Ch-Ua-Wow64": "?0",
        "Sec-Fetch-Dest": "empty",
        "Sec-Fetch-Mode": "same-origin",
        "Sec-Fetch-Site": "same-origin",
        "X-Goog-Authuser": "0",
        "X-Origin": "https://www.youtube.com",
        "X-Youtube-Bootstrap-Logged-In": "false",
        "X-Youtube-Client-Name": "1",
        "X-Youtube-Client-Version": "2.20231116.01.01"
    },
    extract_signature_cipher_algorithm: async () => {
        let youtube_main_page = await (await fetch("https://www.youtube.com/", {headers: video.__default_headers})).text();
        basejs = await (await fetch("https://www.youtube.com" + youtube_main_page.match(/[a-zA-Z0-9\/\.\_\-]*base\.js/g)[0], {headers: video.__default_headers})).text();
    
        let signature_cipher = {};

        signature_cipher.main_decoder = basejs.split("\n").filter(a => a.includes("alr") && a.includes("encodeURIComponent") && a.includes("decodeURIComponent"))[0];
        signature_cipher.main_decoder_name = signature_cipher.main_decoder.match(/\=[a-zA-Z]+\(/g)?.at(-1)?.slice(1,-1);
        signature_cipher.core_decoder = basejs.split("\n").filter(a=>a.includes(`${signature_cipher.main_decoder_name}=`))[0];
        signature_cipher.core_decoder_helper_name = signature_cipher.core_decoder.split(";").map(e=>e.split("."))[4][0];
        signature_cipher.core_decoder_helper = basejs.match(RegExp(`var\\ ${signature_cipher.core_decoder_helper_name}\\=[a-zA-Z0-9\\;\\:\\,\\{\\}\\;\\(\\)\\n\\.\\ \\=\\[\\]\\%]{0,150}\\}\\}\\;`))[0];

        video.__signature_cipher = signature_cipher;
    },
    __run_signature_cipher_algotithm: (signature) => {
        let context = `${video.__signature_cipher.core_decoder_helper};${video.__signature_cipher.core_decoder};${video.__signature_cipher.main_decoder_name}("${signature}");`
        return vm.runInNewContext(context);
    },
    solve_signature_cipher: (signature) => {
        decoded_signature = decodeURIComponent(signature);
        solved_signature = video.__run_signature_cipher_algotithm(decoded_signature);
        encoded_signature = encodeURIComponent(solved_signature);
        return encoded_signature;
    },
    get_video: async (video_id) => {
        let request = await fetch("https://www.youtube.com/youtubei/v1/player?key=AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8&prettyPrint=false", {
            headers: video.__default_headers,
            method: "POST",
            body: `{"context":{"client":{"hl":"en","gl":"US","deviceMake":"","deviceModel":"","userAgent":"Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36,gzip(gfe)","clientName":"WEB","clientVersion":"2.20231116.01.01","osName":"X11","osVersion":"","originalUrl":"https://www.youtube.com/watch?v=$video_id","platform":"DESKTOP","browserName":"Chrome","browserVersion":"119.0.0.0","acceptHeader":"text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7","clientScreen":"WATCH"},"user":{},"request":{"useSsl":true}},"videoId":"$video_id","playbackContext":{"contentPlaybackContext":{"currentUrl":"/watch?v=$video_id","vis":0,"splay":false,"autoCaptionsDefaultOn":false,"autonavState":"STATE_ON","html5Preference":"HTML5_PREF_WANTS","signatureTimestamp":19676,"referer":"https://www.youtube.com/watch?v=$video_id","lactMilliseconds":"-1","watchAmbientModeContext":{"hasShownAmbientMode":true,"watchAmbientModeEnabled":true}}},"racyCheckOk":false,"contentCheckOk":false}`.replaceAll("$video_id", video_id )
        });
        return await request.json();
    },
    solve_signature_cipher_url: (url) => {
        splitted_url = new URLSearchParams(url);
        return decodeURIComponent(splitted_url.get("url")) + "&sig=" + video.solve_signature_cipher(splitted_url.get("s"));
    }
};

module.exports = video;