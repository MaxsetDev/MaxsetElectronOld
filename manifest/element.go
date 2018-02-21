package manifest

import (
	"bytes"
	"compress/lzw"
	"fmt"
	"io"
	"io/ioutil"
	"os"
	"path/filepath"
	"sync"
	"time"

	"maxset.io/devon/keynlp/proc"
	"maxset.io/devon/keynlp/types"
)

type element struct {
	Original string
	Tag      string
	Set      string
	Modtime  time.Time
	lock     sync.Mutex
}

func newElement(path string, toolkit proc.Processor) (result *element, err error) {
	defer func() {
		if r := recover(); r != nil {
			result = nil
			err = fmt.Errorf("Unable to process %s: %s", path, r)
		}
	}()
	result = new(element)
	result.Original, err = filepath.Abs(path)
	if err != nil {
		panic(err)
	}
	result.Update(toolkit)

	return result, nil
}

func (ele *element) Update(toolkit proc.Processor) (err error) {
	ele.lock.Lock()
	defer ele.lock.Unlock()
	var stat os.FileInfo
	var redo bool = false
	if stat, err = os.Stat(ele.Original); err != nil {
		return
	}
	if _, err = os.Stat(ele.Tag); err != nil {
		redo = true
	}
	if _, err = os.Stat(ele.Set); err != nil {
		redo = true
	}
	if redo || stat.ModTime().After(ele.Modtime) {
		ele.delete()
		var f *os.File
		if f, err = os.Open(ele.Original); err != nil {
			return
		}
		ele.Modtime = stat.ModTime()
		content := toolkit.Structure(f)
		f.Close()

		msbuild := types.NewMetaStringBuilder()
		for _, sent := range content {
			msbuild.Load(sent)
		}

		var newtagfile *os.File
		if newtagfile, err = ioutil.TempFile("", "tag"); err != nil {
			return
		}
		ele.Tag = newtagfile.Name()
		tgwrtr := lzw.NewWriter(newtagfile, lzw.LSB, 8)
		io.Copy(tgwrtr, types.NewDocReader(content))
		tgwrtr.Close()
		newtagfile.Close()

		var newsetfile *os.File
		if newsetfile, err = ioutil.TempFile("", "set"); err != nil {
			return
		}
		ele.Set = newsetfile.Name()
		types.CompressMetastring(msbuild.Dump(), newsetfile)
		newsetfile.Close()
	}
	return nil
}

func (ele *element) GetPath() string {
	return ele.Original
}

func (ele *element) GetTagged() (tagged []types.TaggedSent, err error) {
	ele.lock.Lock()
	defer ele.lock.Unlock()
	defer func() {
		if r := recover(); r != nil {
			tagged = nil
			err = fmt.Errorf("%s", r)
		}
	}()
	docwrtr := types.NewDocWriter()
	if t, err := os.Open(ele.Tag); err == nil {
		io.Copy(docwrtr, lzw.NewReader(t, lzw.LSB, 8))
		tagged = docwrtr.GetDoc()
		t.Close()
	} else {
		panic(err)
	}
	return
}

func (ele *element) GetSet() (meta string, err error) {
	ele.lock.Lock()
	defer ele.lock.Unlock()
	defer func() {
		if r := recover(); r != nil {
			meta = ""
			err = fmt.Errorf("%s", r)
		}
	}()
	err = nil
	if m, err := os.Open(ele.Set); err == nil {
		decompress := lzw.NewReader(m, lzw.LSB, 8)
		buffer := new(bytes.Buffer)
		io.Copy(buffer, decompress)
		meta = string(buffer.Bytes())
		m.Close()
	} else {
		panic(err)
	}
	//fmt.Printf("%s\n", meta)
	return
}

func (ele *element) delete() {
	os.Remove(ele.Tag)
	os.Remove(ele.Set)
}

func (ele *element) Delete() {
	ele.lock.Lock()
	defer ele.lock.Unlock()
	ele.delete()
}
