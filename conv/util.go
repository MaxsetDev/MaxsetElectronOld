package conv

import (
	"io"
	"os"
	"path/filepath"
	"strings"

	pdfcontent "github.com/unidoc/unidoc/pdf/contentstream"
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

		contentStreams, err := page.GetContentStreams()
		if err != nil {
			return "", err
		}

		for _, cstream := range contentStreams {
			var t string
			if t, err = pdfcontent.NewContentStreamParser(cstream).ExtractText(); err != nil {
				return "", err
			}
			// sb.WriteString("STREAM:\n")
			// sb.WriteString(cstream)
			// sb.WriteString("\nCONVERTED:\n")
			sb.WriteString(t)
			sb.WriteString("\n")
			//pageContentStrbuild.WriteByte('\n')
		}
		//pageContentStr := pageContentStrbuild.String()

		// cstreamParser := pdfcontent.NewContentStreamParser(pageContentStr)
		// txt, err := cstreamParser.ExtractText()
		// if err != nil {
		// 	return "", err
		// }

		// sb.WriteString(txt)
		sb.WriteString("\n\n")
	}

	return sb.String(), nil
}
