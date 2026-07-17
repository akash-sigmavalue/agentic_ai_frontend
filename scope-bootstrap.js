const fs = require('fs');
const postcss = require('postcss');
const prefixer = require('postcss-prefix-selector');

const css = fs.readFileSync('node_modules/bootstrap/dist/css/bootstrap.min.css', 'utf8');

const out = postcss().use(prefixer({
  prefix: '.bootstrap-scope',
  transform: function (prefix, selector, prefixedSelector, filePath, rule) {
    if (selector === ':root' || selector === 'html' || selector === 'body') {
      return prefix;
    }
    return prefixedSelector;
  }
})).process(css).css;

fs.writeFileSync('styles/scoped-bootstrap.css', out);
console.log('Successfully generated scoped-bootstrap.css');
