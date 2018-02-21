package manifest

import (
	"maxset.io/devon/keynlp/proc"
	"maxset.io/devon/knsearch/query"
)

type Manifest interface {
	AddFile(string, proc.Processor) error
	RemoveFile(string) error
	Id() string
	Search(q query.Query, b query.Block, s uint, matchcallback func(SearchResult), errorcallback func(error)) error
	ListFiles() []string
}

type SearchResult struct {
	Words     []string
	Paragraph uint
	Sentence  uint
	Document  string
}
