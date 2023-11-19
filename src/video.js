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
    solve_signature_cipher_url: (url) => {
        splitted_url = new URLSearchParams(url);
        return decodeURIComponent(splitted_url.get("url")) + "&sig=" + video.solve_signature_cipher(splitted_url.get("s"));
    },
    get_video: async (video_id) => {
        let page = await utils.get_text(`https://www.youtube.com/watch?v=${encodeURIComponent(video_id)}`);
        let player = utils.extract_json_data_from_page(page, "ytInitialPlayerResponse");
        let data = utils.extract_json_data_from_page(page, "ytInitialData");
        return ({
            audioStreams: player?.streamingData?.adaptiveFormats?.filter(a=>a.mimeType.includes("audio")) ?? null,
            videoStreams: player?.streamingData?.adaptiveFormats?.filter(a=>a.mimeType.includes("video")) ?? null,
            relatedStreams: player?.streamingData?.formats ?? null,
            dash: player?.streamingData?.dashManifestUrl ?? null,
            description: data?.contents?.twoColumnWatchNextResults?.results?.results?.contents[1]?.videoSecondaryInfoRenderer?.attributedDescription?.content ?? "",
            length: Number(player?.microformat?.playerMicroformatRenderer?.lengthSeconds ?? 0),
            hls: player.streamingData.hlsManifestUrl ?? null,
            likes: Number(data.contents?.twoColumnWatchNextResults?.results?.results?.contents[0]?.videoPrimaryInfoRenderer?.videoActions?.menuRenderer?.topLevelButtons[0]?.segmentedLikeDislikeButtonRenderer?.likeButton?.toggleButtonRenderer?.accessibility?.label?.replace(/[\.\,]/g,"")?.match(/[0-9]+/g)[0] ?? 0),
            isFamilySafe: player?.microformat?.playerMicroformatRenderer?.isFamilySafe ?? true,
            isUnlisted: player?.microformat?.playerMicroformatRenderer?.isUnlisted ?? false,
            isLiveNow: player?.microformat?.playerMicroformatRenderer?.liveBroadcastDetails?.isLiveNow ?? false,
            isPrivate: player?.videoDetails?.isPrivate ?? false,
            keywords: player?.videoDetails?.keywords ?? [],
            captions: player?.captions?.playerCaptionsTracklistRenderer?.captionTracks ?? null,
            thumbnails: player?.videoDetails?.thumbnail?.thumbnails ?? [],
            title: player?.microformat?.playerMicroformatRenderer?.title?.simpleText ?? "",
            views: Number(player?.microformat?.playerMicroformatRenderer?.viewCount ?? 0),
            category: player?.microformat?.playerMicroformatRenderer?.category ?? null,
            owner: {
                name: player?.videoDetails?.author ?? "",
                thumbnails: data?.contents?.twoColumnWatchNextResults?.results?.results?.contents[1]?.videoSecondaryInfoRenderer?.owner?.videoOwnerRenderer?.thumbnail?.thumbnails || [],
                verified: (data?.contents?.twoColumnWatchNextResults?.results?.results?.contents[1]?.videoSecondaryInfoRenderer?.owner?.videoOwnerRenderer?.badges?.filter(a=>a.metadataBadgeRenderer?.style?.includes("VERIFIED")).length ?? 0) > 0,
                channel_id: player?.microformat?.playerMicroformatRenderer?.externalChannelId ?? null,
                profile: player?.microformat?.playerMicroformatRenderer?.ownerProfileUrl ?? null
            },
            cards: data?.cards?.cardCollectionRenderer?.cards ?? null,
            nextVideos: data?.contents?.twoColumnWatchNextResults?.secondaryResults?.secondaryResults?.results ?? []
        });
    }
};

module.exports = video;