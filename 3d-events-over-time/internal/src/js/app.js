// https://bl.ocks.org/Niekes/1c15016ae5b5f11508f92852057136b5

// Uninitialized variables
var faultPlane;

var space = {
	grid3d: null,
	unit: 6.5,
	point3d: null,
	xGrid: null,
	scatter: null,
	yLine: null,
	xLine: null,
	zLine: null,
	buffer: null
}

var svg = {
	root: null,
	viz: null,
	hit: null,
	timeline: null,
	playhead: null
}

//**TODO: refactor min magnitude input into inputs object
	// Treat filtering the same as history (on point plot instead of refetching every time)
var inputs = {
	maxHist: null
}

var appData = {
	quakeRaw: null,
	faultRaw: null,
	formatted: null,
	xFloor: null,
	xCeil: null,
	zFloor: null,
	zCeil: null,
	xMean: null,
	zMean: null,
	yFloor: null,
	yCeil: null,
	yScaleMax: null,
	yScaleMin: null,
	magFloor: null,
	magCeil: null,
	timeFloor: null,
	timeCeil: null
}

var viewport = {
	height: null,
	width: null,
	scale: null
}

var timelineConfig = {
	bg: null,
	hist: null,
	label: null,
	axis: null,
	pad: null,
	unit: 1/60/60 // Convert playback scale to hours
}

var scale2d = {
	larger: null,
	depth: null,
	color: null,
	mag: null,
	time: null,
	scrub: null
}

var scale3d = {
	x: null,
	y: null,
	z: null
}

var orbit = {
	startAngle: Math.PI/5,
	startAngleY: function() {
		return this.startAngle;
	},
	startAngleX: function() {
		return (this.startAngle / 5) * -1;
	},
	alpha: 0,
	beta: 0,
	mx: null,
	my: null,
	mouseX: null,
	mouseY: null,
	rotateCenter: null
}

var scrub = {
	startX: null,
	newX: null
}


function generateBounds() {
	appData.xFloor = d3.min(appData.quakeRaw, function(d) { return + d.x;});
	appData.xCeil = d3.max(appData.quakeRaw, function(d) { return + d.x;});

	appData.zFloor = d3.min(appData.quakeRaw, function(d) { return + d.z;});
	appData.zCeil = d3.max(appData.quakeRaw, function(d) { return + d.z;});

	appData.xMean = d3.mean(appData.quakeRaw, function(d) { return + d.x;});
	appData.zMean = d3.mean(appData.quakeRaw, function(d) { return + d.z;});

	appData.yFloor = d3.min(appData.quakeRaw, function(d) { return + d.y;});
	appData.yCeil = d3.max(appData.quakeRaw, function(d) { return + d.y;});

	appData.magFloor = d3.min(appData.quakeRaw, function(d) { return + d.mag;});
	appData.magCeil = d3.max(appData.quakeRaw, function(d) { return + d.mag;});

	appData.timeFloor = d3.min(appData.quakeRaw, function(d) { return + d.time;});
	appData.timeCeil = d3.max(appData.quakeRaw, function(d) { return + d.time;});

	var absX = Math.abs(appData.xFloor - appData.xCeil);
	var absZ = Math.abs(appData.zFloor - appData.zCeil);
	var absY = Math.abs(appData.yFloor - appData.yCeil);
	var largerAbs = Math.max(absX, absZ);
	appData.largerAxis = function(){
		return (absX >= absZ) ? 'x' : 'z';
	}

	var rangeYRatio = absY / largerAbs;
	appData.yScaleMax = (space.unit * 2 - 1) * rangeYRatio;
	space.buffer = Math.max(appData.xMean, appData.zMean);

	enableMagInput();
}


function debounce(func, wait, immediate) {
	var timeout;
	return function() {
		var context = this, args = arguments;
		var later = function() {
			timeout = null;
			if (!immediate) func.apply(context, args);
		};
		var callNow = immediate && !timeout;
		clearTimeout(timeout);
		timeout = setTimeout(later, wait);
		if (callNow) func.apply(context, args);
	};
};


var anim = {
	'start': null,
	'progress': null,
	'endtime': 20000,
	'req': null
}
function step(timestamp) {
	if (!anim.start) anim.start = timestamp;
		anim.progress = timestamp - anim.start;
		updateDataArray();
		movePlayhead();
	if (anim.progress < anim.endtime) {
		anim.req = requestAnimationFrame(step);
	}
}

