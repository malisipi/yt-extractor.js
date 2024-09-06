const vm = require("vm");
// vm.runInNewContext = (a)=>{console.warn(a);return eval(a);}; // It's useful to debug runInContext bugs, don't use in prod, it's unsafe
const utils = require("./utils");

var video = {
    is_extracted: false,
    __signature_cipher: null,
    __n_param_algorithm: null,
    extract_youtube_algorithm: async () => {
        let youtube_main_page = await (await fetch("https://www.youtube.com/")).text();
        let basejs = await (await fetch("https://www.youtube.com" + youtube_main_page.match(/[a-zA-Z0-9\/\.\_\-]*base\.js/g)[0])).text();

        let signature_cipher = {};

        signature_cipher.main_decoder = basejs.split("\n").filter(a => a.includes("alr") && a.includes("encodeURIComponent") && a.includes("decodeURIComponent"))[0];
        signature_cipher.main_decoder_name = signature_cipher.main_decoder.match(/\&\&[a-zA-Z\$\(]+\=[a-zA-Z\$]+\(decodeURIComponent/g)[0].split("=")[1].split("(")[0];
        signature_cipher.core_decoder = basejs.split("\n").filter(a=>a.includes(`${signature_cipher.main_decoder_name}=`))[0];
        signature_cipher.core_decoder_helper_name = signature_cipher.core_decoder.split(";").map(e=>e.split("."))[3][0];
        signature_cipher.core_decoder_helper = basejs.match(RegExp(`var\\ ${signature_cipher.core_decoder_helper_name.replaceAll("$","\\$")}\\=[a-zA-Z0-9\\;\\:\\,\\{\\}\\;\\(\\)\\n\\.\\ \\=\\[\\]\\%]{0,150}\\}\\}\\;`))[0];
        video.__n_param_algorithm = basejs.match(/\=function\([a-zA-Z0-9\.]+\)\{var[\.\sa-zA-Z\=]+\.split[a-zA-Z\=\.\[\]\+\&\(\)\"\,\{\}0-9\!\%\;\s\n\-\_\'\:\.\/\>\<\|\*\?\\\^\.]+\_except\_[a-zA-Z0-9\-\_\n\"\+\}]+[\sA-Za-z\.]+\.join[a-zA-Z\.]*\([a-zA-Z\,\"\(\)]+\)\}/g)[0].slice(1);
        signature_cipher.the_signature = parseInt(basejs.match(/signatureTimestamp\:[0-9]*/g)?.[0].replace(/[a-zA-Z\(\)\.\:]/g,"")) ?? 0;

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
    get_real_stream_uri: async (target_uri) => {
        // It's required when you send too much request to YT
        // YT would deny give stream from exact uri
        // The function will return real stream uri
        const headers = await fetch(target_uri, {method: "HEAD" });
        if(headers.headers.get("content-type") == "text/plain"){
            console.warn("YT is throttling the URI.");
            if(headers.status == 0 || headers.status == 403 || headers.status == 404 || Number(headers.headers.get("content-length")) < 20){
                console.warn("Failed to extract real stream uri");
                return null;
            }
            let new_uri = await fetch(target_uri);
            return await video.get_real_stream_uri(await new_uri.text());
        };
        return target_uri;
    },
    __get_video_info_without_age_restriction: async (video_id) => {
        let player = await utils.get_json(`https://www.youtube.com/youtubei/v1/player?key=AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8&prettyPrint=false`, {
            method: "POST",
            body: `{"context":{"client":{"clientName":"TVHTML5_SIMPLY_EMBEDDED_PLAYER","clientVersion":"2.0","clientScreen":"WATCH","hl":"en"},"thirdParty":{"embedUrl":"https://www.youtube.com/"}},"playbackContext":{"contentPlaybackContext":{"signatureTimestamp":${video.__signature_cipher.the_signature}}},"videoId":"${video_id}","startTimeSecs":0,"racyCheckOk":true,"contentCheckOk":true}`
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
        let signature_timestamp = page.match(/\"STS\"\:[0-9]*/g)[0].match(/[0-9]+/g)[0] || video.__signature_cipher.the_signature;

        let player = utils.extract_json_data_from_page(page, "ytInitialPlayerResponse");

        if (!player.streamingData || player.streamingData == []) { // If streamingData is not gived directly; request to endpoint to get data
                                                                    // If video is about self-harm topics, YouTube will not give the data easily
            player = await utils.get_json(`https://www.youtube.com/youtubei/v1/player?key=AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8&prettyPrint=false`, {
                method: "POST",
                body: `{"context":{"client":{"hl":"en","gl":"US","clientName":"WEB","clientVersion":"${utils.__client_version}","originalUrl":"https://www.youtube.com/watch?v=${video_id}&pp=QAA%3D&rco=1","configInfo":{},"timeZone":"UTC","utcOffsetMinutes":0,"memoryTotalKbytes":"4000000","clientScreen":"WATCH","mainAppWebInfo":{"graftUrl":"/watch?v=${video_id}&pp=QAA%3D&rco=1"}}},"videoId":"${video_id}","params":"QAA%3D","playbackContext":{"contentPlaybackContext":{"currentUrl":"/watch?v=${video_id}&pp=QAA%3D&rco=1","signatureTimestamp":"${signature_timestamp}","referer":"https://www.youtube.com/watch?v=${video_id}&rco=1","lactMilliseconds":"-1"}},"racyCheckOk":true,"contentCheckOk":true}`
            }, {
                "Authority": "www.youtube.com",
                "Accept": "*/*",
                "Accept-Language": "en-US,en;q=0.5",
                "Cache-Control": "no-cache",
                "Content-Type": "text/plain;charset=UTF-8",
                "Origin": "https://www.youtube.com",
                "Pragma": "no-cache"
            });
        };

        let data = utils.extract_json_data_from_page(page, "ytInitialData");

        let is_family_safe = player?.microformat?.playerMicroformatRenderer?.isFamilySafe ?? true;
        let title = player?.microformat?.playerMicroformatRenderer?.title?.simpleText ?? "";
        let thumbnails = player?.videoDetails?.thumbnail?.thumbnails ?? [];
        if(player?.playabilityStatus?.desktopLegacyAgeGateReason){ // Age-Restricted Videos
            is_family_safe = false;
        };
        let player_for_streaming_data = player;
        if(true /* Until find a way to bypass poToken */ || player?.playabilityStatus?.desktopLegacyAgeGateReason){ // If age-gated
                if(is_family_safe){
                    console.warn("poToken detected ~ Client will be changed");
                } else {
                    console.warn("Not family safe video ~ Client will be changed");
                }
                player_for_streaming_data = await video.__get_video_info_without_age_restriction(video_id);
        };

        return ({
            audioStreams: player_for_streaming_data?.streamingData?.adaptiveFormats?.filter(a=>a.mimeType.includes("audio")) ?? [],
            videoStreams: player_for_streaming_data?.streamingData?.adaptiveFormats?.filter(a=>a.mimeType.includes("video")) ?? [],
            relatedStreams: player_for_streaming_data?.streamingData?.formats ?? [],
            dash: player?.streamingData?.dashManifestUrl ?? null,
            description: data?.contents?.twoColumnWatchNextResults?.results?.results?.contents?.[1]?.videoSecondaryInfoRenderer?.attributedDescription?.content ?? "",
            length: Number(player?.microformat?.playerMicroformatRenderer?.lengthSeconds ?? 0),
            hls: player?.streamingData?.hlsManifestUrl ?? null,
            likes: Number(data.contents?.twoColumnWatchNextResults?.results?.results?.contents?.[0]?.videoPrimaryInfoRenderer?.videoActions?.menuRenderer?.topLevelButtons?.[0]?.segmentedLikeDislikeButtonViewModel?.likeButtonViewModel?.likeButtonViewModel?.toggleButtonViewModel?.toggleButtonViewModel?.defaultButtonViewModel?.buttonViewModel?.accessibilityText?.replace(/[\.\,]/g,"")?.match(/[0-9]+/g)?.[0] ?? 0),
            isFamilySafe: is_family_safe,
            isUnlisted: player?.microformat?.playerMicroformatRenderer?.isUnlisted ?? false,
            isPrivate: player?.videoDetails?.isPrivate ?? false,
            keywords: player?.videoDetails?.keywords ?? [],
            captions: player?.captions?.playerCaptionsTracklistRenderer?.captionTracks ?? [],
            thumbnails: thumbnails,
            watermarks: player?.annotations?.[0]?.playerAnnotationsExpandedRenderer?.featuredChannel?.watermark?.thumbnails ?? [],
            title: title,
            views: Number(player?.microformat?.playerMicroformatRenderer?.viewCount ?? 0),
            category: player?.microformat?.playerMicroformatRenderer?.category ?? null,
            owner: {
                name: player?.videoDetails?.author ?? "",
                thumbnails: data?.contents?.twoColumnWatchNextResults?.results?.results?.contents?.[1]?.videoSecondaryInfoRenderer?.owner?.videoOwnerRenderer?.thumbnail?.thumbnails || [],
                verified: (data?.contents?.twoColumnWatchNextResults?.results?.results?.contents?.[1]?.videoSecondaryInfoRenderer?.owner?.videoOwnerRenderer?.badges?.filter(a=>a.metadataBadgeRenderer?.style?.includes("VERIFIED")).length ?? 0) > 0,
                id: player?.microformat?.playerMicroformatRenderer?.externalChannelId ?? null,
                profile: player?.microformat?.playerMicroformatRenderer?.ownerProfileUrl ?? null,
                followers: data?.contents?.twoColumnWatchNextResults?.results?.results?.contents?.[1]?.videoSecondaryInfoRenderer.owner?.videoOwnerRenderer?.subscriberCountText?.simpleText?.match(/[0-9a-zA-Z\.]+/g)?.[0]?.replace("K"," 1000")?.replace("M", " 1000000")?.split(" ")?.reduce((total, current) => {return total*Number(current)},1) ?? 0
            },
            playability: {
                isLiveNow: player?.microformat?.playerMicroformatRenderer?.liveBroadcastDetails?.isLiveNow ?? false,
                isLive: player?.playabilityStatus?.status?.includes("LIVE_STREAM") ?? false, // may be planned stream
                streamTime: new Date(Number(player?.playabilityStatus?.liveStreamability?.liveStreamabilityRenderer?.offlineSlate?.liveStreamOfflineSlateRenderer?.scheduledStartTime ?? 0)*1000)
            },
            cards: data?.cards?.cardCollectionRenderer?.cards ?? null,
            nextVideos: data?.contents?.twoColumnWatchNextResults?.secondaryResults?.secondaryResults?.results?.filter(a=>a?.compactVideoRenderer!=undefined).map(a=>a?.compactVideoRenderer).map(video => ({
                id: video.videoId,
                title: video.title.simpleText,
                thumbnails: video.thumbnail.thumbnails,
                views: Number(video.title.accessibility.accessibilityData.label.match(/[0-9\.\,\ ]+view/g)[0].replace(/[A-Za-z\ \.\,]+/g, "")),
                length: utils.extract_time_from_text(video?.lengthText?.simpleText) ?? null,
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
            body: `{"context":{"client":{"clientName":"WEB","clientVersion":"${utils.__client_version}","platform":"DESKTOP"},"user":{},"request":{"useSsl":true}},"continuation":"${commentsToken}"}`
        });

        let mutations = response?.frameworkUpdates?.entityBatchUpdate?.mutations ?? null;

        return ({
            disabled: false, // TODO: Support that
            comments: mutations?.filter(a=>a?.payload?.commentEntityPayload)?.map(comment => ({
                id: comment?.payload?.commentEntityPayload?.properties?.commentId ?? null,
                text: comment?.payload?.commentEntityPayload?.properties?.content?.content ?? "",
                time: comment?.payload?.commentEntityPayload?.properties?.publishedTime?.replace(" (edited)","") ?? "", // it need to be converted into time
                isEdited: comment?.payload?.commentEntityPayload?.properties?.publishedTime?.includes("(edited)") ?? false,
                replies: {
                    count: Number(comment?.payload?.commentEntityPayload?.toolbar?.replyCount) ?? 0,
                    nextPage: null // TODO: Find reply page
                },
                likeCount: Number(comment?.payload?.commentEntityPayload?.toolbar?.likeCountNotliked) ?? 0,
                owner: {
                    name: comment?.payload?.commentEntityPayload?.author?.displayName ?? "", // yt is not providing real name (even you can see the issue in yt's comment section)
                    isVideoOwner: comment?.payload?.commentEntityPayload?.author?.isCreator ?? false,
                    thumbnails: comment?.payload?.commentEntityPayload?.avatar?.image?.sources ?? [],
                    id: comment?.payload?.commentEntityPayload?.author?.channelId ?? null,
                    isVerified: comment?.payload?.commentEntityPayload?.author?.isVerified ?? false
                }
            })),
            nextpage: response?.onResponseReceivedEndpoints?.filter(a=>a?.reloadContinuationItemsCommand?.slot == "RELOAD_CONTINUATION_SLOT_BODY")?.[0]?.reloadContinuationItemsCommand?.continuationItems?.filter(a=>a.continuationItemRenderer!=undefined)?.[0]?.continuationItemRenderer?.continuationEndpoint?.continuationCommand?.token ?? null
        });
    }
};

module.exports = video;
