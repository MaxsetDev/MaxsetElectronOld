

general: main.go message.go resources/app/index.html resources/app/static/css/base.css resources/app/static/js/index.js
	astilectron-bundler -v
	chmod 0764 output/linux-amd64/keynlp_gui
	./output/linux-amd64/keynlp_gui -v -d