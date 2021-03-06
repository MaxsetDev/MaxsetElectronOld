package main

import (
	"os"
	"os/user"
	"flag"
	"log"

	bootstrap "github.com/asticode/go-astilectron-bootstrap"
	"github.com/asticode/go-astilog"
	"github.com/pkg/errors"

	"github.com/asticode/go-astilectron"
)

var (
	AppName string
	BuiltAt string
	debug   = flag.Bool("d", false, "enables the debug mode")
	w       *astilectron.Window
	threadCount = flag.Int("t", 4, "number of threads to create in worker pools")
)

func main() {
	flag.Parse()
	astilog.FlagInit()

	currentUser, err := user.Current()
	if err != nil {
		log.Fatalf("getting current user error: %s", err.Error())
	}
	os.Chdir(currentUser.HomeDir)

	astilog.Debugf("Running app built at %s", BuiltAt)
	if err := bootstrap.Run(bootstrap.Options{
		Asset: Asset,
		AstilectronOptions: astilectron.Options{
			AppName:            AppName,
			AppIconDarwinPath:  "resources/icon.incs",
			AppIconDefaultPath: "resources/icon.png",
		},
		Debug:    *debug,
		Homepage: "index.html",
		MenuOptions: []*astilectron.MenuItemOptions{{
			Label: astilectron.PtrStr("File"),
			SubMenu: []*astilectron.MenuItemOptions{
				{Label: astilectron.PtrStr("About")},
				{Role: astilectron.MenuItemRoleClose},
			},
		}},
		OnWait: func(_ *astilectron.Astilectron, iw *astilectron.Window, _ *astilectron.Menu, _ *astilectron.Tray, _ *astilectron.Menu) error {
			w = iw
			return nil
		},
		MessageHandler: handleMessages,
		RestoreAssets: RestoreAssets,
		WindowOptions: &astilectron.WindowOptions{
			BackgroundColor: astilectron.PtrStr("#333"),
			Center:          astilectron.PtrBool(true),
			Height:          astilectron.PtrInt(700),
			Width:           astilectron.PtrInt(700),
		},
	}); err != nil {
		astilog.Fatal(errors.Wrap(err, "running bootstrap failed"))
	}
}
