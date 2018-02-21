package main

import (
	"maxset.io/devon/knsearch/query"
	"fmt"
	"os"
	"path/filepath"
	"encoding/json"
	"strings"
	"maxset.io/devon/keynlp-gui/manifest"

	bootstrap "github.com/asticode/go-astilectron-bootstrap"
	"github.com/asticode/go-astilectron"
)

func handleMessages(_ *astilectron.Window, m bootstrap.MessageIn) (payload interface{}, err error) {
	switch m.Name {
	case "get.cwd":
		if payload, err = os.Getwd(); err != nil {
			payload = err.Error()
			return
		}
	case "set.cwd":
		var update struct{
			Up bool
			Down string
		}
		payload = ""
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
			return
		}
		payload = ""
	case "get.listman":
		var names = make([]string, 0, len(manifest.ManifestList)+1)
		names = append(names, "ALL")
		for k, _ := range manifest.ManifestList {
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
		if name == "ALL" {
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
		if data.Manifest == "ALL" {
			manif = manifest.Super
		} else {
			var ok bool
			if manif, ok = manifest.ManifestList[data.Manifest]; !ok{
				err = fmt.Errorf("%s not a recognized manifest", data.Manifest)
				payload = err.Error()
				return
			}
		}
		if err = manif.AddFile(data.Filename, manifest.Patterndata); err != nil {
			payload = err.Error()
			return
		}
		if err = manifest.Save(); err != nil {
			payload = err.Error()
			return
		}
		payload = ""
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
		payload = ""
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
			case ".txt":
				result.Txt = append(result.Txt, f.Name())
			}
		}
	}
	return result, err
}

func simplequery(manname, data string) error {
	var manif manifest.Manifest
	if manname == "ALL" {
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
		bootstrap.SendMessage(w, "alert", err.Error())
	})
	if err != nil {
		return err
	}
	return nil
}