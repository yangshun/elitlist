const pdfjs = require('pdfjs-dist');

const fs = require('fs');
var data = new Uint8Array(fs.readFileSync('./raw/eng/Dean\'s_List_AY2010-11_Sem_2.pdf'));

pdfjs.getDocument(data).then(function (pdfDocument) {
  const numPages = pdfDocument.numPages;
  const rows = {};
  Promise.all(_.range(1, numPages + 1).map(function (pageNum) {
    console.log(pageNum);
    return new Promise(function (resolve, reject) {
      pdfDocument.getPage(pageNum).then((page) => {
        page.getTextContent().then((content) => {
          content.items.map(function (item) {
            const rowId = `${pageNum}-${item.transform[5]}`;
            if (!rows.hasOwnProperty(rowId)) {
              rows[rowId] = [];
            }
            rows[rowId].push(item.str);
          });
          resolve();
        });
      });
    });
  })).then(function () {
    console.log(rows);
  });
});