// Rerun sizeing/scaling on window resize (debounced)
window.addEventListener('resize', debounce( function(){ sizeScale(); } ), 250);

function init() {
	// Kill existing RAF if restarting animation
	if (anim.req != null) {
		cancelAnimationFrame(anim.req);
		anim.start = null;
		anim.progress = null;
	}

	var vizHolder	= document.querySelector('#vizHolder');

	var	cnt = 0,
			colorScaleLight = '#8ded26',
			colorScaleMid = "#FFE933",
			colorScaleDark = "#D60041";

	// Dump everything before initializing
	d3.select(vizHolder).selectAll("*").remove();

	svg.root = d3.select(vizHolder)
				.append('svg')

	svg.viz = svg.root.append('g')
				.attr('id', 'viz');

	// Apply orbit controls to an overlay for better UI with playhead controls
	svg.hit = svg.root.append('rect')
		.attr('x', 0)
		.attr('y', 0)
		.attr('class', 'viz-hit')
		.call(d3.drag()
			.on('drag', dragged)
			.on('start', dragStart)
			.on('end', dragEnd));

	svg.timeline = svg.root.append('g')
			.attr('id', 'timeline')

	initTimelineUI();
	sizeScale();

	// Set scales which are independent from viz size
		// Color/Time/Depth
	scale2d.color = d3.scaleLinear()
		.domain([appData.timeFloor, d3.mean(appData.quakeRaw, function(d) { return + d.time;}) , appData.timeCeil])
		.range([colorScaleDark, colorScaleMid, colorScaleLight]);

	scale2d.time = d3.scaleLinear()
		.domain([appData.timeFloor, appData.timeCeil])
		.range([0, anim.endtime]);

	appData.yScaleMin = 0;
	scale2d.depth = d3.scaleLinear()
		.domain([appData.yFloor, appData.yCeil])
		.range([appData.yScaleMin, appData.yScaleMax]);

	space.xGrid = [], space.scatter = [], space.yLine = [], space.xLine = [], space.zLine = [], faultPlane = [];
	for(var z = -space.unit; z < space.unit; z++){
		for(var x = -space.unit; x < space.unit; x++){
			space.xGrid.push([x, 1, z]);
			while (cnt < appData.quakeRaw.length) {
				space.scatter.push({
					x:		scale2d.larger(appData.quakeRaw[cnt].x),
					y:		scale2d.depth(appData.quakeRaw[cnt].y),
					z:		scale2d.larger(appData.quakeRaw[cnt].z),
					mag:	appData.quakeRaw[cnt].mag,
					time: appData.quakeRaw[cnt].time,
					id:		'point_' + cnt++
				});
			}
		}
	}

	var yScaleBuffer	= 0.75;
	d3.range(appData.yScaleMin, appData.yScaleMax + yScaleBuffer, 0.8)
		.forEach(function(d) {
			space.yLine.push([-space.unit, d, -space.unit]);
		});

	// Keeps positioning relative in both dimensions on a square grid
	if (appData.largerAxis() == 'x') {
		d3.range(scale2d.larger(appData.xFloor), scale2d.larger(appData.xCeil), 1)
			.forEach(function(d) {
				space.xLine.push([d, 0, -space.unit]);
			});

		d3.range(scale2d.larger(appData.xFloor), scale2d.larger(appData.xCeil), 1)
			.forEach(function(d) {
				space.zLine.push([-space.unit, 0, d]);
			});
	} else if (appData.largerAxis() == 'z') {
		d3.range(scale2d.larger(appData.zFloor), scale2d.larger(appData.zCeil), 1)
			.forEach(function(d) {
				space.xLine.push([d, 0, -space.unit]);
			});

		d3.range(scale2d.larger(appData.zFloor), scale2d.larger(appData.zCeil), 1)
			.forEach(function(d) {
				space.zLine.push([-space.unit, 0, d]);
			});
	} else {
		console.log('Could not resolve x/z axis ranges');
	}

	// **TODO: Get real fault data into fault-data.json
	appData.faultRaw.forEach(function(point){
		var arr = [scale2d.larger(point.x), scale2d.depth(point.y), scale2d.larger(point.z)];
		faultPlane.push(arr);
	});

	// Start RAF loop
	anim.req = requestAnimationFrame(step);
}


