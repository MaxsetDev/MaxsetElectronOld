package conv_test

import (
	"os"
	"testing"

	"maxset.io/devon/keynlp-gui/conv"
)

func TestPdfConversion(t *testing.T) {
	f, errr := os.Open("/home/calld/go/src/maxset.io/devon/pdftotexttest/Material List.pdf")
	if errr != nil {
		t.Fatal(errr.Error())
	}
	content, err := conv.ExtractPDFtoString(f)
	if err != nil {
		t.Fatal(err.Error())
	}
	t.Log(content)
	t.Fail()
}
