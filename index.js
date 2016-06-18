const pdfjs = require('pdfjs-dist');

const fs = require('fs');
var data = new Uint8Array(fs.readFileSync('./raw/soc/DeansList_0910.pdf'));

pdfjs.getDocument(data).then(function (pdfDocument) {
  pdfDocument.getPage(1).then((page) => {
    page.getTextContent().then((content) => {
      var strings = content.items.map(function (item) {
        console.log(item.str, item.transform);
        return JSON.stringify(item.transform);
      });
      // console.log(strings.join('\n'));
    });
  })
});
