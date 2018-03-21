package main

import (
	"maxset.io/devon/knsearch/query"
	"fmt"
	"os"
	"io"
	"path/filepath"
	"encoding/json"
	"strings"
	"bytes"
	"maxset.io/devon/keynlp-gui/manifest"
	"maxset.io/devon/keynlp/types"
	"maxset.io/devon/docsheet/tagtorow"

	bootstrap "github.com/asticode/go-astilectron-bootstrap"
	"github.com/asticode/go-astilectron"
)

func handleMessages(_ *astilectron.Window, m bootstrap.MessageIn) (payload interface{}, err error) {
	payload = "no errors"
	err = nil
	switch m.Name {
	case "get.cwd":
		var content struct {
			Path string
			Name string
		}
		if content.Path, err = os.Getwd(); err != nil {
			payload = err.Error()
			return
		}
		content.Name = filepath.Base(content.Path)
		payload = content
	case "set.cwd":
		var update struct{
			Up bool
			Down string
		}
		if err = json.Unmarshal(m.Payload, &update); err != nil {
			payload = err.Error()
			return
		}
		if update.Up {
			if err = os.Chdir(".."); err != nil {
				payload = err.Error()
				return
			}
		} else {
			if err = os.Chdir(update.Down); err != nil {
				payload = err.Error()
				return
			}
		}
	case "get.listdir":
		var path string
		if err = json.Unmarshal(m.Payload, &path); err != nil {
			payload = err.Error()
			return 
		}
		if payload, err = listdir(path); err != nil {
			payload = err.Error()
			return
		}
	case "init":
		if err = manifest.Init(); err != nil {
			payload = err.Error()
			go manifest.Save()
			return
		}
		//bootstrap.SendMessage(w, "alert", "backend init complete")
	case "get.listman":
		var names = make([]string, 0, len(manifest.ManifestList)+1)
		names = append(names, "All Searchable Files")
		for k := range manifest.ManifestList {
			names = append(names, k)
		}
		payload = names
	case "get.manifest":
		var name string
		if err = json.Unmarshal(m.Payload, &name); err != nil {
			payload = err.Error()
			return
		}
		var manif manifest.Manifest
		var ok bool
		if name == "All Searchable Files" {
			manif = manifest.Super
		}else if manif, ok = manifest.ManifestList[name]; !ok {
			err = fmt.Errorf("%s not recognized manifest", name)
			payload = err.Error()
			return
		}
		payload = manif.ListFiles()
	case "create.manifest":
		var name string
		if err = json.Unmarshal(m.Payload, &name); err != nil {
			payload = err.Error()
			return
		}
		if name == "All Searchable Files" || manifest.ManifestList[name] != nil{
			err = fmt.Errorf("Manifest Already Exists")
			payload = err.Error()
			return
		}
		manifest.ManifestList[name] = manifest.NewSelection(name)
		payload = name
		go manifest.Save()
	case "add.file":
		var data struct {
			Manifest string
			Filename string
		}
		if err = json.Unmarshal(m.Payload, &data); err != nil {
			payload = err.Error()
			return
		}
		var manif manifest.Manifest
		if data.Manifest == "All Searchable Files" {
			manif = manifest.Super
		} else {
			var ok bool
			if manif, ok = manifest.ManifestList[data.Manifest]; !ok{
				err = fmt.Errorf("%s not a recognized manifest", data.Manifest)
				payload = err.Error()
				return
			}
		}
		go func(){
			if err = manif.AddFile(data.Filename, manifest.Patterndata); err != nil {
				bootstrap.SendMessage(w, "notify.error", 
					 err.Error())
			}else{
				bootstrap.SendMessage(w, "notify.success",
					data.Filename)
				manifest.Save()
			}
			bootstrap.SendMessage(w, "refresh.manifest", "")
		}()
	case "add.all":
		var data struct {
			Manifest string
			Directory string
		}
		if err = json.Unmarshal(m.Payload, &data); err != nil {
			payload = err.Error()
			return
		}
		var manif manifest.Manifest
		if manif, err = resolveManifest(data.Manifest); err != nil {
			payload = err.Error()
			return
		}
		if err = addall(manif, data.Directory); err != nil {
			payload = err.Error()
			return
		}
	case "search":
		var data struct {
			Manifest string
			Type string
			Data string
		}
		if err = json.Unmarshal(m.Payload, &data); err != nil {
			payload = err.Error()
			return
		}
		if err = simplequery(data.Manifest, data.Data); err != nil {
			payload = err.Error()
			return
		}
		bootstrap.SendMessage(w, "search.complete", data.Data)
	case "make.docsheet":
		var data struct {
			Original string
			Saveto string
		}
		if err = json.Unmarshal(m.Payload, &data); err != nil {
			payload = err.Error()
			return
		}
		var txt []types.TaggedSent
		if txt, err = manifest.Super.GetTagged(data.Original); err != nil {
			payload = err.Error()
			return
		}
		if err = buildDocSheet(data.Saveto, txt); err != nil {
			payload = err.Error()
			return
		}
	case "remove.file":
		var data struct {
			Manifest string
			File string
		}
		if err = json.Unmarshal(m.Payload, &data); err != nil {
			payload = err.Error()
			return
		}
		var m manifest.Manifest
		if m, err = resolveManifest(data.Manifest); err != nil {
			payload = err.Error()
			return
		}
		if err = m.RemoveFile(data.File); err != nil {
			payload = err.Error()
			return
		}
		go manifest.Save()
	case "remove.manifest":
		var manif string
		if err = json.Unmarshal(m.Payload, &manif); err != nil {
			payload = err.Error()
			return
		}
		if _, ok := manifest.ManifestList[manif]; ok {
			delete(manifest.ManifestList, manif)
		}
		go manifest.Save()
	}
	return 
}

