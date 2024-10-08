function Zipper() {
    this.files = [];   
}

Zipper.prototype.addFile = function (filename_s, content_s) {
    this.files.push({
        filename: filename_s,
        content: content_s
    });
};

Zipper.prototype.createZip = function () {
    var filenames = [];
    var contents = [];
    for (var file in this.files) {
        if (!this.files.hasOwnProperty(file)) continue;
        filenames.push(this.files[file].filename);
        contents.push(this.files[file].content);
    }
    return $.util.zipper.createZip(filenames, contents);
};