const vm = require("vm");
const utils = require("./utils");

var video = {
    __signature_cipher: null,
    extract_signature_cipher_algorithm: async () => {
        let youtube_main_page = await (await fetch("https://www.youtube.com/")).text();
        basejs = await (await fetch("https://www.youtube.com" + youtube_main_page.match(/[a-zA-Z0-9\/\.\_\-]*base\.js/g)[0])).text();
    
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
        let page = await utils.get_text(`https://www.youtube.com/watch?v=${encodeURIComponent(video_id)}`);
        let player = utils.extract_json_data_from_page(page, "ytInitialPlayerResponse");
        let data = utils.extract_json_data_from_page(page, "ytInitialData");
        return {
            player: player,
            data: data
        };
        // Next Videos: @.data.contents.twoColumnWatchNextResults.secondaryResults.secondaryResults.results
        // Cards: @.data.cards
        // Captions: @.player.captions.playerCaptionsTracklistRenderer.captionTracks
    },
    solve_signature_cipher_url: (url) => {
        splitted_url = new URLSearchParams(url);
        return decodeURIComponent(splitted_url.get("url")) + "&sig=" + video.solve_signature_cipher(splitted_url.get("s"));
    }
};

module.exports = video;