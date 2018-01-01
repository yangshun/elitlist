const _ = require('lodash');

function nameFormatter(name) {
  const formattedName = name
    .trim()
    .replace(/\s*-\s*/g, '-')
    .replace(/’/g, "'")
    .replace(/‐/g, '-')
    .replace(/\n/g, ' ')
    .split(' ')
    .filter(function(fragment) {
      return !_.isEmpty(fragment);
    })
    .map(fragment => {
      var newFragment = fragment.trim();
      if (fragment !== 'S/O' && fragment !== 'D/O') {
        // If not S/O or D/O, capitalize first letter
        newFragment =
          fragment[0] === '('
            ? `(${fragment[1].toUpperCase()}${fragment
                .substring(2)
                .toLowerCase()}`
            : _.capitalize(fragment);
      }
      return newFragment;
    })
    .join(' ')
    .trim();
  return formattedName;
}

module.exports = nameFormatter;