func resolveManifest(name string) (manif manifest.Manifest, err error) {
	if name == "All Searchable Files" {
		manif = manifest.Super
	} else {
		var ok bool
		if manif, ok = manifest.ManifestList[name]; !ok{
			err = fmt.Errorf("%s not a recognized manifest", name)
			return
		}
	}
	return
}

type dircontent struct {
	Dir []string
	Txt []string
}

func listdir(dir string) (dircontent, error) {
	var d *os.File
	var err error
	if dir == "" {
		if dir, err = os.Getwd(); err != nil {
			return dircontent{}, err
		}
	}
	if d, err = os.Open(dir); err != nil {
		return dircontent{}, err
	}
	if stat, err := d.Stat(); err != nil || !stat.IsDir() {
		return dircontent{}, fmt.Errorf("Is not Dir")
	}
	content, err := d.Readdir(-1)
	result := dircontent{make([]string, 0), make([]string, 0)}
	for _, f := range content {
		if f.IsDir() {
			result.Dir = append(result.Dir, f.Name())
		} else {
			switch filepath.Ext(f.Name()){
			case ".pdf":
				fallthrough
			// case ".doc":
			// 	fallthrough
			// case ".odt":
			// 	fallthrough
			case ".txt":
				result.Txt = append(result.Txt, f.Name())
			}
		}
	}
	return result, err
}

func simplequery(manname, data string) error {
	var manif manifest.Manifest
	if manname == "All Searchable Files" {
		manif = manifest.Super
	} else if manif, _ = manifest.ManifestList[manname]; manif == nil {
		return fmt.Errorf("%s is not a recognized", manname)
	}
	var qs = make([]query.Query, 0)
	//bootstrap.SendMessage(w, "alert", fmt.Sprintf("building query from\n%s", data))
	for _, word := range strings.Fields(data) {
		//bootstrap.SendMessage(w, "alert", fmt.Sprintf("adding %s to query", word))
		qs = append(qs, query.NewSimpleQuery(word))
	}
	if len(qs) <= 0 {
		return fmt.Errorf("no words in search term (%s)", data)
	}
	var full query.Query = query.All(qs...)
	//bootstrap.SendMessage(w, "alert", fmt.Sprintf("Query:\n%s", full.String()))
	err := manif.Search(full, query.Sentence, 1, func(r manifest.SearchResult){
		//bootstrap.SendMessage(w, "alert", "match found!!")
		bootstrap.SendMessage(w, "search.result", map[string]interface{}{
			"Search": data,
			"Result": r,
		})
	}, func(err error){
		bootstrap.SendMessage(w, "notify.error", err.Error())
	})
	return err
}

func buildDocSheet(fname string, content []types.TaggedSent) error {
	f, err := os.Create(fname)
	if err != nil {
		return err
	}
	header := "Index,Paragraph,Position,Condition,Topic,Action,Resource,Process,Connection,Unknown\r\n"
	byts := tagtorow.ToBytes(tagtorow.ToRows(content, []types.Synth{
		types.CONDITION,
		types.TOPIC,
		types.ACTION,
		types.RESOURCE,
		types.PROCESS,
		types.CONNECTION,
		types.UNKNOWN,
	}))
	_, err = io.Copy(f, strings.NewReader(header))
	if err != nil {
		return err
	}
	_, err = io.Copy(f, bytes.NewReader(byts))
	if err != nil {
		return err
	}
	return nil
}

type adddata struct {
	folder string
	name string
}

func addall(m manifest.Manifest, dirpath string) (err error) {
	var dir *os.File
	if dir, err = os.Open(dirpath); err != nil{
		return
	}
	var content []string
	if content, err = dir.Readdirnames(-1); err != nil {
		return
	}
	check := make(chan bool)
	addchan := make(chan adddata, len(content))
	for i := 0; i < *threadCount; i++ {
		go func(){
			for data := range addchan {
				if err := m.AddFile(filepath.Join(data.folder, data.name), manifest.Patterndata); err != nil {
					bootstrap.SendMessage(w, "notify.error", 
						fmt.Sprintf("adding %s: %s", data.name, err.Error()))
				} else {
					bootstrap.SendMessage(w, "file.added",
						filepath.Join(data.folder, data.name),
					)
				}
				check <- true
			}
		}()
	}
	c := 0
	for _, f := range content {
		switch filepath.Ext(f){
		case ".txt":
			addchan <- adddata{dirpath, f}
			c++
		}
	}
	close(addchan)
	go func(size int){
		count := 0
		for range check {
			count++
			if count >= size {
				break
			}
		}
		manifest.Save()
		bootstrap.SendMessage(w, "refresh.manifest", "")
	}(c)
	return nil
}