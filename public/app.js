// https://bl.ocks.org/Niekes/1c15016ae5b5f11508f92852057136b5

var vizHolder 			= document.querySelector('#vizHolder'),
		request 				= new XMLHttpRequest(),
		datapath 				= './data.json',
		height 					= Math.max(document.documentElement.clientHeight, window.innerHeight || 0),
		width 					= Math.max(document.documentElement.clientWidth, window.innerWidth || 0),
		j								= 6.5,
		scatter					= [],
		yLine						= [],
		xLine						= [],
		zLine						= [],
		xGrid						= [],
		beta						= 0,
		alpha						= 0,
		key							= function(d){ return d.id; },
		startAngle			= Math.PI/5,
		startAngleY			= startAngle,
		startAngleX			= -startAngle / 5,
		timeElapsed			= 0;

var uiMinMag			= document.querySelector('#minMag');
uiMinMag.value = uiMinMag.dataset.value;

// Uninitialized variables
var quakeData, data, origin, scale, mx, my, mouseX, mouseY, minZ, minX, gridEdgeBuffer, minDepth, maxZ, maxX, maxDepth, maxTime, cnt, xScale, zScale, depthScale, colorScale, minMag, magFloor, magScale, viz, grid3d, yScale3d, xScale3d, zScale3d, point3d, yScaleMax, rotateCenter;


//Data fetch
fetchData(uiMinMag.dataset.value);
function fetchData(minMag){
	request.open('GET', datapath, true);
	request.onload = function() {
		if (request.status >= 200 && request.status < 400) {
			console.log('Data received');
			quakeData = JSON.parse(request.responseText).quakes;
			magFloor = d3.min(quakeData, function(d) { return + d.mag;});
			quakeData = quakeData.filter(function(quake) {
				return quake.mag >= minMag;
			});
			if (quakeData.length > 1) {
				init(1000);
			} else {
				alert("Only one or fewer earthquake events found. This visualization requires at least two events. Please lower minimum magnitude");
			}
		} else { console.log('Reached our target server, but it returned an error'); }
	};
	request.onerror = function() { console.log('There was a connection error of some sort'); };
	request.send();
}


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


var updateInterval;
function animate(){
	updateInterval = setInterval(updateDataset, 100);
}
function updateDataset() {
	updateDataArray();
	processData(data, 0);
	timeElapsed++;
	console.log(timeElapsed);
	if (timeElapsed >= maxTime) {
		clearInterval(updateInterval);
	}
}

// Re-initialize visualization on window resize (debounced)
window.addEventListener('resize', debounce( function(){ init(0); } ), 250);

