var utils = {
    get_text: async page => {
        return await (await fetch(page)).text();
    }, 
    extract_json_data_from_page: (page, script_variable) => {
        data = page.split(/\<[\/]*script[^\>]*\>/g).filter(a=>a.startsWith(`var ${script_variable}`))[0];
        data = data.replace(RegExp(`var[\\ ]*${script_variable}[\\ ]*\=[\\ ]*`),"").replace("\\\\\"","\\\"").replaceAll(";","");
        data = JSON.parse(data);
        return data;
    }
};

module.exports = utils;