package conv

import (
	"io"
	"os"
	"path/filepath"
	"strings"

	"github.com/unidoc/unidoc/pdf/extractor"
	pdf "github.com/unidoc/unidoc/pdf/model"
)

func FileToString(fpath string) (content string, err error) {
	var f *os.File
	f, err = os.Open(fpath)
	if err != nil {
		return "", err
	}
	switch filepath.Ext(fpath) {
	case ".txt":
		sb := new(strings.Builder)
		_, err = io.Copy(sb, f)
		if err != nil {
			return "", err
		}
		content = sb.String()
	case ".pdf":
		content, err = ExtractPDFtoString(f)
		if err != nil {
			return "", err
		}
	}
	return
}

func ExtractPDFtoString(r io.ReadSeeker) (string, error) {
	var sb strings.Builder
	pdfReader, err := pdf.NewPdfReader(r)
	if err != nil {
		return "", err
	}
	isEncrypted, err := pdfReader.IsEncrypted()
	if err != nil {
		return "", err
	}
	if isEncrypted {
		_, err = pdfReader.Decrypt([]byte(""))
		if err != nil {
			return "", err
		}
	}

	numPages, err := pdfReader.GetNumPages()
	if err != nil {
		return "", err
	}

	for i := 0; i < numPages; i++ {
		pageNum := i + 1
		page, err := pdfReader.GetPage(pageNum)
		if err != nil {
			return "", err
		}

		ex, err := extractor.New(page)
		if err != nil {
			return "", err
		}

		text, err := ex.ExtractText()
		if err != nil {
			return "", err
		}

		sb.WriteString(text)
		sb.WriteString("\n\n")
	}

	return sb.String(), nil
}

func StringHTMLEscape(pre string) string {
	var post strings.Builder
	for _, char := range pre {
		switch char {
		case '<':
			post.WriteString("&lt;")
		case '>':
			post.WriteString("&gt;")
		case '"':
			post.WriteString("&quot;")
		case '&':
			post.WriteString("&amp;")
		case '’':
			fallthrough
		case '\'':
			post.WriteString("&#39")
		default:
			post.WriteRune(char)
		}
	}
	return post.String()
}
