let __client_version = "2.20241025.01.00";
var utils = {
    __client_version: __client_version,
    __default_headers: {
        "Accept": "*/*",
        "Cache-Control": "no-cache",
        "Accept-Language": "en-US,en;q=0.5",
        "Content-Type": "application/json",
        "Pragma": "no-cache",
        "X-Goog-Authuser": "0",
        "X-Origin": "https://www.youtube.com",
        "X-Youtube-Bootstrap-Logged-In": "false",
        "X-Youtube-Client-Name": "1",
        "X-Youtube-Client-Version": __client_version,
    },
    get_text: async (page, fetch_params = {}, headers=utils.__default_headers) => {
        fetch_params.headers = headers;
        return await (await fetch(page, fetch_params)).text();
    },
    get_json: async (page, fetch_params = {}) => {
        return JSON.parse(await utils.get_text(page, fetch_params));
    },
    extract_time_from_text: (time) => {
        return time?.split(":")?.toReversed()?.reduce((total,next,index)=>{return total+next*[1,60,60*60][index]},0);
    },
    extract_json_data_from_page: (page, script_variable) => {
        let data = page.split(/\<[\/]*script[^\>]*\>/g).filter(a=>a.startsWith(`var ${script_variable}`))[0];
        data = data.replace(RegExp(`var[\\ ]*${script_variable}[\\ ]*\=[\\ ]*`),"").replaceAll(";","");
        data = data.match(/\{.+\}/)[0];
        data = JSON.parse(data);
        return data;
    }
};

module.exports = utils;
