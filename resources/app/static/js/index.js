let index = {
    emptyNode: function(n) {
        while(n.firstChild) {
            n.removeChild(n.firstChild)
        }
    },
    init: function() {
        asticode.loader.init()
        asticode.modaler.init()
        asticode.notifier.init()

        document.addEventListener('astilectron-ready', function() {
            index.listen()
            //asticode.notifier.info("sending init message")
            astilectron.sendMessage({"name": "init", "payload": ""}, function(message){
                if (message.name === "error") {
                    asticode.notifier.error(message.payload)
                }
                //asticode.notifier.info("backend init returned")
                data.init(index.toSelect)
            })
        })
    },
    listen: function() {
        astilectron.onMessage(function(message) {
            switch (message.name) {
                case "about":
                    //index.about(message.payload);
                    return {payload: "payload"};
                    break;
                case "check.out.menu":
                    asticode.notifier.info(message.payload);
                    break;
                case "search.result":
                    //alert(message.payload)
                    if (data.view === "search" && data.currentSearch === message.payload.Search) {
                        data.addSearchResult(message.payload.Result)
                    }
                    break;
                case "alert":
                    alert(message.payload)
                    break;
                case "notify.error":
                    asticode.notifier.error(message.payload);
                    break;
                case "notify.success":
                    asticode.notifier.success(message.payload);
                    break;
                case "file.added":
                    asticode.notifier.success("Added " +  message.payload);
                    //data.appendFile(message.payload);
                    break;
                case "search.complete":
                    //alert("search complete of " + message.payload)
                    if (data.currentSearch === message.payload){
                        asticode.loader.hide()
                    }
                    break;
                case "refresh.manifest":
                    data.setManifest(data.manifest.name)
                    break;
            }
        });
    },
    changeBackColor: function(ncolor) {
        document.getElementById("header").style.backgroundColor = ncolor;
        document.getElementById("footer").style.backgroundColor = ncolor;
    },
    toSelect: function(){
        data.currentDisplay.style.display = "none"
        data.currentDisplay = document.getElementById("display_select")
        data.currentDisplay.style.display = "block"
        document.getElementById("footer").style.display = "block"
        data.view = "select";
        index.changeBackColor("rgb(220, 252, 255)")
        // document.getElementById("left_header").innerHTML = "Change Manifest"

        // document.getElementById("data_inputs").style.display = "block"
        // document.getElementById("text_input").placeholder = "New Manifest Name"
        // document.getElementById("text_input").value = ""
        // document.getElementById("click_input").innerHTML = "Create Manifest"

        document.getElementById("gotoselect").disabled = true
        document.getElementById("gotomanifest").disabled = false
        //document.getElementById("gotosearch").disabled = false
    },
    updateManifestList: function(){
        astilectron.sendMessage({"name": "get.listman", "payload": ""}, function(message){
            if (message.name === "error") {
                asticode.notifier.error(message.payload)
                return
            }
            let ulist = document.getElementById("manifest_selection_list")
            index.emptyNode(ulist)
            for (let manname of message.payload) {
                let item = document.createElement("li")
                item.innerHTML = manname
                item.addEventListener("click", function(){
                    data.setManifest(manname)
                    index.toAddFile()
                })
                ulist.appendChild(item)
            }
            //asticode.notifier.info("manifest list updated")
        })
    },
    updateManifest: function(){
        document.getElementById("manifest_name_top").innerHTML = data.manifest.name
        document.getElementById("manifest_name_bottom").innerHTML = data.manifest.name
        let deleteb = document.getElementById("delete_manifest_b")
        if (data.manifest.name === "All Searchable Files" || data.manifest.content.length > 0) {
            deleteb.style.display = "none"
        } else {
            deleteb.style.display = "block"
        }
        let ulist = document.getElementById("manifest_contents")
        index.emptyNode(ulist)
        for (let fname of data.manifest.content) {
            let item = document.createElement("li")
            let n = document.createElement("span")
            n.innerHTML = fname
            n.addEventListener("click", index.tofileinfo.bind(true, fname, 0))
            item.appendChild(n)
            let r = document.createElement("span")
            r.innerHTML = "[X]"
            r.style.color = "red"
            r.addEventListener("click", data.removeFile.bind(true, fname))
            item.appendChild(r)
            ulist.appendChild(item)
        }
        //asticode.notifier.info("manifest updated")
    },
    deleteman: function(){
        data.deleteManifest(data.manifest.name);
    },
    toAddFile: function() {
        data.currentDisplay.style.display = "none"
        data.currentDisplay = document.getElementById("display_addfile")
        data.currentDisplay.style.display = "block"
        document.getElementById("footer").style.display = "block"
        data.view = "addfile"
        
        //document.getElementById("left_header").innerHTML = "Add Files"

        index.changeBackColor("rgb(255, 243, 225)")

        //document.getElementById("data_inputs").style.display = "none"
        //document.getElementById("text_input").value = ""

        document.getElementById("gotoselect").disabled = false
        document.getElementById("gotomanifest").disabled = true
        //document.getElementById("gotosearch").disabled = false
    },
    writeCWD: function(){
        document.getElementById("cwd").innerHTML = data.cwd.name
        document.getElementById("cwd2").innerHTML = data.cwd.name
        {
            let up = document.createElement("li")
            up.innerHTML = ".."
            up.addEventListener("click", data.setCWD.bind(true, true, ""))
            let up2 = document.createElement("li")
            up2.innerHTML = ".."
            up2.addEventListener("click", data.setCWD.bind(true, true, ""))
            let ulist = document.getElementById("addfile_navigation")
            let ulist2 = document.getElementById("docsheet_navigation")
            index.emptyNode(ulist)
            index.emptyNode(ulist2)
            ulist.appendChild(up)
            ulist2.appendChild(up2)
            for (let folder of data.cwd.sub) {
                let item = document.createElement("li")
                let item2 = document.createElement("li")
                item.innerHTML = folder
                item2.innerHTML = folder
                item.addEventListener("click", data.setCWD.bind(true, false, folder))
                item2.addEventListener("click", data.setCWD.bind(true, false, folder))
                ulist.appendChild(item)
                ulist2.appendChild(item2)
            }
        }
        {
            let ulist = document.getElementById("addfile_selection")
            index.emptyNode(ulist)
            for(let file of data.cwd.txt) {
                let item = document.createElement("li")
                item.innerHTML = file
                item.addEventListener("click", data.addFile.bind(true, file))
                ulist.appendChild(item)
            }
        }
        //asticode.notifier.info("CWD info updated")
    },
    toSearch: function() {
        data.currentDisplay.style.display = "none"
        data.currentDisplay = document.getElementById("display_search")
        data.currentDisplay.style.display = "block"
        document.getElementById("footer").style.display = "none"
        data.view = "search"
        
        //document.getElementById("left_header").innerHTML = "Search Manifest"

        index.changeBackColor("rgb(229, 245, 216)")

        // document.getElementById("data_inputs").style.display = "block"
        // document.getElementById("text_input").placeholder = "Enter Search Terms"
        // document.getElementById("text_input").value = ""
        // document.getElementById("click_input").innerHTML = "Search"

        document.getElementById("gotoselect").disabled = false
        document.getElementById("gotomanifest").disabled = false
        //document.getElementById("gotosearch").disabled = true

        //index.emptyNode(data.currentDisplay)
    },
    addSearchResult: function(result) {
        asticode.loader.hide()
        //asticode.notifier.info("result found")
        let resultblock = document.createElement("div")
        let filename = document.createElement("h4")
        filename.innerHTML = result.Document
        resultblock.appendChild(filename)
        let indexstring = document.createElement("h5")
        indexstring.innerHTML = "Paragraph: " + result.Paragraph + " Sentence: " + result.Sentence
        resultblock.appendChild(indexstring)
        let content = document.createElement("p")
        for (i = 0; i < result.Words.length; i++) {
            if (i > 0) {
                let space = document.createElement("span")
                space.innerHTML = " "
                content.appendChild(space)
            }
            let sp = document.createElement("span")
            sp.innerHTML = result.Words[i]
            if (result.Matches.includes(i)) {
                sp.className = "highlight"
            }
            content.appendChild(sp)
        }
        // content.innerHTML = data.Words.join(" ")
        resultblock.appendChild(content)
        document.getElementById("display_search").appendChild(resultblock)
    },
    goSearch: function(eve){
        eve.preventDefault()
        index.toSearch()
        let entry = document.getElementById("textbox").value
        if (entry.length > 0) {
            document.getElementById("currentFile").innerHTML = "Select a File"
            data.searchManifest(entry)
        } else {
            data.clearSearchResult()
            document.getElementById("currentFile").innerHTML = "Enter terms above to begin your search"
            // index.emptyNode(document.getElementById("display_search"))
            // message = document.createElement("h3")
            // message.innerHTML = "Enter terms above to begin your search"
            // document.getElementById("display_search").appendChild(message)
        }
    },
    createManifest: function(eve){
        eve.preventDefault()
        let entry = document.getElementById("new_manifest_name").value
        if (entry.length > 0) {
            data.createManifest(entry)
        }
        document.getElementById("new_manifest_name").value = ""
    },
    toDocsheet: function(file) {
        data.currentDisplay.style.display = "none"
        data.currentDisplay = document.getElementById("display_docsheet")
        data.currentDisplay.style.display = "block"
        document.getElementById("footer").style.display = "block"
        data.view = "docsheet"
        data.selectedFile = file
        
        // document.getElementById("left_header").innerHTML = "Export Docsheet"

        document.getElementById("selectedFile").innerHTML = file

        index.changeBackColor("rgb(255, 235, 252)")

        // document.getElementById("data_inputs").style.display = "none"
        // document.getElementById("text_input").value = ""

        document.getElementById("gotoselect").disabled = false
        document.getElementById("gotomanifest").disabled = false
        //document.getElementById("gotosearch").disabled = false

        document.getElementById("docsheet_name").value = ""
    },
    refreshSearch: function(updatemenu) {
        if (updatemenu) {
            let menu = document.getElementById("matchedFiles")
            index.emptyNode(menu)
            for (let k in data.searchResult) { if (data.searchResult.hasOwnProperty(k)) {
                let item = document.createElement("li")
                item.innerHTML = data.searchResult[k].name
                item.addEventListener("click", data.setSearchDisplay.bind(true, k, 0, data.defaultsize))
                menu.appendChild(item)
            }}
        }
        index.emptyNode(document.getElementById("resultdisplay"))
        if (data.searchDisplay.file.length > 0) {
            document.getElementById("currentFile").innerHTML = data.searchDisplay.file
            document.getElementById("firstindex").innerHTML = data.searchDisplay.first + 1
            document.getElementById("prevResults").disabled = data.searchDisplay.first == 0
            if (data.searchDisplay.last >= data.searchResult[data.searchDisplay.file].matches.length) {
                document.getElementById("lastindex").innerHTML = data.searchResult[data.searchDisplay.file].matches.length
                document.getElementById("nextResults").disabled = true
            } else {
                document.getElementById("lastindex").innerHTML = data.searchDisplay.last
                document.getElementById("nextResults").disabled = false
            }
            document.getElementById("fullresultcount").innerHTML = data.searchResult[data.searchDisplay.file].matches.length
            for(let i = data.searchDisplay.first; i < data.searchDisplay.last && i < data.searchResult[data.searchDisplay.file].matches.length; i++){
                index.appendSearchResult(data.searchDisplay.file, data.searchResult[data.searchDisplay.file].matches[i])
            }
        } else {
            document.getElementById("currentFile").innerHTML = "Select a File"
            document.getElementById("firstindex").innerHTML = 0
            document.getElementById("lastindex").innerHTML = 0
            document.getElementById("fullresultcount").innerHTML = 0
            document.getElementById("prevResults").disabled = true
            document.getElementById("nextResults").disabled = true
        }
    },
    appendSearchResult: function(fname, result) {
        let block = document.createElement("div")
        let indexstring = document.createElement("h5")
        indexstring.innerHTML = "Paragraph: " + result.paragraph + " Sentence: " + result.sentence
        let base = result.sentence - (result.sentence % 10)
        indexstring.addEventListener("click", index.tofileinfo.bind(true, fname, base))
        indexstring.className = "toRead"
        block.appendChild(indexstring)
        let content = document.createElement("p")
        for (i = 0; i < result.words.length; i++) {
            if (i > 0) {
                let space = document.createElement("span")
                space.innerHTML = " "
                content.appendChild(space)
            }
            let sp = document.createElement("span")
            sp.innerHTML = result.words[i]
            if (result.matches.includes(i)) {
                sp.className = "highlight"
            }
            content.appendChild(sp)
        }
        block.appendChild(content)
        document.getElementById("resultdisplay").appendChild(block)
    },
    searchPrev: function() {
        data.setSearchDisplay(data.searchDisplay.file, 
            data.searchDisplay.first - data.defaultsize, 
            data.searchDisplay.last - data.defaultsize)
    },
    searchNext: function() {
        data.setSearchDisplay(data.searchDisplay.file, 
            data.searchDisplay.first + data.defaultsize, 
            data.searchDisplay.last + data.defaultsize)
    },
    tofileinfo: function(file, start) {
        let end = start + 10
        data.currentDisplay.style.display = "none"
        data.currentDisplay = document.getElementById("display_fileinfo")
        data.currentDisplay.style.display = "block"
        document.getElementById("footer").style.display = "block"
        data.view = "fileinfo"
        data.updateFileinfo(file, start)
        
        // document.getElementById("left_header").innerHTML = "Export Docsheet"

        index.changeBackColor("rgb(179, 179, 255)")

        // document.getElementById("data_inputs").style.display = "none"
        // document.getElementById("text_input").value = ""

        document.getElementById("gotoselect").disabled = false
        document.getElementById("gotomanifest").disabled = false
        //document.getElementById("gotosearch").disabled = false
    },
    updateFileinfo: function() {
        document.getElementById("fileinfo_name").innerHTML = data.fileinfo.focus
        document.getElementById("fileinfo_start").innerHTML = data.fileinfo.start + 1
        document.getElementById("fileinfo_prev").disabled = data.fileinfo.start <= 0
        document.getElementById("fileinfo_end").innerHTML = data.fileinfo.end
        document.getElementById("fileinfo_next").disabled = data.fileinfo.end >= data.fileinfo.total
        document.getElementById("fileinfo_total").innerHTML = data.fileinfo.total
        document.getElementById("fileinfo_content").innerHTML = data.fileinfo.content
    },
    exportDocSheetButton: function() {
        index.toDocsheet(data.fileinfo.focus)
    },
    fileinfoprev: function() {
        data.updateFileinfo(data.fileinfo.focus, data.fileinfo.start - 10)
    },
    fileinfonext: function() {
        data.updateFileinfo(data.fileinfo.focus, data.fileinfo.start + 10)
    }
}