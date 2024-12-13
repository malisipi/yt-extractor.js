const utils = require("./utils");
const { exec, execSync } = require('child_process');
const fs = require("fs");

var video = {
    is_extracted: true,
    get_ready: async () => {
        if(navigator.userAgentData.platform == "Windows"){
            try {
                await fs.stat("yt-dlp.exe");
                console.warn("Updating yt-dlp.exe");
                exec("yt-dlp.exe -U");
            } catch(e) {
                console.warn("Downloading yt-dlp.exe");
                exec("curl -LO https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe");
            };
        };
    },
    get_streams: (video_id) => {
        let stdout = execSync(`yt-dlp --dump-json "https://www.youtube.com/watch?v=${video_id.replace(/[\$\\\`\#\?\&]/g,'')}"`);
        return JSON.parse(String(stdout));
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

        let streams = video.get_streams(video_id);

        return ({
            audioStreams: streams.formats.filter(a=>a.acodec != "none" && a.vcodec == "none" && !a.url.endsWith(".m3u8")).map(a=>({
                url:a.url,
                audioTrack:(a.format_note.includes(","))?({displayName:a.format_note.split(",")[0]}):null,
                bitrate: a.abr*1000, mimeType:a.acodec
            })),
            videoStreams: streams.formats.filter(a=>a.vcodec != "none" && a.acodec == "none" && !a.url.endsWith(".m3u8")).map(a=>({url:a.url, mimeType:a.ext, qualityLabel:a.format_note})),
            relatedStreams: streams.formats.filter(a=>a.acodec != "none" && a.vcodec != "none" && !a.url.endsWith(".m3u8")),
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
