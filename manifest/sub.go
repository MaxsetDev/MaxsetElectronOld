package manifest

import (
	"fmt"
	"path/filepath"

	"maxset.io/devon/keynlp/proc"
	"maxset.io/devon/knsearch/query"
)

type Selection struct {
	Data map[string]bool
	Name string
}

func NewSelection(name string) *Selection {
	n := new(Selection)
	n.Data = make(map[string]bool)
	n.Name = name
	return n
}

func (sele *Selection) AddFile(path string, toolkit proc.Processor) error {
	fullpath, err := filepath.Abs(path)
	if err != nil {
		return err
	}
	if err = Super.AddFile(fullpath, toolkit); err != nil {
		return err
	}
	sele.Data[fullpath] = true
	return nil
}

func (sele *Selection) RemoveFile(path string) error {
	fullpath, err := filepath.Abs(path)
	if err != nil {
		return err
	}
	sele.Data[fullpath] = false
	return nil
}

func (sele *Selection) Id() string {
	return sele.Name
}

func (sele *Selection) ListFiles() []string {
	lst := make([]string, 0, len(sele.Data))
	for k, v := range sele.Data {
		if v {
			lst = append(lst, k)
		}
	}
	return lst
}

func (sele *Selection) Search(q query.Query, b query.Block, s uint, matchcallback func(SearchResult), errorcallback func(error)) error {
	defer func() {
		if r := recover(); r != nil {
			errorcallback(fmt.Errorf("panic in search: %s", r))
		}
	}()
	for k, v := range sele.Data {
		if v {
			record := Super.Data[k]
			//errorcallback(fmt.Errorf("record of file:\n%s\n%s\n%s", record.Original, record.Tag, record.Set))
			metastring, err := record.GetSet()
			if err != nil {
				errorcallback(err)
				return err
			}
			//errorcallback(fmt.Errorf("length of metastring %d", len(metastring)))
			//errorcallback(fmt.Errorf("metastring prefix %s", metastring[:30]))
			if q.Check(metastring) {
				content, err := record.GetTagged()
				if err != nil {
					errorcallback(err)
					return err
				}
				//errorcallback(fmt.Errorf("length of content %d", len(content)))
				var matches map[uint]bool
				switch b {
				case query.Sentence:
					matches = q.MatchSentence(content, s)
				case query.Paragraph:
					matches = q.MatchParagraph(content, s)
				default:
					errorcallback(fmt.Errorf("unrecognized query block type"))
					return fmt.Errorf("unrecognized query block type")
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
	}
	return nil
}
