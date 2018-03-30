let data = {
    init: function(callb) {
        //alert("data init begin")
        //asticode.notifier.info("data init begin")
        data.setManifest("All Searchable Files")
        data.updateCWD()
        index.updateManifestList()   
        data.currentDisplay = document.getElementById("display_select")     
        callb();
        //asticode.notifier.info("data init end")
    },
    manifest: {
        name: "All Searchable Files",
        content: []
    },
    createManifest: function(nname) {
        //asticode.notifier.error("TODO: implement data.createManifest")
        asticode.loader.show()
        astilectron.sendMessage({"name": "create.manifest", "payload": nname}, function(responce){
           asticode.loader.hide()
            if (responce.name === "error") {
                asticode.notifier.error(responce.payload)
                return
            }
            data.setManifest(responce.payload)
            index.updateManifestList()
            index.toAddFile()
        })
    },
    setManifest: function(mname) {
        asticode.loader.show()
        astilectron.sendMessage({"name": "get.manifest", "payload": mname}, function(message){
            asticode.loader.hide()
            if (message.name === "error") {
                asticode.notifier.error(message.payload)
                return
            }
            data.manifest.name = mname
            data.manifest.content = message.payload
            index.updateManifest()
        })
    },
    appendFile: function(file) {
        data.manifest.content.push(file)
        index.updateManifest()
    },
    addFile: function(file) {
        asticode.loader.show()
        astilectron.sendMessage({"name": "add.file", "payload":{"Manifest":data.manifest.name, "Filename": file}}, function(responce){
            //asticode.loader.hide()
            if (responce.name === "error") {
                asticode.notifier.error(responce.payload);
                return
            }
            //data.setManifest(data.manifest.name)
        });
    },
    removeFile: function(file) {
        asticode.loader.show()
        astilectron.sendMessage(
            {
                "name": "remove.file", 
                "payload":{
                    "Manifest": data.manifest.name,
                    "File": file
                }
            },
            function(message){
                asticode.loader.hide()
                //asticode.notifier.info("remove returned");
                if (message.name === "error") {
                    asticode.notifier.error(message.payload);
                    return
                }
                //asticode.notifier.info("not an error");
                data.setManifest(data.manifest.name);
                //asticode.notifier.info("reset manifest");
            }
        )
    },
    deleteManifest: function(mname) {
        asticode.loader.show()
        astilectron.sendMessage(
            {
                "name": "remove.manifest",
                "payload": mname
            },
            function(message) {
                asticode.loader.hide()
                if (message.name === "error") {
                    asticode.notifier.error(message.payload);
                    return
                }
                data.setManifest("All Searchable Files")
                index.updateManifestList()
                index.toSelect()
            }
        )
    },
    clearManifest: function(mname) {
        asticode.loader.show()
        astilectron.sendMessage(
            {
                "name": "remove.all",
                "payload": mname
            },
            function(message) {
                asticode.loader.hide()
                if (message.name === "error") {
                    asticode.notifier.error(message.payload);
                    return
                }
                data.setManifest(mname)
                index.toAddFile()
            }
        )
    },
    addAllFiles: function() {
        asticode.loader.show()
        astilectron.sendMessage({"name": "add.all", 
            "payload":{
                "Manifest": data.manifest.name,
                "Directory": data.cwd.path}
            }, 
            function(message){
                //asticode.loader.hide()
                if (message.name === "error") {
                    asticode.notifier.error(message.payload);
                    return
                }
                document.getElementById("delete_manifest_b").style.display = "none"
                //data.setManifest(data.manifest.name)
            }
        )
    },
    searchManifest(searchterms) {
        //asticode.notifier.error("TODO: implement data.searchManifest")
        data.currentSearch = searchterms
        //index.emptyNode(document.getElementById("display_search"))
        data.clearSearchResult()
        asticode.loader.show()   
        // update Query element
        astilectron.sendMessage({
            "name":"search", 
            "payload": {
                "Manifest": data.manifest.name, 
                "Type": "simple", 
                "Data": data.currentSearch
            }
        }, 
        function(responce){
            if (responce.name === "error") {
                asticode.loader.hide()
                asticode.notifier.error(responce.payload)
                return
            }
        })
    },
    view: "select",
    cwd: {
        path: "",
        name: "",
        sub: [],
        txt: []
    },
    setCWD: function(up, down) {
        astilectron.sendMessage({"name": "set.cwd", "payload": {"Up": up, "Down": down}}, function(message){
            if (message.name === "error") {
                asticode.notifier.error(message.payload)
                return
            }
            data.updateCWD()
        })
    },
    updateCWD: function() {
        astilectron.sendMessage({"name":"get.cwd", "payload": ""}, function(message){
            if (message.name === "error") {
                asticode.notifier.error(message.payload)
                return
            }
            data.cwd.path = message.payload.Path
            data.cwd.name = message.payload.Name
            astilectron.sendMessage({"name": "get.listdir", "payload": data.cwd.path}, function(message){
                if (message.name === "error") {
                    asticode.notifier.error(message.payload)
                    return
                }
                data.cwd.sub = message.payload.Dir
                data.cwd.txt = message.payload.Txt
                index.writeCWD()
            })
        })
    },
    currentDisplay: null,
    selectedFile: "",
    createDocSheet: function(eve) {
        eve.preventDefault()
        asticode.loader.show()
        let fname = document.getElementById("docsheet_name").value + ".csv"
        astilectron.sendMessage({"name": "make.docsheet", "payload": {"Original": data.selectedFile, "Saveto": fname}}, function(message){
            asticode.loader.hide()
            if (message.name === "error") {
                asticode.notifier.error(message.payload)
                return
            }
            asticode.notifier.info("exported to " + fname)
            index.toAddFile()
        })
    },
    currentSearch: "",
    searchResult: {},
    defaultsize: 10,
    searchDisplay: {
        file: "",
        first: 0,
        last: 10
    },
    clearSearchResult: function(){
        data.searchResult = {}
        data.searchDisplay = {
            file: "",
            first: 0,
            last: data.defaultsize
        }
        index.refreshSearch(true)
    },
    addSearchResult: function(result) {
        asticode.loader.hide()
        let menu = false
        if (!(result.Document in data.searchResult)) {
            if (result.Matches.length > 0) {
                data.searchResult[result.Document] = {
                    name: result.Name,
                    matches : [{
                        words: result.Words.map(function(wrd){
                            return wrd.replace(/[^ -~]+/g, "&#39;")
                        }),
                        paragraph: result.Paragraph,
                        sentence: result.Sentence,
                        matches: result.Matches
                    }]
                }
                menu = true
            }
        } else {
            data.searchResult[result.Document].matches.push({
                words: result.Words.map(function(wrd){
                    return wrd.replace(/[^ -~]+/g, "&#39;")
                }),
                paragraph: result.Paragraph,
                sentence: result.Sentence,
                matches: result.Matches
            })
        }
        index.refreshSearch(menu)
    },
    setSearchDisplay: function(file, first, last) {
        data.searchDisplay.file = file
        if (first < 0) {
            data.searchDisplay.first = 0
        }else {
            data.searchDisplay.first = first
        }
        data.searchDisplay.last = last
        index.refreshSearch(false)
    },
    fileinfo: {
        focus: "",
        start: 0,
        end: 0,
        total: 0,
        content: ""
    },
    updateFileinfo: function(file, start) {
        data.fileinfo.focus = file
        asticode.loader.show()
        astilectron.sendMessage({
            "name":"get.file.content", 
            "payload": {
                "File": file,
                "Start": start,
                "End": start + 10
            }}, 
            function(responce){
                asticode.loader.hide()
                if (responce.name === "error") {
                    asticode.notifier.error(responce.payload);
                    return
                }
                data.fileinfo.start = responce.payload.Start
                if (data.fileinfo.start < 0) {
                    data.fileinfo.start = 0
                }
                data.fileinfo.end = responce.payload.End
                data.fileinfo.total = responce.payload.Total
                if (data.fileinfo.end > data.fileinfo.total) {
                    data.fileinfo.end = data.fileinfo.total
                }
                data.fileinfo.content = responce.payload.Content.replace(/[^ -~]+/g, "&#39;")
                index.updateFileinfo()
            })
    }
}