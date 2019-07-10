var	vizHolder = document.querySelector('#vizHolder'),
		data,
		request = new XMLHttpRequest(),
		datapath = '../data/data.json',
		padding = 20,
		height = (vizHolder.offsetHeight - (padding * 2)),
		width = (vizHolder.offsetWidth - (padding * 2));

//Data fetch
request.open('GET', datapath, true);
request.onload = function() {
	if (request.status >= 200 && request.status < 400) {
		console.log('Data received');
		data = JSON.parse(request.responseText);
		init();
	} else { console.log('Reached our target server, but it returned an error'); }
};
request.onerror = function() { console.log('There was a connection error of some sort'); };
request.send();

function init() {
	var n = data.dataset.length;

	var xScale = d3.scaleLinear()
		.domain([0, n-1])
		.range([0, width - padding*2]);

	var yScale = d3.scaleLinear()
		.domain([0, 1])
		.range([height-padding, 0]);

	var svg = d3.select(vizHolder)
				.append('svg')
				.attr('height', height + padding)
				.attr('width', width + padding);

	var viz = svg.append('g')
				.attr('id', 'viz')
				.attr('transform', 'translate(' + padding + ', ' + padding + ')');

	viz.append("g")
		.attr("class", "x axis")
		.attr("transform", "translate(0," + (height-padding) + ")")
		.call(d3.axisBottom(xScale));

	viz.append("g")
		.attr("class", "y axis")
		.attr("transform", "translate(" + padding + ", 0)")
		.call(d3.axisLeft(yScale));

	var circles = viz.selectAll("circle")
		.data(data.dataset)
		.enter()
		.append("circle")
		.attr('r', 10)
		.attr('cx', function(d, i){
			return i*15
		})
		.attr('cy', function(d, i){
			return i*15
		});
}