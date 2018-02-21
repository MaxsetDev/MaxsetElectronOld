let index = {
    manifest: "",
    view: "",
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
                    if (index.currentSearch === message.payload.Search) {
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
    toSelect: function() {
        index.view = "select";
        let f = document.createElement("form")
        f.id = "form_controls"
        let input = document.createElement("input")
        input.type = "text"
        input.name = "new_manifest"
        input.id = "nmanifest"
        input.placeholder = "Create New Manifest"
        f.appendChild(input)
        let button = document.createElement("button")
        button.type = "button"
        button.innerHTML = "Create"
        button.addEventListener("click", index.createManifest)
        f.appendChild(document.createElement("br"))
        f.appendChild(button)
        let top = document.getElementById("controls")
        index.emptyNode(top)
        top.appendChild(f)
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
            header.innerHTML = "Manifests"
            document.getElementById("display").appendChild(header)
            let ul = document.createElement("ul")
            for (let manname of responce.payload) {
                let item = document.createElement("li")
                item.innerHTML = manname
                item.addEventListener("click", index.toManage.bind(true, manname))
                ul.appendChild(item)
            }
            document.getElementById("display").appendChild(ul)
        });
    },
    toManage: function(manname) {
        index.view = "manage"
        index.manifest = manname
        let f = document.getElementById("controls")
        index.emptyNode(f)
        let header = document.createElement("h2")
        header.innerHTML = index.manifest
        f.appendChild(header)
        let contentul = document.createElement("ul")
        contentul.id = "mancontent"
        f.appendChild(contentul)
        let backbutton = document.createElement("button")
        backbutton.innerHTML = "Select Manifest"
        backbutton.addEventListener("click", index.toSelect)
        f.appendChild(backbutton)
        let tosearch = document.createElement("button")
        tosearch.innerHTML = "To Search"
        tosearch.addEventListener("click", index.toSearch)
        f.appendChild(tosearch)

        asticode.loader.show();
        index.displayManifest();
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
        astilectron.sendMessage({"name": "get.manifest", "payload": index.manifest}, function(responce){
            if (responce.name === "error") { 
                asticode.notifier.error(responce.payload)
                return
            }
            let ulist = document.getElementById("mancontent")
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
    createManifest: function() {
        let i = document.getElementById("nmanifest");
        // document.getElementById("display").innerHTML = "<h1>TODO: create manifest named " + i.value + "</h1>";
        asticode.loader.show()
        astilectron.sendMessage({"name": "create.manifest", "payload": i.value}, function(responce){
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

            let header = document.createElement("h3")
            header.innerHTML = dir
            disp.appendChild(header)
            {
                //add folders on the left
                let box = document.createElement("div")
                box.className = "left"
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
        let top = document.getElementById("controls")
        index.emptyNode(top)

        let header = document.createElement("h2")
        header.innerHTML = "Searching " + index.manifest
        top.appendChild(header)


        let f = document.createElement("form")
        f.id = "searchwindow"
        let searchterms = document.createElement("input")
        searchterms.id = "searchwords"
        searchterms.type = "text"
        searchterms.name = "words"
        searchterms.placeholder = "Find"
        f.appendChild(searchterms)
        let sbutton = document.createElement("button")
        sbutton.id = "searchgo"
        sbutton.type = "button"
        sbutton.innerHTML = "Search"
        sbutton.addEventListener("click", index.searchManifest)
        f.appendChild(document.createElement("br"))
        f.appendChild(sbutton)
        let backbutton = document.createElement("button")
        backbutton.type = "button"
        backbutton.id = "ToManage"
        backbutton.innerHTML = "Back"
        backbutton.addEventListener("click", index.toManage.bind(true, index.manifest))
        f.appendChild(backbutton)

        top.appendChild(f)
        index.emptyNode(document.getElementById("display"))
    },
    searchManifest: function() {
        let i = document.getElementById("searchwords")
        index.currentSearch = i.value
        index.emptyNode(document.getElementById("display"))
        asticode.loader.show()   
        // update Query element
        astilectron.sendMessage({"name":"search", "payload": {"Manifest": index.manifest, "Type": "simple", "Data": i.value}}, function(responce){
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
        content.innerHTML = data.Words.join(" ")
        resultblock.appendChild(content)
        document.getElementById("display").appendChild(resultblock)
    }
};