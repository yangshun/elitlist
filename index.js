const pdfjs = require('pdfjs-dist');

const fs = require('fs');
var data = new Uint8Array(fs.readFileSync('./data/soc/DL1510.pdf'));

pdfjs.getDocument(data).then(function (pdfDocument) {
  pdfDocument.getPage(1).then((page) => {
    page.getTextContent().then((content) => {
      console.log(content);
      var strings = content.items.map(function (item) {
        return JSON.stringify(item.transform);
      });
      console.log(strings.join('\n'));
    });
  })
});