function sizeScale() {
	viewport.height = Math.max(document.documentElement.clientHeight, window.innerHeight || 0);
	viewport.width = Math.max(document.documentElement.clientWidth, window.innerWidth || 0);
	viewport.scale	= Math.min(viewport.width * 0.045, 50);

	//Little bit of magic to get best visual center
	origin = [viewport.width/2, viewport.height/3.25];

	// Programmatically rotate around centerpoint of dynamic grid
	orbit.rotateCenter = [0, (appData.yScaleMax / 2) ,0];

	svg.root.attr('height', viewport.height)
			.attr('width', viewport.width)

	svg.hit.attr('height', viewport.height)
					.attr('width', viewport.width)

	space.grid3d = d3._3d()
		.shape('GRID', space.unit * 2)
		.origin(origin)
		.rotateY( orbit.startAngleY())
		.rotateX( orbit.startAngleX())
		.scale(viewport.scale)
		.rotateCenter(orbit.rotateCenter)
		.y(function(){
			return scale2d.depth(0)
		});

	space.point3d = d3._3d()
		.x(function(d){ return d.x; })
		.y(function(d){ return d.y; })
		.z(function(d){ return d.z; })
		.origin(origin)
		.rotateY( orbit.startAngleY())
		.rotateX( orbit.startAngleX())
		.scale(viewport.scale)
		.rotateCenter(orbit.rotateCenter);

	scale3d.y = d3._3d()
		.shape('LINE_STRIP')
		.origin(origin)
		.scale(viewport.scale)
		.rotateCenter(orbit.rotateCenter);

	scale3d.x = d3._3d()
		.shape('LINE_STRIP')
		.origin(origin)
		.rotateY( orbit.startAngleY())
		.rotateX( orbit.startAngleX())
		.scale(viewport.scale)
		.rotateCenter(orbit.rotateCenter)
		.y(function(){
			return scale2d.depth(0)
		});

	scale3d.z = d3._3d()
		.shape('LINE_STRIP')
		.origin(origin)
		.rotateY( orbit.startAngleY())
		.rotateX( orbit.startAngleX())
		.scale(viewport.scale)
		.rotateCenter(orbit.rotateCenter)
		.y(function(){
			return scale2d.depth(0)
		});

	scale3d.fault = d3._3d()
		.shape('PLANE')
		.origin(origin)
		.rotateY( orbit.startAngleY())
		.rotateX( orbit.startAngleX())
		.scale(viewport.scale)
		.rotateCenter(orbit.rotateCenter)

	// Create a single scale for x/z axes based on the larger range
		// Keeps positioning relative in both dimensions on a square grid
	if (appData.largerAxis() == 'x') {
		scale2d.larger = d3.scaleLinear()
			.domain([appData.xFloor - space.buffer, appData.xCeil + space.buffer])
			.range([-space.unit, space.unit - 1]);
	} else if (appData.largerAxis() == 'z') {
		scale2d.larger = d3.scaleLinear()
			.domain([appData.zFloor - space.buffer, appData.zCeil + space.buffer])
			.range([-space.unit, space.unit - 1]);
	} else {
		console.log('Could not resolve x/z axis ranges');
	}

	//Modify output range of radii based on viewport size
	var magModifier = viewport.scale / 50;
	scale2d.mag = d3.scaleLinear()
		.domain([appData.magFloor, 10])
		.range([2 * magModifier, 25 * magModifier]);

	timelineConfig.pad = viewport.width * .1;
	scale2d.timeline = d3.scaleLinear()
		.domain([appData.timeFloor * timelineConfig.unit, appData.timeCeil * timelineConfig.unit])
		.range([0, viewport.width - timelineConfig.pad * 2]);

	scale2d.scrub = d3.scaleLinear()
		.domain([timelineConfig.pad, viewport.width - timelineConfig.pad])
		.range([0, anim.endtime])
		.clamp(true);

	const axisTime = d3.axisBottom(scale2d.timeline)
									.ticks(30);
	let timelineH = 125;

	svg.timeline.attr("transform", "translate(0," + (viewport.height - timelineH) + ")");
	timelineConfig.bg.attr('x', timelineConfig.pad)
						.attr('width', viewport.width - (timelineConfig.pad * 2))
						.attr('height', timelineH);

	timelineConfig.hist.attr('width', 1)

	timelineConfig.label.attr('x', viewport.width / 2);

	timelineConfig.axis.attr('transform', 'translate(' + timelineConfig.pad + ', 0)')
							.call(axisTime);
}

