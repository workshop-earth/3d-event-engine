// https://bl.ocks.org/Niekes/1c15016ae5b5f11508f92852057136b5

var	vizHolder = document.querySelector('#vizHolder'),
		request = new XMLHttpRequest(),
		datapath = '../data/data.json',
		padding = 40,
		height,
		width,
		quakeData;


height = vizHolder.offsetHeight;
width = vizHolder.offsetWidth;


//Data fetch
request.open('GET', datapath, true);
request.onload = function() {
	if (request.status >= 200 && request.status < 400) {
		console.log('Data received');
		quakeData = JSON.parse(request.responseText);
		quakeData = quakeData.quakes;
		init();
	} else { console.log('Reached our target server, but it returned an error'); }
};
request.onerror = function() { console.log('There was a connection error of some sort'); };
request.send();


function debounce(func, wait, immediate) {
	let timeout;
	return function() {
		const context = this, args = arguments;
		const later = function() {
			timeout = null;
			if (!immediate) func.apply(context, args);
		};
		const callNow = immediate && !timeout;
		clearTimeout(timeout);
		timeout = setTimeout(later, wait);
		if (callNow) func.apply(context, args);
	};
};

var	origin					= [480, 300],
		j								= 7,
		scale						= 25,
		scatter					= [],
		yLine						= [],
		xGrid						= [],
		beta						= 0,
		alpha						= 0,
		gridEdgeBuffer	= 25,
		key							= function(d){ return d.id; },
		startAngle			= Math.PI/7;

var svg = d3.select(vizHolder)
				.append('svg')
				.attr('height', height)
				.attr('width', width)
				.call(d3.drag().on('drag', dragged).on('start', dragStart).on('end', dragEnd))

var viz = svg.append('g')
				.attr('id', 'viz')
				.attr('transform', 'translate(' + padding + ', ' + padding + ')');

var mx, my, mouseX, mouseY;

var grid3d = d3._3d()
		.shape('GRID', j*2)
		.origin(origin)
		.rotateY( startAngle)
		.rotateX(-startAngle)
		.scale(scale);

var point3d = d3._3d()
		.x(function(d){ return d.x; })
		.y(function(d){ return d.y; })
		.z(function(d){ return d.z; })
		.origin(origin)
		.rotateY( startAngle)
		.rotateX(-startAngle)
		.scale(scale);

var yScale3d = d3._3d()
		.shape('LINE_STRIP')
		.origin(origin)
		.rotateY(startAngle)
		.rotateX(-startAngle)
		.scale(scale);


var	minLong,
		minLat,
		minDepth,
		maxLong,
		maxLat,
		maxDepth,
		cnt;

var xScale,
		zScale;

function processData(data, tt){
	/* ----------- GRID ----------- */
	var xGrid = viz.selectAll('path.grid').data(data[0], key);

	xGrid.enter()
			.append('path')
			.attr('class', '_3d grid')
			.merge(xGrid)
			.attr('stroke', 'gray')
			.attr('stroke-width', 0.3)
			.attr('fill', function(d){ return d.ccw ? 'whitesmoke' : '#717171'; })
			.attr('fill-opacity', 0.9)
			.attr('d', grid3d.draw);


	xGrid.exit().remove();

	/* ----------- POINTS ----------- */
	var points = viz.selectAll('circle').data(data[1], key);

	points.enter()
			.append('circle')
			.attr('class', '_3d foobar')
			.attr('opacity', 0)
			.attr('cx', posPointX)
			.attr('cy', posPointY)
			.merge(points)
			.transition().duration(tt)
			.attr('r', magPoint)
			.attr('fill', 'blue')
			.attr('opacity', 0.3)
			.attr('cx', posPointX)
			.attr('cy', posPointY);

	// debugger;

	points.exit().remove();

	/* ----------- y-Scale ----------- */
	var yScale = viz.selectAll('path.yScale').data(data[2]);

	yScale.enter()
			.append('path')
			.attr('class', '_3d yScale')
			.merge(yScale)
			.attr('stroke', 'black')
			.attr('stroke-width', .5)
			.attr('d', yScale3d.draw);

	yScale.exit().remove();

	/* ----------- y-Scale Text ----------- */
	var yText = viz.selectAll('text.yText').data(data[2][0]);

	yText.enter()
			.append('text')
			.attr('class', '_3d yText')
			.attr('dx', '.3em')
			.merge(yText)
			.each(function(d){
				d.centroid = {x: d.rotated.x, y: d.rotated.y, z: d.rotated.z};
			})
			.attr('x', function(d){
				return d.projected.x;
			})
			.attr('y', function(d){
				return d.projected.y;
			})
			.text(function(d){
				return d[1] <= 0 ? d[1] : '';
			});

	yText.exit().remove();

	d3.selectAll('._3d').sort(d3._3d().sort);
}

	function posPointX(d){
		return d.projected.x;
	}

	function posPointY(d){
		return d.projected.y;
	}

	function magPoint(d){
		return d.mag;
	}

	function init(){

	minLong		= d3.min(quakeData, function(d) { return + d.long;});
	minLat		= d3.min(quakeData, function(d) { return + d.lat;});
	minDepth	= d3.min(quakeData, function(d) { return + d.depth;});
	maxLong		= d3.max(quakeData, function(d) { return + d.long;});
	maxLat		= d3.max(quakeData, function(d) { return + d.lat;});
	maxDepth	= d3.max(quakeData, function(d) { return + d.depth;});
	cnt = 0;

	xScale = d3.scaleLinear()
		.domain([minLong - gridEdgeBuffer, maxLong + gridEdgeBuffer])
		.range([-j, j - 1]);

	zScale = d3.scaleLinear()
		.domain([minLat - gridEdgeBuffer, maxLat + gridEdgeBuffer])
		.range([-j, j - 1]);


	xGrid = [], scatter = [], yLine = [];
	for(var z = -j; z < j; z++){
		for(var x = -j; x < j; x++){
			xGrid.push([x, 1, z]);
			while (cnt < quakeData.length) {
				scatter.push({
					x:		xScale(quakeData[cnt].long),
					y:		quakeData[cnt].depth,
					z:		zScale(quakeData[cnt].lat),
					mag:	quakeData[cnt].mag,
					id:		'point_' + cnt++
				});
			}
		}
	}

	d3.range(-1, 11, 1)
		.forEach(function(d) {
			yLine.push([-j, -d, -j]);
		});

	var data = [
		grid3d(xGrid),
		point3d(scatter),
		yScale3d([yLine]),
	];

	processData(data, 1000);
}

function dragStart(){
	mx = d3.event.x;
	my = d3.event.y;
}

function dragged(){
	mouseX = mouseX || 0;
	mouseY = mouseY || 0;
	beta   = (d3.event.x - mx + mouseX) * Math.PI / 230 ;
	alpha  = (d3.event.y - my + mouseY) * Math.PI / 230  * (-1);
	var data = [
		grid3d.rotateY(beta + startAngle).rotateX(alpha - startAngle)(xGrid),
		point3d.rotateY(beta + startAngle).rotateX(alpha - startAngle)(scatter),
		yScale3d.rotateY(beta + startAngle).rotateX(alpha - startAngle)([yLine]),
	];
	processData(data, 0);
}

function dragEnd(){
	mouseX = d3.event.x - mx + mouseX;
	mouseY = d3.event.y - my + mouseY;
}
