var utils = {
    extract_json_data_from_page: async (page, script_variable) => {
        let watch_page = await (await fetch(page)).text();
        data = watch_page.split(/\<[\/]*script[^\>]*\>/g).filter(a=>a.startsWith(`var ${script_variable}`))[0];
        data = data.replace(RegExp(`var[\\ ]*${script_variable}[\\ ]*\=[\\ ]*`),"").replace("\\\\\"","\\\"").replaceAll(";","");
        data = JSON.parse(data);
        return data;
    }
};

module.exports = utils;