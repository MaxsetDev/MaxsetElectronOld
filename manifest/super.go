package manifest

import (
	"fmt"
	"path/filepath"

	"maxset.io/devon/keynlp/proc"
	"maxset.io/devon/keynlp/types"
	"maxset.io/devon/knsearch/query"
)

var Super *Parent

type Parent struct {
	Data map[string]*element
}

func (par *Parent) init() {
	if par.Data == nil {
		par.Data = make(map[string]*element)
	}
}

func (par Parent) AddFile(path string, toolkit proc.Processor) error {
	par.init()
	fullpath, err := filepath.Abs(path)
	if err != nil {
		return err
	}
	if par.Data[fullpath] != nil {
		return nil
	}
	temp, err := newElement(fullpath, toolkit)
	if err != nil {
		return err
	}
	par.Data[fullpath] = temp
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
		return fmt.Errorf("%s not contained")
	}
	ele.Delete()
	par.Data[fullpath] = nil
	return nil
}

func (par *Parent) Id() string {
	par.init()
	return "KEYNLP-Everything"
}

func (par *Parent) ListFiles() []string {
	par.init()
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
	for _, v := range par.Data {
		record := v
		metastring, err := record.GetSet()
		if err != nil {
			errorcallback(err)
			return err
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
				})
			} else {
				for _, sent := range content {
					if (b == query.Sentence && matches[sent.Position]) || (b == query.Paragraph && matches[sent.Paragraph]) {
						matchcallback(SearchResult{
							Words:     joinPhrases(sent),
							Paragraph: sent.Paragraph,
							Sentence:  sent.Position,
							Document:  record.GetPath(),
						})
					}
				}
			}
		} else {
			matchcallback(SearchResult{
				Words:     []string{"No", "Results"},
				Paragraph: 0,
				Sentence:  0,
				Document:  record.GetPath(),
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

func (par *Parent) Cleanup(toolkit proc.Processor) error {
	for _, v := range par.Data {
		go v.Update(toolkit)
	}
	return nil
}