function processData(data, tt) {
	var key	= function(d){ return d.id; };

	/* ----------- GRID ----------- */
	var grid = svg.viz.selectAll('path.grid').data(appData.formatted[0], key);

	grid.enter()
			.append('path')
			.attr('class', '_3d grid grid-panel')
			.merge(grid)
			.attr('d', space.grid3d.draw);

	grid.exit().remove();

	/* ----------- POINTS ----------- */
	// Filter data based on time/progress and active history range, controlling array over time
	var currentData = appData.formatted[1].filter(function(quake){
		if (inputs.maxHist != null) {
			// If history has input, limit filter to a min/max
			var historyPoint = (scale2d.time.invert(anim.progress) - (inputs.maxHist / timelineConfig.unit));
			if (quake.time <= scale2d.time.invert(anim.progress) && quake.time >= historyPoint) {
				return quake.time <= scale2d.time.invert(anim.progress)
			}
		} else {
			// No history input, only accumulate array over time
			return quake.time <= scale2d.time.invert(anim.progress)
		}
	});
	updateEventCount(currentData.length);
	var points = svg.viz.selectAll('circle').data(currentData, key);
	points.enter()
			.append('circle')
			.attr('class', '_3d quake-point')
			.attr('cx', posPointX)
			.attr('cy', posPointY)
			.attr('r', magPoint)
			.attr('fill', function(d){
				return scale2d.color(d.time);
			})
			.merge(points)
			.attr('cx', posPointX)
			.attr('cy', posPointY);

	points.exit().remove();

	/* ----------- Fault Plane ----------- */
	var faultPlane = svg.viz.selectAll('path.fault').data(appData.formatted[3]);
	faultPlane.enter()
			.append('path')
			.attr('class', '_3d fault')
			.merge(faultPlane)
			.attr('d', scale3d.fault.draw);

	faultPlane.exit().remove();

	/* ----------- y-Scale ----------- */
	var yScale = svg.viz.selectAll('path.yScale').data(appData.formatted[2].y);
	yScale.enter()
			.append('path')
			.attr('class', '_3d yScale')
			.merge(yScale)
			.attr('d', scale3d.y.draw);

	yScale.exit().remove();

	/* ----------- y-Scale Text ----------- */
	var yText = svg.viz.selectAll('text.yText').data(appData.formatted[2].y[0]);

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
				return -(Math.round(scale2d.depth.invert(d[1]) / 1000 * 10) / 10);
			});

	yText.exit().remove();


	// Debugging scale relativity
		// Should remove all calculations if we don't want to display
	/* ----------- x-Scale Text ----------- */
	var xText = svg.viz.selectAll('text.xText').data(appData.formatted[2].x[0]);

	xText.enter()
			.append('text')
			.attr('class', '_3d xText')
			.attr('dy', '-1em')
			.attr('text-anchor', 'middle')
			.style('display', function(){
				return isRangeVisible(document.querySelector('#showRangeX')) ? 'block' : 'none';
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
				return (Math.round(scale2d.larger.invert(d[0]) / 1000 * 10) / 10);
			});

	xText.exit().remove();

	// Debugging scale relativity
		// Should remove all calculations if we don't want to display
	/* ----------- z-Scale Text ----------- */
	var zText = svg.viz.selectAll('text.zText').data(appData.formatted[2].z[0]);

	zText.enter()
			.append('text')
			.attr('class', '_3d zText')
			.attr('dy', '-1em')
			.attr('text-anchor', 'end')
			.style('display', function(){
				return isRangeVisible(document.querySelector('#showRangeZ')) ? 'block' : 'none';
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
				return (Math.round(scale2d.larger.invert(d[2]) / 1000 * 10) / 10);
			});

	zText.exit().remove();

	d3.selectAll('._3d').sort(d3._3d().sort);
}


