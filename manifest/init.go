package manifest

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"

	"maxset.io/devon/keynlp/proc"
	"maxset.io/devon/rot128"
)

var ManifestList map[string]*Selection

var Patterndata proc.Processor

func Init() error {
	exe, err := os.Executable()
	if err != nil {
		return err
	}
	exfolder := filepath.Dir(exe)

	//load pattern data
	if err := patterninit(exfolder); err != nil {
		return err
	}

	//Load Super Manifest and sub manifests
	if err := superinit(exfolder); err != nil {
		return err
	}

	if err := mlistinit(exfolder); err != nil {
		return err
	}
	errq := Super.Cleanup(Patterndata)
	cleanerrQ := make([]error, 0)
	for cleanerr := range errq {
		cleanerrQ = append(cleanerrQ, cleanerr)
	}
	if len(cleanerrQ) > 0 {
		errmssgs := make([]string, 0, len(cleanerrQ))
		for _, e := range cleanerrQ {
			errmssgs = append(errmssgs, e.Error())
		}
		return fmt.Errorf("Error on initial file preparation: %s", strings.Join(errmssgs, "...AND..."))
	}
	return nil
}

func patterninit(exfolder string) error {
	patternfile := filepath.Join(exfolder, "resources", "eng.pat")
	pf, err := os.Open(patternfile)
	defer pf.Close()
	if err != nil {
		return err
	}
	buf := make([]byte, 256)
	Pdata := make([]byte, 0, 256)
	rot := rot128.NewReader(pf)
	n, err := rot.Read(buf)
	for ; (err == nil || err == io.EOF) && n > 0; n, err = rot.Read(buf) {
		Pdata = append(Pdata, buf[:n]...)
	}
	if err != io.EOF {
		return err
	}
	Patterndata = proc.NewProcessor(bytes.NewReader(Pdata))
	return nil
}

func superinit(exfolder string) error {
	superfile := filepath.Join(exfolder, "resources", "super.json")
	sf, err := os.Open(superfile)
	defer sf.Close()
	if err != nil {
		return err
	}
	dcd := json.NewDecoder(sf)
	Super = new(Parent)
	if err := dcd.Decode(Super); err != nil {
		return err
	}
	return nil
}

func mlistinit(exfolder string) error {
	mlistfile := filepath.Join(exfolder, "resources", "manifestlist.json")
	mlist, err := os.Open(mlistfile)
	defer mlist.Close()
	if err != nil {
		return err
	}
	dcd := json.NewDecoder(mlist)
	ManifestList = make(map[string]*Selection)
	if err := dcd.Decode(&ManifestList); err != nil {
		return err
	}
	return nil
}

func Save() error {
	exe, err := os.Executable()
	if err != nil {
		return err
	}
	exfolder := filepath.Dir(exe)

	if err := supersave(exfolder); err != nil {
		return err
	}

	if err := mlistsave(exfolder); err != nil {
		return err
	}

	return nil
}

func supersave(exfolder string) error {
	path := filepath.Join(exfolder, "resources", "supertemp.json")
	superfile, err := os.Create(path)
	defer superfile.Close()
	if err != nil {
		return err
	}
	enc := json.NewEncoder(superfile)
	if err := enc.Encode(Super); err != nil {
		return err
	}

	superfile.Close()
	if err := os.Rename(path, filepath.Join(exfolder, "resources", "super.json")); err != nil {
		return err
	}
	return nil
}

func mlistsave(exfolder string) error {
	path := filepath.Join(exfolder, "resources", "manifestlisttemp.json")
	mlistfile, err := os.Create(path)
	defer mlistfile.Close()
	if err != nil {
		return err
	}
	enc := json.NewEncoder(mlistfile)
	if err := enc.Encode(ManifestList); err != nil {
		return err
	}

	mlistfile.Close()
	if err := os.Rename(path, filepath.Join(exfolder, "resources", "manifestlist.json")); err != nil {
		return err
	}
	return nil
}