function init(dur) {
	var durAnimIn = dur;
	height 			= Math.max(document.documentElement.clientHeight, window.innerHeight || 0);
	width 			= Math.max(document.documentElement.clientWidth, window.innerWidth || 0);
	scale 			= Math.min(width * 0.045, 50);
	//Little bit of magic to get best visual center, offset 100px from top
	origin			= [width/1.86, 300];
	d3.select(vizHolder).selectAll("*").remove();


	minZ			= d3.min(quakeData, function(d) { return + d.z;});
	minX			= d3.min(quakeData, function(d) { return + d.x;});
	minDepth	= d3.min(quakeData, function(d) { return + d.y;});
	minMag		= d3.min(quakeData, function(d) { return + d.mag;});
	maxZ			= d3.max(quakeData, function(d) { return + d.z;});
	maxX			= d3.max(quakeData, function(d) { return + d.x;});
	maxDepth	= d3.max(quakeData, function(d) { return + d.y;});
	maxTime 	= d3.max(quakeData, function(d) { return + d.time;});

	var xMean = d3.mean(quakeData, function(d) { return + d.x;});
	var zMean = d3.mean(quakeData, function(d) { return + d.z;});
	var absX = Math.abs(minX - maxX);
	var absZ = Math.abs(minZ - maxZ);
	var absY = Math.abs(minDepth - maxDepth);
	var largerAbs = Math.max(absX, absZ);
	var rangeYRatio = absY / largerAbs;
	yScaleMax = (j * 2 - 1) * rangeYRatio;

	gridEdgeBuffer = Math.max(xMean, zMean);
	colorScaleLight = "#FFE933";
	colorScaleDark = "#D60041";
	cnt = 0;

	rotateCenter = [-1,yScaleMax/2,0];

	var svg = d3.select(vizHolder)
				.append('svg')
				.attr('height', height)
				.attr('width', width)
				.call(d3.drag().on('drag', dragged).on('start', dragStart).on('end', dragEnd))

	viz = svg.append('g')
				.attr('id', 'viz');

	grid3d = d3._3d()
		.shape('GRID', j*2)
		.origin(origin)
		.rotateY( startAngleY)
		.rotateX( startAngleX)
		.scale(scale)
		.rotateCenter(rotateCenter)
		.y(function(){
			return depthScale(0)
		});

	point3d = d3._3d()
		.x(function(d){ return d.x; })
		.y(function(d){ return d.y; })
		.z(function(d){ return d.z; })
		.origin(origin)
		.rotateY( startAngleY)
		.rotateX( startAngleX)
		.scale(scale)
		.rotateCenter(rotateCenter);

	yScale3d = d3._3d()
		.shape('LINE_STRIP')
		.origin(origin)
		.scale(scale)
		.rotateCenter(rotateCenter);

	xScale3d = d3._3d()
		.shape('LINE_STRIP')
		.origin(origin)
		.rotateY( startAngleY)
		.rotateX( startAngleX)
		.scale(scale)
		.rotateCenter(rotateCenter)
		.y(function(){
			return depthScale(0)
		});

	zScale3d = d3._3d()
		.shape('LINE_STRIP')
		.origin(origin)
		.rotateY( startAngleY)
		.rotateX( startAngleX)
		.scale(scale)
		.rotateCenter(rotateCenter)
		.y(function(){
			return depthScale(0)
		});


	xScale = d3.scaleLinear()
		.domain([minX - gridEdgeBuffer, maxX + gridEdgeBuffer])
		.range([-j, j - 1]);

	zScale = d3.scaleLinear()
		.domain([minZ - gridEdgeBuffer, maxZ + gridEdgeBuffer])
		.range([-j, j - 1]);


	//Modify outpute range of radii based on viewport size
	var magModifier = scale / 50;
	magScale = d3.scaleLinear()
		.domain([magFloor, 10])
		.range([2 * magModifier, 50 * magModifier]);


	//Build scale for depth
	var yScaleMin = 0;
	depthScale = d3.scaleLinear()
		.domain([minDepth, maxDepth])
		.range([yScaleMin, yScaleMax]);

	colorScale = d3.scaleLinear()
		.domain([minDepth, maxDepth])
		.range([colorScaleLight, colorScaleDark]);

	xGrid = [], scatter = [], yLine = [], xLine = [], zLine = [];
	for(var z = -j; z < j; z++){
		for(var x = -j; x < j; x++){
			xGrid.push([x, 1, z]);
			while (cnt < quakeData.length) {
				scatter.push({
					x:		xScale(quakeData[cnt].x),
					y:		depthScale(quakeData[cnt].y),
					z:		zScale(quakeData[cnt].z),
					mag:	quakeData[cnt].mag,
					time: quakeData[cnt].time,
					id:		'point_' + cnt++
				});
			}
		}
	}

	var yScaleBuffer	= 0.75;
	d3.range(yScaleMin, yScaleMax + yScaleBuffer, 0.8)
		.forEach(function(d) {
			yLine.push([-j, d, -j]);
		});

	d3.range(xScale(minX) - 1, xScale(maxX) + 1, 1)
		.forEach(function(d) {
			xLine.push([d, 0, -j]);
		});

	d3.range(zScale(minZ) - 1, zScale(maxZ) + 1, 1)
		.forEach(function(d) {
			zLine.push([-j, 0, d]);
		});

	updateDataArray();
	processData(data, dur);
	// animate();
}