function initTimelineUI() {
	// Initialize the timeline component
		// Sizing/scaling handled on resize
	var playheadY = -35;
	timelineConfig.bg = svg.timeline.append('rect')
			.attr('y', playheadY)
			.attr('class', 'timeline-bg')
			.call(d3.drag()
						.on('drag', timeDragged)
						.on('start', timeDragStart))

	timelineConfig.hist = svg.timeline.append('rect')
			.attr('y', playheadY)
			.attr('height', -playheadY)
			.attr('class', 'timeline-history cant-touch')

	timelineConfig.label = svg.timeline.append('text')
			.text('Hours from primary event')
			.attr('y', '50')
			.attr('text-anchor', 'middle')
	timelineConfig.axis = svg.timeline.append('g')
			.attr("id", "timeAxis")

	svg.playhead = svg.timeline.append('g')
					.attr('id', 'playhead')
					.attr('class', 'cant-touch')

	svg.playhead.append('path').attr('d', 'M5,21.38a1.5,1.5,0,0,1-1.15-.54l-3-3.6a1.5,1.5,0,0,1-.35-1V3A2.5,2.5,0,0,1,3,.5H7A2.5,2.5,0,0,1,9.5,3V16.28a1.5,1.5,0,0,1-.35,1l-3,3.6A1.5,1.5,0,0,1,5,21.38Z')
					.attr('class', 'playhead-body')
	svg.playhead.append('path').attr('d', 'M3,7.5H7')
					.attr('class', 'playhead-stroke')
	svg.playhead.append('path').attr('d', 'M3,9.5H7')
					.attr('class', 'playhead-stroke')
	svg.playhead.append('path').attr('d', 'M3,11.5H7')
					.attr('class', 'playhead-stroke')
}

function movePlayhead(){
	var playheadW = 10;
	var hoursElapsed = scale2d.time.invert(anim.progress) * timelineConfig.unit;
	var playheadPosX = (timelineConfig.pad - (playheadW/2)) + scale2d.timeline(hoursElapsed);
	var playheadPosY = -30;
	svg.playhead.attr('transform', 'translate(' + playheadPosX + ', ' + playheadPosY + ')');

	moveHistory(playheadPosX + (playheadW/2), hoursElapsed);
}

function moveHistory(pos, elapsed){
	var historyScale;
	var historyX = timelineConfig.pad;
	if (inputs.maxHist == null || inputs.maxHist > elapsed) {
		// If history is not specified, or exceeds current playhead, scale from 0 position
		historyScale = scale2d.scrub.invert(anim.progress) - timelineConfig.pad;
	} else {
		// Scale history UI accordingly and move position with playhead
		historyScale = scale2d.scrub.invert(scale2d.time(inputs.maxHist / timelineConfig.unit)) - timelineConfig.pad;
		historyX = pos - historyScale;
	}
	timelineConfig.hist.attr('transform', 'translate(' + historyX + ') scale(' + historyScale + ', 1)')
}

function posPointX(d) { return d.projected.x; }
function posPointY(d) { return d.projected.y; }
function magPoint (d) { return scale2d.mag(d.mag); }

function updateDataArray() {
	var axes = {
		x: scale3d.x.rotateY(orbit.beta + orbit.startAngleY()).rotateX(orbit.alpha + orbit.startAngleX())([space.xLine]),
		y: scale3d.y.rotateY(orbit.beta + orbit.startAngleY()).rotateX(orbit.alpha + orbit.startAngleX())([space.yLine]),
		z: scale3d.z.rotateY(orbit.beta + orbit.startAngleY()).rotateX(orbit.alpha + orbit.startAngleX())([space.zLine])
	};
	var fault = scale3d.fault.rotateY(orbit.beta + orbit.startAngleY()).rotateX(orbit.alpha + orbit.startAngleX())([faultPlane])
	appData.formatted = [
		space.grid3d.rotateY(orbit.beta + orbit.startAngleY()).rotateX(orbit.alpha + orbit.startAngleX())(space.xGrid),
		space.point3d.rotateY(orbit.beta + orbit.startAngleY()).rotateX(orbit.alpha + orbit.startAngleX())(space.scatter),
		axes,
		fault
	];
	processData(appData.formatted, 0);
}


// UI Operations
function timeDragStart(){
	cancelAnimationFrame(anim.req);
	syncTimeline();
}

function timeDragged(){
	syncTimeline();
}

function syncTimeline(){
	scrub.startX = d3.event.x;
	var newProg = scale2d.scrub(scrub.startX);
	anim.progress = newProg;

	updateDataArray();
	movePlayhead();
}


function dragStart(){
	orbit.mx = d3.event.x;
	orbit.my = d3.event.y;
}

