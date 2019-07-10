var	visHolder = document.querySelector('#vizHolder'),
		data,
		request = new XMLHttpRequest(),
		datapath = '../data/data.json';

//Data fetch
request.open('GET', datapath, true);
request.onload = function() {
	if (request.status >= 200 && request.status < 400) {
		console.log('Data received');
		data = JSON.parse(request.responseText);
	} else { console.log('Reached our target server, but it returned an error'); }
};
request.onerror = function() { console.log('There was a connection error of some sort'); };
request.send();


//Init
var svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
svg.setAttribute('id', 'viz');
svg.setAttributeNS("http://www.w3.org/2000/xmlns/", "xmlns:xlink", "http://www.w3.org/1999/xlink");
visHolder.appendChild(svg);