function processData(data, tt) {
	/* ----------- GRID ----------- */
	var xGrid = viz.selectAll('path.grid').data(data[0], key);

	xGrid.enter()
			.append('path')
			.attr('class', '_3d grid grid-panel')
			.merge(xGrid)
			.attr('d', grid3d.draw);


	xGrid.exit().remove();

	/* ----------- POINTS ----------- */
	// var currentData = data[1].filter(quake => quake.time <= timeElapsed);
	// currentData.forEach(function(quake){
	// 	if (quake.time < timeElapsed) {
	// 		quake.expired = true;
	// 	}
	// });
	// console.log(currentData);
	// var points = viz.selectAll('circle').data(currentData, key);
	var points = viz.selectAll('circle').data(data[1], key);
	points.enter()
			.append('circle')
			.attr('class', function(d){
				var classStr = '_3d quake-point';
				if (d.expired) {
					console.log('expired');
					classStr += ' expired'
				}
				return classStr
			})
			// .attr('opacity', 1)
			.attr('cx', posPointX)
			.attr('cy', posPointY)
			.merge(points)
			// .transition().duration(tt)
			.attr('r', magPoint)
			.attr('fill', function(d){
				return colorScale(depthScale.invert(d.y));
			})
			.attr('opacity', 0)
			.attr('cx', posPointX)
			.attr('cy', posPointY);

	points.exit().transition().style('opacity', 0).duration(250).delay(500).remove();


	/* ----------- y-Scale ----------- */
	var yScale = viz.selectAll('path.yScale').data(data[2].y);
	yScale.enter()
			.append('path')
			.attr('class', '_3d yScale')
			.merge(yScale)
			.attr('d', yScale3d.draw);

	yScale.exit().remove();

	/* ----------- y-Scale Text ----------- */
	var yText = viz.selectAll('text.yText').data(data[2].y[0]);

	yText.enter()
			.append('text')
			.attr('class', '_3d yText')
			.attr('dx', '-1em')
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
				//Round and invert Y labels
				return (Math.round(depthScale.invert(d[1]) * -1) / 1);
			});

	yText.exit().remove();


	// Debugging scale relativity
		// Should remove all calculations if we don't want to display
	/* ----------- x-Scale Text ----------- */
	var xText = viz.selectAll('text.xText').data(data[2].x[0]);

	xText.enter()
			.append('text')
			.attr('class', '_3d xText')
			.attr('dx', '1em')
			.attr('text-anchor', 'middle')
			.style('display', function(){
				return rangeXVisible ? 'block' : 'none';
			})
			.merge(xText)
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
				//Round and invert X labels
				return (Math.round(xScale.invert(d[0]) * 1) / 1);
			});

	xText.exit().remove();


	// Debugging scale relativity
		// Should remove all calculations if we don't want to display
	/* ----------- z-Scale Text ----------- */
	var zText = viz.selectAll('text.zText').data(data[2].z[0]);

	zText.enter()
			.append('text')
			.attr('class', '_3d zText')
			.attr('dx', '-1em')
			.attr('dy', '0.4em')
			.attr('text-anchor', 'end')
			.style('display', function(){
				return rangeZVisible ? 'block' : 'none';
			})
			.merge(zText)
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
				//Round and invert Z labels
				return (Math.round(zScale.invert(d[2]) * 1) / 1);
			});

	zText.exit().remove();



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

function dragStart(){
	mx = d3.event.x;
	my = d3.event.y;
}

function dragged(){
	mouseX = mouseX || 0;
	mouseY = mouseY || 0;
	beta   = (d3.event.x - mx + mouseX) * Math.PI / 230 ;
	alpha  = (d3.event.y - my + mouseY) * Math.PI / 230  * (-1);
	updateDataArray();
	processData(data, 0);
}

function updateDataArray() {
	var axes = {
		x: xScale3d.rotateY(beta + startAngleY).rotateX(alpha + startAngleX)([xLine]),
		y: yScale3d.rotateY(beta + startAngleY).rotateX(alpha + startAngleX)([yLine]),
		z: zScale3d.rotateY(beta + startAngleY).rotateX(alpha + startAngleX)([zLine])
	};
	data = [
		grid3d.rotateY(beta + startAngleY).rotateX(alpha + startAngleX)(xGrid),
		point3d.rotateY(beta + startAngleY).rotateX(alpha + startAngleX)(scatter),
		axes
	];
}

function dragEnd(){
	mouseX = d3.event.x - mx + mouseX;
	mouseY = d3.event.y - my + mouseY;
}



// Quick debugging UI
var btnViewBottom = document.querySelector('#btnViewBottom');
var btnViewFront = document.querySelector('#btnViewFront');
var toggleRangeX = document.querySelector('#showRangeX');
var toggleRangeZ = document.querySelector('#showRangeZ');
var rangeXVisible = isRangeVisible(toggleRangeX);
var rangeZVisible = isRangeVisible(toggleRangeZ);


btnViewBottom.addEventListener('click', rBottom);
btnViewFront.addEventListener('click', rFront);

uiMinMag.addEventListener('change', function(e){
	e.target.dataset.value = e.target.value
	fetchData(uiMinMag.dataset.value);
});

function isRangeVisible(el) {
	return el.checked;
}

toggleRangeX.addEventListener('change', function(){
	if (rangeXVisible) {
		document.querySelectorAll('.xText').forEach(function(el){
			el.style.display = "none";
		});
	} else {
		document.querySelectorAll('.xText').forEach(function(el){
			el.style.display = "block";
		});
	}
	rangeXVisible = isRangeVisible(toggleRangeX);
});

toggleRangeZ.addEventListener('change', function(){
	if (rangeZVisible) {
		document.querySelectorAll('.zText').forEach(function(el){
			el.style.display = "none";
		});
	} else {
		document.querySelectorAll('.zText').forEach(function(el){
			el.style.display = "block";
		});
	}
	rangeZVisible = isRangeVisible(toggleRangeZ);
});

//Quick debug to rotate to visual bottom
function rBottom() {
	alpha  = -1.4478644403500787;
	beta   = -0.6283185307179586;
	updateDataArray();
	processData(data, 0);
}

//Quick debug to rotate to visual bottom
function rFront() {
	alpha  = 0.12293188644481799;
	beta   = -0.6283185307179586;
	updateDataArray();
	processData(data, 0);
}