function dragged(){
	orbit.mouseX = orbit.mouseX || 0;
	orbit.mouseY = orbit.mouseY || 0;
	orbit.beta   = (d3.event.x - orbit.mx + orbit.mouseX) * Math.PI / 230 ;
	orbit.alpha  = (d3.event.y - orbit.my + orbit.mouseY) * Math.PI / 230  * (-1);
	updateDataArray();
}

function dragEnd(){
	orbit.mouseX = d3.event.x - orbit.mx + orbit.mouseX;
	orbit.mouseY = d3.event.y - orbit.my + orbit.mouseY;
}

var magInput = document.querySelector('#magInput');
var historyInput = document.querySelector('#historyInput');
var eventCount = document.querySelector('#eventCount');
var btnViewBottom = document.querySelector('#btnViewBottom');
var btnViewFront = document.querySelector('#btnViewFront');
var btnReplay = document.querySelector('#btnReplay');
var toggleRanges = document.querySelectorAll('[data-range]');

btnViewBottom.addEventListener('click', rBottom);
btnViewFront.addEventListener('click', rFront);

btnReplay.addEventListener('click', function(){
	init();
});


historyInput.addEventListener('change', function(e){
	updateHistoryRange(e.target.value);
});
function updateHistoryRange(num) {
	if (num <= 0) {
		historyInput.value = '';
		inputs.maxHist = null;
	} else {
		inputs.maxHist = num;
	}
	updateDataArray();
	movePlayhead();
}

function updateEventCount(num) {
	eventCount.textContent = num;
}

function enableMagInput() {
	magInput.min = appData.magFloor;
	magInput.max = appData.magCeil;
	magInput.disabled = false;
	magInput.addEventListener('change', function(e){
		if (magInput.value < magInput.min) { magInput.value = magInput.min; }
		//**TODO: refactor magnitude input to filter on point plot (not refetching every time)
		fetchQuakeData(magInput.value);
	});
}


toggleRanges.forEach(function(range){
	range.addEventListener('change', function(e) {
		handleToggleRange(e.target)
	});
});

function handleToggleRange(target) {
	var targetClass = '.' + target.dataset.range + 'Text';
	if (isRangeVisible(target)) {
		document.querySelectorAll(targetClass).forEach(function(el){
			el.style.display = "block";
		});
	} else {
		document.querySelectorAll(targetClass).forEach(function(el){
			el.style.display = "none";
		});
	}
}

function isRangeVisible(el) { return el.checked; }

//Quick debug to rotate to visual bottom
function rBottom() {
	orbit.alpha  = 1.6937282132397145;
	orbit.beta   = -0.6283185307179586;
	updateDataArray();
}

//Quick debug to rotate to visual bottom
function rFront() {
	orbit.alpha  = 0.12293188644481799;
	orbit.beta   = -0.6283185307179586;
	updateDataArray();
}

//Data fetch
	//**TODO: refactor magnitude input to filter on point plot (not refetching every time)
fetchQuakeData(magInput.value);
function fetchQuakeData(magnitude){
	var request	= new XMLHttpRequest(),
			datapath	= './public/data.json';
	request.open('GET', datapath, true);
	request.onload = function() {
		if (request.status >= 200 && request.status < 400) {
			console.log('Quake data received');
			appData.quakeRaw = JSON.parse(request.responseText).quakes;
			// Get max/min bounds for all datapoints from full dataset
			generateBounds();

			// Limit active dataset based on GUI input
			appData.quakeRaw = appData.quakeRaw.filter(function(quake) {
				return quake.mag >= magnitude;
			});


			fetchFaultData();
		} else { console.log('Reached our target server, but it returned an error'); }
	};
	request.onerror = function() { console.log('There was a connection error of some sort'); };
	request.send();
}


function fetchFaultData(){
	var request	= new XMLHttpRequest(),
			datapath	= './public/fault-data.json';
	request.open('GET', datapath, true);
	request.onload = function() {
		if (request.status >= 200 && request.status < 400) {
			console.log('Fault data received');
			appData.faultRaw = JSON.parse(request.responseText).fault;

			if (appData.quakeRaw.length > 1) {
				init();
			} else { alert("Only one or fewer earthquake events found. This visualization requires at least two events. Please lower minimum magnitude"); }


		} else { console.log('Reached our target server, but it returned an error'); }
	};
	request.onerror = function() { console.log('There was a connection error of some sort'); };
	request.send();
}