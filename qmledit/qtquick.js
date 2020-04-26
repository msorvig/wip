
// This file implements the Qt Quick Runtime JavaScript API.
//
// Basic usage is
//    qtQuick = new QtQuick({
//        container: some_container_element
//        onStatusChange: function(runState) {
//            console.log(status)
//        },
//        onWarning: function(warning) {
//            console.log(status)
//        }
//    });
// 
//    qtQuick.setSourceCode(qmlcode);
//    qtQuick.load();
//

function QtQuick(config)
{
    _config = config || {}

    _runState = undefined;

    _container = config["container"];
    _placeholder = undefined;
    _canvas = undefined;

    _sourceCode = undefined;
    _sourceUrl = undefined;

    _qtLoader = undefined;
    _quickRuntime = undefined

    this._createQuickRuntimeInstance = function() {

        if (this._quickRuntime !== undefined)
            return;

        // Create derived QtQuickRuntime class which overrides the
        // error and warning handlers on the base QtQuickRuntime class.
        var DerivedQtQuickRuntime = Module.QtQuickRuntime.extend("QtQuickRuntime", {
            onStatusChange: function(status) {
                this._setRunState(status == 0 ? this.RunState.Running : this.RunState.Error);

            }.bind(this),
            onWarning: function(warning) {
                if (config["onWarning"] !== undefined)
                    config["onWarning"](warning);
            }.bind(this)
        });

        this._quickRuntime = new DerivedQtQuickRuntime;
        this._quickRuntime.show();
    };

    this._updateSourceCode = function() {
        // This functions syncs the properties of the JS class with the
        // C++ runtime, but only if the runtime module is ready
        if (Module === undefined || Module.QtQuickRuntime === undefined) {
            console.log("_updateSourceCode with null Module"); // TODO error or not?
            return;
        }

        this._createQuickRuntimeInstance();

        if (this._sourceCode != undefined)
            this._quickRuntime.qmlSourceCode = this._sourceCode;
        if (this._sourceUrl != undefined)
            this._quickRuntime.qmlSourceUrl = this._sourceUrl;
    }


    this.RunState = {
        Created : 1,
        Loading : 2,
        Running : 3,
        Error : 4,
    };

    this._setRunState = function(runState) {
        if (this._runState == runState)
            return;
        this._runState = runState;
        if (config["onStatusChange"] !== undefined)
            config["onStatusChange"](runState);
    }

    this.runState = function() {
        if (this.RunState === undefined)
            return this.RunState.Created;
        return this._runState;
    };

    this.errors = function() {
        var errors = [];
        if (Module === undefined || Module.QtQuickRuntime === undefined)
            return errors;

        for (var i = 0; i < this._quickRuntime.errorCount(); ++i)
            errors.push(this._quickRuntime.error(i));
        return errors;
    };

    this.setSourceCode = function(sourceCode) {
        this._setRunState(this.RunState.Loading);
        this._sourceCode = sourceCode;
        this._sourceUrl = undefined;
        this._updateSourceCode();
    }

    this.setSourceUrl = function(sourceUrl) {
        this._setRunState(this.RunState.Loading);
        this._sourceUrl = sourceUrl;
        this._sourceCode = undefined;
        this._updateSourceCode();
    }
    this.setContainer = function(element) {
        this._container = element;
    }
    this.setPlaceHolder = function(element) {
        this._placeholder = element;
    }

    this.load = function() {
        this._setRunState(this.RunState.Loading);

        this._canvas = document.createElement("canvas");
        this._canvas.id = "qtquickruntime-canvas";
        this._canvas.style.width = "100%";
        this._canvas.style.height = "100%";
        this._container.appendChild(this._canvas);

        if (this._placeholder === undefined) {
            this._placeholder = document.createElement("div");
            this._placeholder.innerHTML = "Loading";
            this._placeholder.id = "qtquickruntime-placeholder";
            this._placeholder.style.width = "100%";
            this._placeholder.style.height = "100%";
        }
        this._container.appendChild(this._placeholder);

        _qtLoader = QtLoader({
            canvasElements: [this._canvas],
            showLoader: function(loaderStatus) {
                console.log("showLoader");
                this._placeholder.style.display = 'block';
                this._canvas.style.display = 'none';
            }.bind(this),
            showError: function(errorText) {
                console.log("error " + errorText);
                this._placeholder.style.display = 'block';
                this._canvas.style.display = 'none';
            }.bind(this),
            showExit: function() {
                console.log("exit");
                // qtLoader.exitCode
                // qtLoader.exitText
            }.bind(this),
            showCanvas: function() {

                // Perform initial source code update and render. ### The Module object is not defined at this point
                window.setTimeout(function() {
                    this._updateSourceCode();
                }.bind(this), 100);

                this._placeholder.style.display = 'none';
                this._canvas.style.display = 'block';
            }.bind(this),
        });
        _qtLoader.loadEmscriptenModule("qtquickruntime");
    }

    this.delete = function() {
        this._quickRuntime.delete();
        this._quickRuntime = undefined;
    }
}
