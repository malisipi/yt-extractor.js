const utils = require("./utils");
const xml_parser = require("fast-xml-parser");
const parser = new xml_parser.XMLParser({
    ignoreAttributes : false
})

var owner = {
    get_owner: async channel_id => {
        let page = await utils.get_text(`https://www.youtube.com/channel/${encodeURIComponent(channel_id)}`);
        return utils.extract_json_data_from_page(page, "ytInitialData");
    },
    get_owner_videos: async channel_id => {
        let rss = await (await fetch(`https://www.youtube.com/feeds/videos.xml?channel_id=${encodeURIComponent(channel_id)}`)).text()
        let feed = parser.parse(rss).feed;

        return ({
            "owner": {
                name: feed.author.name,
                id: feed.author.uri.split("/").at(-1)
            },
            "entry": feed.entry.map(video => ({
                id: video["yt:videoId"],
                owner: {
                    name: feed.author.name,
                    id: video["yt:channelId"]
                },
                title: video.title,
                thumbnail: {
                    url: video["media:group"]["media:thumbnail"]["@_url"],
                    width: Number(video["media:group"]["media:thumbnail"]["@_width"]),
                    height: Number(video["media:group"]["media:thumbnail"]["@_height"])
                },
                description: video["media:group"]["media:description"],
                views: Number(video["media:group"]["media:community"]["media:statistics"]["@_views"]),
                updated: video.updated,
                published: video.published,
            }))
        });
    }
};

module.exports = owner;
