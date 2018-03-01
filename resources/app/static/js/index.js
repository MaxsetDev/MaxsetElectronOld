let index = {
    manifest: "All Searchable Files",
    view: "select",
    currentSearch: "",
    init: function() {
        // Init
        asticode.loader.init();
        asticode.modaler.init();
        asticode.notifier.init();

        document.addEventListener('astilectron-ready', function() {
            // Listen
            index.listen();
            astilectron.sendMessage({"name": "init", "payload": ""}, function(message){
                if (message.name === "error") {
                    asticode.notifier.error(responce.payload);
                    return
                }
                index.toSelect();
            });            
        });
    },
    emptyNode: function(n){
        while(n.firstChild) {
            n.removeChild(n.firstChild)
        }
    },
    listen: function() {
        astilectron.onMessage(function(message) {
            switch (message.name) {
                case "about":
                    index.about(message.payload);
                    return {payload: "payload"};
                    break;
                case "check.out.menu":
                    asticode.notifier.info(message.payload);
                    break;
                case "search.result":
                    //alert(message.payload)
                    if (index.view === "search" && index.currentSearch === message.payload.Search) {
                        index.addSearchResult(message.payload.Result)
                    }
                    break;
                case "alert":
                    alert(message.payload)
                    break;
                case "search.complete":
                    //alert("search complete of " + message.payload)
                    if (index.currentSearch === message.payload){
                        asticode.loader.hide()
                    }
                    break;
            }
        });
    },
    submitAction: function(eve) {
        eve.preventDefault()
        let entry = document.getElementById("text_input").value
        if (entry.length > 0) {
            switch (index.view){
                case "select":
                    index.createManifest(entry)
                    break;
                case "search":
                    index.searchManifest(entry)
                    break;
            }
        }
    },
    toSelect: function() {
        index.view = "select";
        document.getElementById("controls").style.backgroundColor = "#2EE4E5"

        document.getElementById("left_header").innerHTML = "Select Manifest"

        document.getElementById("data_inputs").style.display = "block"
        document.getElementById("text_input").placeholder = "New Manifest Name"
        document.getElementById("text_input").value = ""
        document.getElementById("click_input").innerHTML = "Create Manifest"

        document.getElementById("gotoselect").disabled = true
        document.getElementById("gotomanifest").disabled = false
        document.getElementById("gotosearch").disabled = false
        // document.getElementById("gotoselect").style.display = "none"
        // document.getElementById("gotomanifest").style.display = "inline"
        // document.getElementById("gotosearch").style.display = "inline"

        index.displayManifest()
        index.emptyNode(document.getElementById("display"))


        // let f = document.createElement("form")
        // f.id = "form_controls"
        // let input = document.createElement("input")
        // input.type = "text"
        // input.name = "new_manifest"
        // input.id = "nmanifest"
        // input.placeholder = "Create New Manifest"
        // f.appendChild(input)
        // let button = document.createElement("button")
        // button.type = "button"
        // button.innerHTML = "Create"
        // button.addEventListener("click", index.createManifest)
        // f.appendChild(document.createElement("br"))
        // f.appendChild(button)
        // let top = document.getElementById("controls")
        // index.emptyNode(top)
        // top.appendChild(f)
        // let b2 = document.createElement("button")
        // b2.type = "button"
        // b2.innerHTML = "ToManageTMP"
        // b2.addEventListener("click", index.toManage)
        // f.appendChild(document.createElement("br"))
        // f.appendChild(b2)
        
        asticode.loader.show();
        index.emptyNode(document.getElementById("display"))
        astilectron.sendMessage({"name": "get.listman", "payload": ""}, function(responce){
            asticode.loader.hide()
            if (responce.name === "error") {
                asticode.notifier.error(responce.payload);
                return
            }
            let header = document.createElement("h3")
            header.innerHTML = "Choose Manifest"
            document.getElementById("display").appendChild(header)
            let ul = document.createElement("ul")
            for (let manname of responce.payload) {
                let item = document.createElement("li")
                item.innerHTML = manname
                item.addEventListener("click", function(){
                    index.manifest = manname
                    index.toSearch()
                })
                ul.appendChild(item)
            }
            document.getElementById("display").appendChild(ul)
        });
    },
    toManage: function(manname) {
        index.view = "manage"
        index.manifest = manname

        document.getElementById("left_header").innerHTML = "Add Files"

        document.getElementById("controls").style.backgroundColor = "#F7A77F"

        document.getElementById("data_inputs").style.display = "none"
        document.getElementById("text_input").value = ""

        document.getElementById("gotoselect").disabled = false
        document.getElementById("gotomanifest").disabled = true
        document.getElementById("gotosearch").disabled = false
        // document.getElementById("gotoselect").style.display = "inline"
        // document.getElementById("gotomanifest").style.display = "none"
        // document.getElementById("gotosearch").style.display = "inline"

        // document.getElementById("manifest_name").innerHTML = index.manifest

        index.displayManifest();
        index.emptyNode(document.getElementById("display"))

        // let f = document.getElementById("controls")
        // index.emptyNode(f)
        // let header = document.createElement("h2")
        // header.innerHTML = index.manifest
        // f.appendChild(header)
        // let contentul = document.createElement("ul")
        // contentul.id = "mancontent"
        // f.appendChild(contentul)
        // let backbutton = document.createElement("button")
        // backbutton.innerHTML = "Select Manifest"
        // backbutton.addEventListener("click", index.toSelect)
        // f.appendChild(backbutton)
        // let tosearch = document.createElement("button")
        // tosearch.innerHTML = "To Search"
        // tosearch.addEventListener("click", index.toSearch)
        // f.appendChild(tosearch)

        asticode.loader.show();       
        astilectron.sendMessage({"name": "get.cwd", "payload": ""}, function(responce) {
            if (responce.name === "error") {
                asticode.notifier.error(responce.payload);
                return
            }
            index.loadDir(responce.payload) 
        });

        // let f = document.getElementById("form_controls")
        // f.innerHTML = ""
        // let input = document.createElement("input")
        // input.type = "file"
        // input.accept = ".txt"
        // input.id = "newfiles"
        // input.multiple = true
        // let button = document.createElement("button")
        // button.type = "button"
        // button.innerHTML = "Add File"
        // button.addEventListener("click", index.addFile)
        // f.appendChild(input)
        // f.appendChild(document.createElement("br"))
        // f.appendChild(button)
    },
    displayManifest: function(){
        document.getElementById("manifest_name").innerHTML = index.manifest
        astilectron.sendMessage({"name": "get.manifest", "payload": index.manifest}, function(responce){
            if (responce.name === "error") { 
                asticode.notifier.error(responce.payload)
                return
            }
            let ulist = document.getElementById("manifest_contents")
            index.emptyNode(ulist)
            for (let fname of responce.payload) {
                let item = document.createElement("li")
                item.innerHTML = fname
                ulist.appendChild(item)
            }
            // let item = document.createElement("li")
            // item.innerHTML = "end of list placeholder"
            // ulist.appendChild(item)
        });
    },
    createManifest: function(nname) {
        // document.getElementById("display").innerHTML = "<h1>TODO: create manifest named " + i.value + "</h1>";
        asticode.loader.show()
        astilectron.sendMessage({"name": "create.manifest", "payload": nname}, function(responce){
           asticode.loader.hide()
            if (responce.name === "error") {
                asticode.notifier.error(responce.payload)
                return
            }
            index.toManage(responce.payload)
        });
    },
    addFile: function(fname) {
        //document.getElementById("display").innerHTML = "<h1>TODO: add " + document.getElementById("newfiles").value + " to manifest</h1>"
        asticode.loader.show()
        astilectron.sendMessage({"name": "add.file", "payload":{"Manifest":index.manifest, "Filename": fname}}, function(responce){
            asticode.loader.hide()
            if (responce.name === "error") {
                asticode.notifier.error(responce.payload);
                return
            }
            index.displayManifest();
        });
    },
    loadDir: function(dir) {
        asticode.loader.show();
        astilectron.sendMessage({"name": "get.listdir", "payload": dir}, function(message){
            asticode.loader.hide();
            if (message.name === "error") {
                asticode.notifier.error(message.payload);
                return
            }

            let disp = document.getElementById("display")
            
            index.emptyNode(disp)

            let header = document.createElement("h5")
            header.innerHTML = dir
            disp.appendChild(header)
            {
                //add folders on the left
                let box = document.createElement("div")
                box.className = "left"
                let header = document.createElement("h3")
                header.innerHTML = "Browse"
                box.appendChild(header)
                let ulist = document.createElement("ul")
                let up = document.createElement("li")
                up.innerHTML = ".."
                up.addEventListener("click", function(){index.changeDir(true, "")})
                ulist.appendChild(up)
                for (let d of message.payload.Dir) {
                    let item = document.createElement("li")
                    item.innerHTML = d
                    item.addEventListener("click", function (){index.changeDir(false, d)})
                    ulist.appendChild(item)
                }
                box.appendChild(ulist)
                disp.appendChild(box)
            }

            {
                let box = document.createElement("div")
                box.className = "right"
                let header = document.createElement("h3")
                header.innerHTML = "Select File"
                box.appendChild(header)
                let filelist = document.createElement("ul")
                for (let f of message.payload.Txt) {
                    let item = document.createElement("li")
                    item.innerHTML = f
                    item.addEventListener("click", index.addFile.bind(true, f))
                    filelist.appendChild(item)
                }
                box.appendChild(filelist)
                disp.appendChild(box)
            }
        })
    },
    changeDir: function (up, down) {
        asticode.loader.show();
        astilectron.sendMessage({"name": "set.cwd", "payload": {"Up": up, "Down": down}}, function(message){
            if (message.name === "error") {
                asticode.notifier.error(message.payload);
                return
            }
            astilectron.sendMessage({"name": "get.cwd", "payload": ""}, function(responce) {
                if (responce.name === "error") {
                    asticode.notifier.error(responce.payload);
                    return
                }
                index.loadDir(responce.payload)
            })
        })
    },
    toSearch: function() {
        index.view = "search"

        document.getElementById("left_header").innerHTML = "Search Manifest"

        document.getElementById("controls").style.backgroundColor = "#A8F27C"

        document.getElementById("data_inputs").style.display = "block"
        document.getElementById("text_input").placeholder = "Enter Search Terms"
        document.getElementById("text_input").value = ""
        document.getElementById("click_input").innerHTML = "Search"

        document.getElementById("gotoselect").disabled = false
        document.getElementById("gotomanifest").disabled = false
        document.getElementById("gotosearch").disabled = true
        // document.getElementById("gotoselect").style.display = "inline"
        // document.getElementById("gotomanifest").style.display = "inline"
        // document.getElementById("gotosearch").style.display = "none"

        index.displayManifest()
        index.emptyNode(document.getElementById("display"))



        // let top = document.getElementById("controls")
        // index.emptyNode(top)

        // let header = document.createElement("h2")
        // header.innerHTML = "Searching " + index.manifest
        // top.appendChild(header)


        // let f = document.createElement("form")
        // f.id = "searchwindow"
        // let searchterms = document.createElement("input")
        // searchterms.id = "searchwords"
        // searchterms.type = "text"
        // searchterms.name = "words"
        // searchterms.placeholder = "Find"
        // f.appendChild(searchterms)
        // let sbutton = document.createElement("button")
        // sbutton.id = "searchgo"
        // sbutton.type = "button"
        // sbutton.innerHTML = "Search"
        // sbutton.addEventListener("click", index.searchManifest)
        // f.appendChild(document.createElement("br"))
        // f.appendChild(sbutton)
        // let backbutton = document.createElement("button")
        // backbutton.type = "button"
        // backbutton.id = "ToManage"
        // backbutton.innerHTML = "Back"
        // backbutton.addEventListener("click", index.toManage.bind(true, index.manifest))
        // f.appendChild(backbutton)

        // top.appendChild(f)
        
    },
    searchManifest: function(sstr) {
        index.currentSearch = sstr
        index.emptyNode(document.getElementById("display"))
        asticode.loader.show()   
        // update Query element
        astilectron.sendMessage({"name":"search", "payload": {"Manifest": index.manifest, "Type": "simple", "Data": sstr}}, function(responce){
            if (responce.name === "error") {
                asticode.loader.hide()
                asticode.notifier.error(responce.payload)
                return
            }
        });
    },
    addSearchResult: function(data) {
        asticode.loader.hide()
        let resultblock = document.createElement("div")
        let filename = document.createElement("h4")
        filename.innerHTML = data.Document
        resultblock.appendChild(filename)
        let indexstring = document.createElement("h5")
        indexstring.innerHTML = "Paragraph: " + data.Paragraph + " Sentence: " + data.Sentence
        resultblock.appendChild(indexstring)
        let content = document.createElement("p")
        for (i = 0; i < data.Words.length; i++) {
            if (i > 0) {
                let space = document.createElement("span")
                space.innerHTML = " "
                content.appendChild(space)
            }
            let sp = document.createElement("span")
            sp.innerHTML = data.Words[i]
            if (data.Matches.includes(i)) {
                sp.className = "highlight"
            }
            content.appendChild(sp)
        }
        // content.innerHTML = data.Words.join(" ")
        resultblock.appendChild(content)
        document.getElementById("display").appendChild(resultblock)
    }
};