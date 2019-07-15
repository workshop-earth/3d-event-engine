// https://bl.ocks.org/Niekes/1c15016ae5b5f11508f92852057136b5

var
vizHolder 		= document.querySelector('#vizHolder'),
request 		= new XMLHttpRequest(),
datapath 		= '../data/data.json',
height 			= Math.max(document.documentElement.clientHeight, window.innerHeight || 0),
width 			= Math.max(document.documentElement.clientWidth, window.innerWidth || 0),
origin			= [width/2, 100],
j						= 6,
scale				= 40,
scatter			= [],
yLine			= [],
xGrid			= [],
beta			= 0,
alpha			= 0,
gridEdgeBuffer	= 25,
key				= function(d){ return d.id; },
startAngle		= Math.PI/5,
startAngleY		= startAngle,
startAngleX		= -startAngle / 5,
rotateCenter = [0,6,0];


var
quakeData,
mx,
my,
mouseX,
mouseY,
minLong,
minLat,
minDepth,
maxLong,
maxLat,
maxDepth,
cnt,
xScale,
zScale,
depthScale,
colorScale,
magScale;


//Data fetch
request.open('GET', datapath, true);
request.onload = function() {
	if (request.status >= 200 && request.status < 400) {
		console.log('Data received');
		quakeData = JSON.parse(request.responseText).quakes;
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


var svg = d3.select(vizHolder)
				.append('svg')
				.attr('height', height)
				.attr('width', width)
				.call(d3.drag().on('drag', dragged).on('start', dragStart).on('end', dragEnd))

var viz = svg.append('g')
				.attr('id', 'viz');


var grid3d = d3._3d()
		.shape('GRID', j*2)
		.origin(origin)
		.rotateY( startAngleY)
		.rotateX( startAngleX)
		.scale(scale)
		.rotateCenter(rotateCenter);

var point3d = d3._3d()
		.x(function(d){ return d.x; })
		.y(function(d){ return d.y; })
		.z(function(d){ return d.z; })
		.origin(origin)
		.rotateY( startAngleY)
		.rotateX( startAngleX)
		.scale(scale)
		.rotateCenter(rotateCenter);

var yScale3d = d3._3d()
		.shape('LINE_STRIP')
		.origin(origin)
		.rotateY( startAngleY)
		.rotateX( startAngleX)
		.scale(scale)
		.rotateCenter(rotateCenter);

function processData(data, tt) {
	/* ----------- GRID ----------- */
	var xGrid = viz.selectAll('path.grid').data(data[0], key);

	xGrid.enter()
			.append('path')
			.attr('class', '_3d grid')
			.merge(xGrid)
			.attr('fill', function(d){ return d.ccw ? 'white' : '#ffffff'; })
			.attr('fill-opacity', 0.4)
			.attr('d', grid3d.draw);


	xGrid.exit().remove();

	/* ----------- POINTS ----------- */
	var points = viz.selectAll('circle').data(data[1], key);

	points.enter()
			.append('circle')
			.attr('class', '_3d')
			.attr('opacity', 0)
			.attr('cx', posPointX)
			.attr('cy', posPointY)
			.merge(points)
			.transition().duration(tt)
			.attr('r', magPoint)
			.attr('fill', function(d){
				return colorScale(depthScale.invert(d.y));
			})
			.attr('opacity', 0.7)
			.attr('cx', posPointX)
			.attr('cy', posPointY);

	points.exit().remove();

	/* ----------- y-Scale ----------- */
	var yScale = viz.selectAll('path.yScale').data(data[2]);

	yScale.enter()
			.append('path')
			.attr('class', '_3d yScale')
			.merge(yScale)
			.attr('d', yScale3d.draw);

	yScale.exit().remove();

	/* ----------- y-Scale Text ----------- */
	var yText = viz.selectAll('text.yText').data(data[2][0]);

	yText.enter()
			.append('text')
			.attr('class', '_3d yText')
			.attr('dx', '-1em')
			.attr('dy', '1em')
			.attr('text-anchor', 'end')
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
				return d[1] >= 2 ? Math.round(depthScale.invert(d[1]) * 1) / 1 : '';
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
	return magScale(d.mag);
}

function init(){

	minLong		= d3.min(quakeData, function(d) { return + d.long;});
	minLat		= d3.min(quakeData, function(d) { return + d.lat;});
	minDepth	= d3.min(quakeData, function(d) { return + d.depth;});
	maxLong		= d3.max(quakeData, function(d) { return + d.long;});
	maxLat		= d3.max(quakeData, function(d) { return + d.lat;});
	maxDepth	= d3.max(quakeData, function(d) { return + d.depth;});
	colorScaleLight = "#FFE933";
	colorScaleDark = "#D60041";
	cnt = 0;

	xScale = d3.scaleLinear()
		.domain([minLong - gridEdgeBuffer, maxLong + gridEdgeBuffer])
		.range([-j, j - 1]);

	zScale = d3.scaleLinear()
		.domain([minLat - gridEdgeBuffer, maxLat + gridEdgeBuffer])
		.range([-j, j - 1]);

	magScale = d3.scaleLinear()
		.domain([0, 10])
		.range([5, 40]);

	var yScaleMin = 1;
	var yScaleMax = j * 2; // Match depth (Y) units to ~X/Z units
	var yScaleBuffer = 1;
	//Build scale for depth
	depthScale = d3.scaleLinear()
		.domain([minDepth, maxDepth])
		.range([yScaleMin + yScaleBuffer, yScaleMax - yScaleBuffer]);

	colorScale = d3.scaleLinear()
		.domain([minDepth, maxDepth])
		.range([colorScaleLight, colorScaleDark]);

	xGrid = [], scatter = [], yLine = [];
	for(var z = -j; z < j; z++){
		for(var x = -j; x < j; x++){
			xGrid.push([x, 1, z]);
			while (cnt < quakeData.length) {
				scatter.push({
					x:		xScale(quakeData[cnt].long),
					y:		depthScale(quakeData[cnt].depth),
					z:		zScale(quakeData[cnt].lat),
					mag:	quakeData[cnt].mag,
					id:		'point_' + cnt++
				});
			}
		}
	}

	d3.range(yScaleMin, yScaleMax, 1)
		.forEach(function(d) {
			yLine.push([-j, d, -j]);
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
		grid3d.rotateY(beta + startAngleY).rotateX(alpha + startAngleX)(xGrid),
		point3d.rotateY(beta + startAngleY).rotateX(alpha + startAngleX)(scatter),
		yScale3d.rotateY(beta + startAngleY).rotateX(alpha + startAngleX)([yLine]),
	];
	processData(data, 0);
}

function dragEnd(){
	mouseX = d3.event.x - mx + mouseX;
	mouseY = d3.event.y - my + mouseY;
}
