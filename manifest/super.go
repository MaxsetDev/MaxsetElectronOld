package manifest

import (
	"fmt"
	"path/filepath"
	"sync"

	"maxset.io/devon/keynlp/proc"
	"maxset.io/devon/keynlp/types"
	"maxset.io/devon/knsearch/query"
)

var Super *Parent

type Parent struct {
	Data map[string]*element
	lock sync.Mutex
}

func (par *Parent) init() {
	if par.Data == nil {
		par.Data = make(map[string]*element)
	}
}

func (par *Parent) AddFile(path string, toolkit proc.Processor) error {
	par.init()
	fullpath, err := filepath.Abs(path)
	if err != nil {
		return err
	}
	par.lock.Lock()
	if par.Data[fullpath] != nil {
		par.lock.Unlock()
		return nil
	}
	par.Data[fullpath] = new(element)
	par.lock.Unlock()
	temp, err := newElement(fullpath, toolkit)
	if err != nil {
		return err
	}
	par.lock.Lock()
	par.Data[fullpath] = temp
	par.lock.Unlock()
	return nil
}

func (par *Parent) RemoveFile(path string) error {
	par.init()
	fullpath, err := filepath.Abs(path)
	if err != nil {
		return err
	}
	var ele *element
	ele = par.Data[fullpath]
	if ele == nil {
		return nil
	}
	par.lock.Lock()
	delete(par.Data, fullpath)
	//par.Data[fullpath] = nil
	par.lock.Unlock()
	ele.Delete()
	for _, v := range ManifestList {
		v.RemoveFile(fullpath)
	}
	return nil
}

func (par *Parent) Id() string {
	par.init()
	return "All Searchable Files"
}

func (par *Parent) ListFiles() []string {
	par.init()
	par.lock.Lock()
	defer par.lock.Unlock()
	result := make([]string, 0, len(par.Data))
	for k, v := range par.Data {
		if v != nil {
			result = append(result, k)
		}
	}
	return result
}

func (par *Parent) Search(q query.Query, b query.Block, s uint, matchcallback func(SearchResult), errorcallback func(error)) error {
	defer func() {
		if r := recover(); r != nil {
			errorcallback(fmt.Errorf("panic in search: %s", r))
		}
	}()
	par.lock.Lock()
	defer par.lock.Unlock()
	for _, v := range par.Data {
		record := v
		metastring, err := record.GetSet()
		if err != nil {
			errorcallback(fmt.Errorf("unable to get set string: %s", err))
			err = record.Update(Patterndata)
			if err != nil {
				errorcallback(fmt.Errorf("correction failed: %s", err.Error()))
				return err
			}
			metastring, err = record.GetSet()
			if err != nil {
				errorcallback(fmt.Errorf("unable to get set string after recovery: %s", err))
				return err
			}
		}
		if q.Check(metastring) {
			content, err := record.GetTagged()
			if err != nil {
				errorcallback(err)
				return err
			}
			var matches map[uint]bool
			switch b {
			case query.Sentence:
				matches = q.MatchSentence(content, s)
			case query.Paragraph:
				matches = q.MatchParagraph(content, s)
			default:
				errorcallback(fmt.Errorf("unrecognized query block type"))
				return err
			}
			if matches == nil {
				errorcallback(fmt.Errorf("search failed and returned nil"))
			} else if len(matches) == 0 {
				matchcallback(SearchResult{
					Words:     []string{"No", "Results"},
					Paragraph: 0,
					Sentence:  0,
					Document:  record.GetPath(),
					Name:      filepath.Base(record.GetPath()),
					Matches:   make([]int, 0),
				})
			} else {
				for _, sent := range content {
					if (b == query.Sentence && matches[sent.Position]) || (b == query.Paragraph && matches[sent.Paragraph]) {
						result := SearchResult{
							Words:     joinPhrases(sent),
							Paragraph: sent.Paragraph,
							Sentence:  sent.Position,
							Document:  record.GetPath(),
							Name:      filepath.Base(record.GetPath()),
							Matches:   make([]int, 0),
						}
						for i, wrd := range result.Words {
							if q.IsTerm(wrd) {
								result.Matches = append(result.Matches, i)
							}
						}
						matchcallback(result)
					}
				}
			}
		} else {
			matchcallback(SearchResult{
				Words:     []string{"No", "Results"},
				Paragraph: 0,
				Sentence:  0,
				Document:  record.GetPath(),
				Name:      filepath.Base(record.GetPath()),
				Matches:   make([]int, 0),
			})
		}
	}
	return nil
}

func joinPhrases(s types.TaggedSent) []string {
	result := make([]string, 0, len(s.Phrases))
	for _, phrase := range s.Phrases {
		result = append(result, phrase...)
	}
	return result
}

func (par *Parent) Cleanup(toolkit proc.Processor) chan error {
	reports := make(chan error, 10)
	del := make(chan *element)
	size := 0
	par.lock.Lock()
	for _, v := range par.Data {
		size++
		go func(v *element) {
			if err := v.Update(toolkit); err != nil {
				reports <- err
				del <- v
			} else {
				del <- nil
			}
		}(v)
	}
	go func() {
		if size > 0 {
			for d := range del {
				if d != nil {
					if _, ok := par.Data[d.Original]; ok {
						delete(par.Data, d.Original)
					}
					d.Delete()
				}
				size--
				if size <= 0 {
					break
				}
			}
		}
		close(reports)
		par.lock.Unlock()
	}()
	return reports
}

func (par *Parent) GetTagged(fname string) ([]types.TaggedSent, error) {
	par.lock.Lock()
	defer par.lock.Unlock()
	ele, ok := par.Data[fname]
	if !ok || ele == nil {
		return nil, ErrNotFound
	}
	return ele.GetTagged()
}

func (par *Parent) GetSet(fname string) (string, error) {
	par.lock.Lock()
	defer par.lock.Unlock()
	ele, ok := par.Data[fname]
	if !ok || ele == nil {
		return "", ErrNotFound
	}
	return ele.GetSet()
}
