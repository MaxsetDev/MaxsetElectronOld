package manifest

import (
	"maxset.io/devon/keynlp/proc"
	"maxset.io/devon/keynlp/types"
	"maxset.io/devon/knsearch/query"
)

type Manifest interface {
	AddFile(string, proc.Processor) error
	RemoveFile(string) error
	Id() string
	Search(q query.Query, b query.Block, s uint, matchcallback func(SearchResult), errorcallback func(error)) error
	ListFiles() []string
	GetTagged(fname string) ([]types.TaggedSent, error)
	GetSet(fname string) (string, error)
}

type SearchResult struct {
	Words     []string
	Paragraph uint
	Sentence  uint
	Document  string
	Name      string
	Matches   []int
}
