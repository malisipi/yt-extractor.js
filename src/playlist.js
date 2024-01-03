const utils = require("./utils");

var playlist = {
    get_playlist: async (playlist_id) => {
        let page = await utils.get_text(`https://youtube.com/playlist?list=${playlist_id}`);
        let data = utils.extract_json_data_from_page(page, "ytInitialData");
        let playlist = data.contents.twoColumnBrowseResultsRenderer.tabs[0].tabRenderer.content.sectionListRenderer.contents[0].itemSectionRenderer.contents[0].playlistVideoListRenderer.contents.map(a=>a.playlistVideoRenderer).filter(a=>a!=undefined);

        return playlist.map(video => ({
            id: video.videoId,
            title: video.title.runs[0].text,
            thumbnails: video.thumbnail.thumbnails,
            views: Number(video.title.accessibility.accessibilityData.label.match(/[0-9\.\,\ ]+view/g)[0].replace(/[A-Za-z\ \.\,]+/g, "")),
            length: Number(video.lengthSeconds),
            owner: {
                name: video.shortBylineText.runs[0].text,
                id: video.shortBylineText.runs[0].navigationEndpoint.commandMetadata.webCommandMetadata.url.replace("/channel/","")
            },
        }))
    }
};

module.exports = playlist;
