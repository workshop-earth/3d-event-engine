var visHolder = document.querySelector('#vizHolder');
// var data = require('./data/data.json');

console.log(d3);
// console.log(data);

var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
svg.setAttribute('id', 'viz');
svg.setAttributeNS("http://www.w3.org/2000/xmlns/", "xmlns:xlink", "http://www.w3.org/1999/xlink");
visHolder.appendChild(svg);