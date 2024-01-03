const vm = require("vm");
const utils = require("./utils");

var video = {
    is_extracted: false,
    __signature_cipher: null,
    __n_param_algorithm: null,
    extract_youtube_algorithm: async () => {
        let youtube_main_page = await (await fetch("https://www.youtube.com/")).text();
        basejs = await (await fetch("https://www.youtube.com" + youtube_main_page.match(/[a-zA-Z0-9\/\.\_\-]*base\.js/g)[0])).text();

        let signature_cipher = {};

        signature_cipher.main_decoder = basejs.split("\n").filter(a => a.includes("alr") && a.includes("encodeURIComponent") && a.includes("decodeURIComponent"))[0];
        signature_cipher.main_decoder_name = signature_cipher.main_decoder.match(/\=[a-zA-Z]+\(/g)?.at(-1)?.slice(1,-1);
        signature_cipher.core_decoder = basejs.split("\n").filter(a=>a.includes(`${signature_cipher.main_decoder_name}=`))[0];
        signature_cipher.core_decoder_helper_name = signature_cipher.core_decoder.split(";").map(e=>e.split("."))[4][0];
        signature_cipher.core_decoder_helper = basejs.match(RegExp(`var\\ ${signature_cipher.core_decoder_helper_name}\\=[a-zA-Z0-9\\;\\:\\,\\{\\}\\;\\(\\)\\n\\.\\ \\=\\[\\]\\%]{0,150}\\}\\}\\;`))[0];
        video.__n_param_algorithm = basejs.match(/\=function\([a-zA-Z0-9]+\)\{var[\sa-zA-Z\=]+\.split[a-zA-Z\=\.\[\]\+\&\(\)\"\,\{\}0-9\!\%\;\s\n\-\'\:\/\>\<\|\*\?\\]+\_except\_[a-zA-Z0-9\-\_\n\"\+\}]+[\sA-Za-z]+\.join\(\"\"\)\}/g)[0].slice(1);

        video.__signature_cipher = signature_cipher;
        video.is_extracted = true;
    },
    __run_signature_cipher_algotithm: (signature) => {
        let context = `${video.__signature_cipher.core_decoder_helper};${video.__signature_cipher.core_decoder};${video.__signature_cipher.main_decoder_name}("${signature}");`
        return vm.runInNewContext(context);
    },
    solve_signature_cipher: (signature) => {
        let decoded_signature = decodeURIComponent(signature);
        let solved_signature = video.__run_signature_cipher_algotithm(decoded_signature);
        let encoded_signature = encodeURIComponent(solved_signature);
        return encoded_signature;
    },
    solve_signature_cipher_url: (url) => {
        splitted_url = new URLSearchParams(url);
        return decodeURIComponent(splitted_url.get("url")) + "&alr=yes&sig=" + video.solve_signature_cipher(splitted_url.get("s"));
    },
    solve_n_param: (url) => {
        let the_url = new URL(url);
        let n_param = the_url.searchParams.get("n");
        if(n_param != null) {
            let context = `(${video.__n_param_algorithm})("${n_param}");`
            let the_result = vm.runInNewContext(context);
            the_url.searchParams.set("n", the_result);
        }
        return the_url.href;
    },
    __get_video_info_without_age_restriction: async (video_id) => {
        let player = await utils.get_json(`https://www.youtube.com/youtubei/v1/player?key=AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8&prettyPrint=false`, {
            method: "POST",
            body: `{"context":{"client":{"clientName":"TVHTML5_SIMPLY_EMBEDDED_PLAYER","clientVersion":"2.0","clientScreen":"WATCH","hl":"en"},"thirdParty":{"embedUrl":"https://www.youtube.com/"}},"playbackContext":{"contentPlaybackContext":{}},"videoId":"${video_id}","startTimeSecs":0,"racyCheckOk":true,"contentCheckOk":true}`
        }, {
            "Authority": "www.youtube.com",
            "Accept": "*/*",
            "Accept-Language": "en-US,en;q=0.5",
            "Cache-Control": "no-cache",
            "Content-Type": "text/plain;charset=UTF-8",
            "Origin": "https://www.youtube.com",
            "Pragma": "no-cache"
        });

        return player;
    },
    get_video: async (video_id) => {
        let page = await utils.get_text(`https://www.youtube.com/watch?v=${encodeURIComponent(video_id)}`);
        let player = utils.extract_json_data_from_page(page, "ytInitialPlayerResponse");
        let data = utils.extract_json_data_from_page(page, "ytInitialData");

        let is_family_safe = player?.microformat?.playerMicroformatRenderer?.isFamilySafe ?? true;
        let title = player?.microformat?.playerMicroformatRenderer?.title?.simpleText ?? "";
        let thumbnails = player?.videoDetails?.thumbnail?.thumbnails ?? [];
        if(player?.playabilityStatus?.desktopLegacyAgeGateReason){ // Age-Restricted Videos
            is_family_safe = false;
            player = await video.__get_video_info_without_age_restriction(video_id);
        };

        return ({
            audioStreams: player?.streamingData?.adaptiveFormats?.filter(a=>a.mimeType.includes("audio")) ?? [],
            videoStreams: player?.streamingData?.adaptiveFormats?.filter(a=>a.mimeType.includes("video")) ?? [],
            relatedStreams: player?.streamingData?.formats ?? [],
            dash: player?.streamingData?.dashManifestUrl ?? null,
            description: data?.contents?.twoColumnWatchNextResults?.results?.results?.contents?.[1]?.videoSecondaryInfoRenderer?.attributedDescription?.content ?? "",
            length: Number(player?.microformat?.playerMicroformatRenderer?.lengthSeconds ?? 0),
            hls: player?.streamingData?.hlsManifestUrl ?? null,
            likes: Number(data.contents?.twoColumnWatchNextResults?.results?.results?.contents?.[0]?.videoPrimaryInfoRenderer?.videoActions?.menuRenderer?.topLevelButtons?.[0]?.segmentedLikeDislikeButtonViewModel?.likeButtonViewModel?.likeButtonViewModel?.toggleButtonViewModel?.toggleButtonViewModel?.defaultButtonViewModel?.buttonViewModel?.accessibilityText?.replace(/[\.\,]/g,"")?.match(/[0-9]+/g)?.[0] ?? 0),
            isFamilySafe: is_family_safe,
            isUnlisted: player?.microformat?.playerMicroformatRenderer?.isUnlisted ?? false,
            isLiveNow: player?.microformat?.playerMicroformatRenderer?.liveBroadcastDetails?.isLiveNow ?? false,
            isPrivate: player?.videoDetails?.isPrivate ?? false,
            keywords: player?.videoDetails?.keywords ?? [],
            captions: player?.captions?.playerCaptionsTracklistRenderer?.captionTracks ?? [],
            thumbnails: thumbnails,
            title: title,
            views: Number(player?.microformat?.playerMicroformatRenderer?.viewCount ?? 0),
            category: player?.microformat?.playerMicroformatRenderer?.category ?? null,
            owner: {
                name: player?.videoDetails?.author ?? "",
                thumbnails: data?.contents?.twoColumnWatchNextResults?.results?.results?.contents?.[1]?.videoSecondaryInfoRenderer?.owner?.videoOwnerRenderer?.thumbnail?.thumbnails || [],
                verified: (data?.contents?.twoColumnWatchNextResults?.results?.results?.contents?.[1]?.videoSecondaryInfoRenderer?.owner?.videoOwnerRenderer?.badges?.filter(a=>a.metadataBadgeRenderer?.style?.includes("VERIFIED")).length ?? 0) > 0,
                id: player?.microformat?.playerMicroformatRenderer?.externalChannelId ?? null,
                profile: player?.microformat?.playerMicroformatRenderer?.ownerProfileUrl ?? null,
                followers: data?.contents?.twoColumnWatchNextResults?.results?.results?.contents?.[1]?.videoSecondaryInfoRenderer.owner?.videoOwnerRenderer?.subscriberCountText?.simpleText?.match(/[0-9a-zA-Z\.]+/g)?.[0]?.replace("K"," 1000")?.replace("M", " 1000000")?.split(" ")?.reduce((total, current) => {return total*Number(current)},1)
            },
            cards: data?.cards?.cardCollectionRenderer?.cards ?? null,
            nextVideos: data?.contents?.twoColumnWatchNextResults?.secondaryResults?.secondaryResults?.results?.filter(a=>a?.compactVideoRenderer!=undefined).map(a=>a?.compactVideoRenderer).map(video => ({
            id: video.videoId,
            title: video.title.simpleText,
            thumbnails: video.thumbnail.thumbnails,
            views: Number(video.title.accessibility.accessibilityData.label.match(/[0-9\.\,\ ]+view/g)[0].replace(/[A-Za-z\ \.\,]+/g, "")),
            length: Number(video.lengthSeconds),
            owner: {
                name: video.shortBylineText.runs[0].text,
                verified: (video.ownerBadges?.filter(a=>a.metadataBadgeRenderer?.style?.includes("VERIFIED")).length ?? 0) > 0,
                id: video.shortBylineText.runs[0].navigationEndpoint.commandMetadata.webCommandMetadata.url.replace("/channel/","")
            },
        })) ?? [],
            nextVideosToken: data?.contents?.twoColumnWatchNextResults?.secondaryResults?.secondaryResults?.results?.filter(a=>a?.continuationItemRenderer!=undefined)?.[0]?.continuationItemRenderer?.continuationEndpoint?.continuationCommand?.token ?? null,
            commentsToken: data?.contents?.twoColumnWatchNextResults?.results?.results?.contents?.[3]?.itemSectionRenderer?.contents?.[0]?.continuationItemRenderer?.continuationEndpoint?.continuationCommand?.token ?? null
        });
    },
    get_comments: async (commentsToken) => {
        let response = await utils.get_json("https://www.youtube.com/youtubei/v1/next?key=AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8&prettyPrint=false", {
            method: "POST",
            body: `{"context":{"client":{"clientName":"WEB","clientVersion":"2.20231117.01.04","platform":"DESKTOP"},"user":{},"request":{"useSsl":true}},"continuation":"${commentsToken}"}`
        });

        let continuationItems = (
            response?.onResponseReceivedEndpoints?.filter(a=>a?.reloadContinuationItemsCommand?.slot == "RELOAD_CONTINUATION_SLOT_BODY")?.[0]?.reloadContinuationItemsCommand?.continuationItems||
            response?.onResponseReceivedEndpoints?.[0]?.appendContinuationItemsAction?.continuationItems
        );

        return ({
            disabled: false,
            comments: continuationItems?.filter(a => a?.commentThreadRenderer != undefined).map(a => a?.commentThreadRenderer).map(comment => ({
                id: comment?.comment?.commentRenderer?.commentId ?? null,
                text: comment?.comment?.commentRenderer?.contentText?.runs?.[0]?.text ?? "",
                time: comment?.comment?.commentRenderer?.publishedTimeText?.runs?.[0]?.text ?? "", // it need to be converted into time
                isEdited: (comment?.comment?.commentRenderer?.publishedTimeText?.runs?.[0]?.text?.match(/\([a-zA-Z]+\)/g)?.length ?? 0) > 0,
                replies: {
                    count: comment?.comment?.commentRenderer?.replyCount ?? 0,
                    nextPage: comment?.replies?.commentRepliesRenderer?.contents?.[0]?.continuationItemRenderer?.continuationEndpoint?.continuationCommand?.token ?? null
                },
                likeCount: Number(comment?.comment?.commentRenderer?.voteCount?.simpleText ?? 0),
                owner: {
                    name: comment?.comment?.commentRenderer?.authorText?.simpleText ?? "", // yt is not providing real name (even you can see the issue in yt's comment section)
                    is_video_owner: comment?.comment?.commentRenderer?.authorIsChannelOwner ?? false,
                    thumbnails: comment?.comment?.commentRenderer?.authorThumbnail?.thumbnails ?? [],
                    id: comment?.comment?.commentRenderer?.authorEndpoint?.browseEndpoint?.browseId ?? null,
                    profile: comment?.comment?.commentRenderer?.authorText?.simpleText ?? null
                }
            })),
            nextpage: continuationItems?.filter(a=>a.continuationItemRenderer!=undefined)?.[0]?.continuationItemRenderer?.continuationEndpoint?.continuationCommand?.token ?? null
        });
    }
};

module.exports = video;
