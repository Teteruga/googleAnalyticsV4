	function requestReport(requestBodyName, startDate = 'yesterday', endDate = 'today'){
		
		gapi.client.request({
			path: '/v4/reports:batchGet',
			root: 'https://analyticsreporting.googleapis.com/',
			method: 'POST',
			body: {
				reportRequests: [ createRequestBody(requestBodyName, startDate, endDate) ]
			}
		}).then(nextStep, console.error.bind(console));

	}

	function nextStep(response){

		lastRequestResponse = response.result;
		console.log(lastRequestResponse);
		var formattedJson = JSON.stringify(response.result, null, 2);
		document.getElementById('query-output').value = formattedJson;

		var nextStepName;

		var startDate = $('.data-report.active').attr('data-analytics-date');
		var endDate = 'today';

		switch( lastRequestResponse.reports[0].columnHeader.dimensions[0] ){
			case 'ga:country':

				buildWorldMap();
				removeSmokeScreen('world_chart');
				// setTimeout(function(){
				createCountryList();
				removeSmokeScreen('country_container');
				// }, 1000);
				nextStepName = 'usersAndDevices';

				break;
			case 'ga:segment':
				animateUsersCount();
				buildDeviceChart();
				removeSmokeScreen('user_container');
				nextStepName = 'states';

				break;
			case 'ga:region':
				createStatesList();
				removeSmokeScreen('state_container');
				nextStepName = 'age';

				break;
			case 'ga:userAgeBracket':
				buildAgeChartAndList();
				removeSmokeScreen('age_container');
				nextStepName = 'gender'

				break;
			case 'ga:userGender':
				buildGenderChartAndList();
				removeSmokeScreen('gender_container');
				break;
			default:
				console.log("Default");
				nextStepName = '';
		}

		if( nextStepName ){
			requestReport(nextStepName, startDate, endDate);
		}
		else{
			stopLoadingProcess();
		}
	}

	function createRequestBody(requestType, startDate, endDate){

		var requestBody = buildDefaultRequest(startDate, endDate);

		switch( requestType ){
			case 'initial':
				requestBody = createRequestBodytInitial(requestBody);
				break;
			case 'country':
				requestBody = createRequestBodyCountry(requestBody);
				break;
			case 'usersAndDevices':
				requestBody = createRequestBodyUsersAndDevices(requestBody);
				break;
			case 'states':
				requestBody = createRequestBodyStates(requestBody);
				break;
			case 'age':
				requestBody = createRequestBodyAge(requestBody);
				break;
			case 'gender':
				requestBody = createRequestBodyGender(requestBody);
			default:
				console.log("Default");
		}

		// console.log(requestBody);

		return requestBody;
	}

  	/** Loading Process */

	function startLoadingProcess(){

		requestReport('country', $('.data-report.active').attr('data-analytics-date') );	
		initiateLoaders();

		$('.data-report').attr('disabled', true).addClass('disabled');
	}

	function initiateLoaders(){

		$('.chart-wrapper').append(`
			<div class = "smoke-screen" style = "display:none">
				<div class = "loader-wrapper">
					<div class="loader">Loading...</div>
				</div>
			</div>`
		);

		$('.smoke-screen').fadeIn();
	}

	function stopLoadingProcess(){

		$('.data-report').attr('disabled', false).removeClass('disabled');

		$('.smoke-screen').fadeOut(450, function(){
			$('.smoke-screen').remove();
		});
	}

	function removeSmokeScreen(id){
		$(`#${id} .smoke-screen`).fadeOut(450, function(){
			$(`#${id} .smoke-screen`).remove();
		});
	}

  	/** Request Building Blocks */

	function addTimeInterval(requestBody, startDate, endDate){

		if( requestBody.dateRanges != undefined ){
			console.log("SEM ORDER");
		}
		else{

			requestBody.dateRanges = [
				{startDate: startDate, endDate: endDate}
			];

		}

		return requestBody;
	}

	function addMetric(requestBody, metric = 'users'){

		if( requestBody.metrics != undefined ){
			console.log("SEM METRIC");
		}
		else{

			requestBody.metrics = [
				{expression: `ga:${metric}`}
			];

		}

		return requestBody;
	}

	function addDimension(requestBody, dimension){

		if( requestBody.dimensions != undefined ){
			console.log(requestBody);
			requestBody.dimensions.push( {name: `ga:${dimension}`} );
		}
		else{

			requestBody.dimensions = [
				{name: `ga:${dimension}`}
			];

		}

		return requestBody;
	}

	function addSegment(requestBody, segmentName, segmentDimension, segmentOperator, segmentExpression){

		var segment = {};
		segment.dynamicSegment = {};

		segment.dynamicSegment.name = segmentName;
		segment.dynamicSegment.userSegment = 
		{
			segmentFilters: [{
					simpleSegment:
					{
					orFiltersForSegment: [{
						segmentFilterClauses: [{
							dimensionFilter:
							{
								dimensionName: `ga:${segmentDimension}`,
								operator: segmentOperator,
								expressions: segmentExpression
							}
						}]
					}]
				}
			}]
		}

		if( requestBody.segments !== undefined ){
			requestBody.segments.push(segment);		
		}else{
			requestBody.segments = [segment];
		}

		return requestBody;
	}

	function addPivot(requestBody, pivotDimension, pivotMetric = 'users'){

		var pivot = {};

		pivot = addDimension(pivot, pivotDimension);
		pivot = addMetric(pivot);

		if( requestBody.pivots != undefined ){
			requestBody.pivots.push(pivot);
		}
		else{
			requestBody.pivots = [pivot];
		}

		return requestBody;
	}

	function addFilterByPage(requestBody, filterBy = 'pagePath', expression = `/app/commingusers/view-form?id=${form_id}`, operator1 = 'AND', operator2 = 'EXACT'){

		if( requestBody.dimensionFilterClauses != undefined ){
			console.log("SEM FILTRO");
		}
		else{

			requestBody.dimensionFilterClauses = [{
				operator: operator1,
				filters: [ {
					dimensionName: `ga:${filterBy}`,
					operator: operator2,
					expressions: [
						expression
					],
				} ]
			}];

		}

		return requestBody;
	}

	function addOrderBySession(requestBody, field = 'users', orderDirection = 'DESCENDING'){

		if( requestBody.orderBys != undefined ){
			console.log("SEM ORDER");
		}
		else{

			requestBody.orderBys = [
				{fieldName: `ga:${field}`, sortOrder: orderDirection}
			];

		}

		return requestBody;
	}

  	/** Request Response   */

	function retrivePivotsNamesAndPosition(){

		lastRequestResponse.reports[0].columnHeader.metricHeader.pivotHeaders[0].pivotHeaderEntries[0].dimensionNames[0];

		$.each(lastRequestResponse.reports[0].columnHeader.metricHeader.pivotHeaders, function(index, value){

			$.each(value.pivotHeaderEntries, function(innerIndex, innerValue){

				if( pivot[ innerValue.dimensionNames[0] ] !== undefined ){
					pivot[ innerValue.dimensionNames[0] ].push( innerValue.dimensionValues[0] );
				}
				else{
					pivot[ innerValue.dimensionNames[0] ] = [ index, innerValue.dimensionValues[0] ];
				}

			});

		});

	}

  	/** Default Request */

	function buildDefaultRequest(startDate, endDate, sampleSize = 'LARGE'){

		var requestBody = {};

		requestBody.viewId = VIEW_ID;
		requestBody.samplingLevel = sampleSize;

		requestBody = addTimeInterval(requestBody, startDate, endDate);
		requestBody = addFilterByPage(requestBody);
		requestBody = addOrderBySession(requestBody);
		requestBody = addMetric(requestBody);

		return requestBody;

	}

	/** Request Bodys */

	function createRequestBodytInitial(requestBody){

		// requestBody = addDimension(requestBody, 'country');
		// requestBody = addDimension(requestBody, 'segment');
		// requestBody = addPivot(requestBody, 'deviceCategory');
		// requestBody = addPivot(requestBody, 'userType', 'newUsers');
		
		// requestBody = addSegment(requestBody, 'Users mobile', 'deviceCategory', 'EXACT', ['mobile']);
		// requestBody = addSegment(requestBody, 'Users desktop', 'deviceCategory', 'EXACT', ['desktop']);
		// requestBody = addSegment(requestBody, 'New Users', 'userType', 'EXACT', ['New Visitor']);
		// requestBody = addSegment(requestBody, 'By Country', 'country', 'IN_LIST', ["United States", "United Kingdom"]);

		return requestBody;
	}

	function createRequestBodyCountry(requestBody){
		requestBody = addDimension(requestBody, 'country');
		return requestBody;
	}

	function createRequestBodyUsersAndDevices(requestBody){

		requestBody = addDimension(requestBody, 'segment');
		requestBody = addSegment(requestBody, 'new_users', 'userType', 'EXACT', ['New Visitor']);
		requestBody = addSegment(requestBody, 'total_users', 'userType', 'IN_LIST', ['New Visitor', 'Returning Visitor']);

		requestBody = addSegment(requestBody, 'mobile_users', 'deviceCategory', 'EXACT', ['mobile']);
		requestBody = addSegment(requestBody, 'desktop_users', 'deviceCategory', 'EXACT', ['desktop']);

		return requestBody;
	}

	function createRequestBodyStates(requestBody){
		requestBody = addDimension(requestBody, 'region');
		return requestBody;
	}

	function createRequestBodyAge(requestBody){
		requestBody = addDimension(requestBody, 'userAgeBracket');
		return requestBody;	
	}

	function createRequestBodyGender(requestBody){
		requestBody = addDimension(requestBody, 'userGender');
		return requestBody;	
	}

	function createRequestBodyUsersDate(requestBody){

	}

	/** List Builder */

	function buildNewList(type, listId, list, unsetValue, newList = true){

		var data = [];
		var total = unsetValue;

		if( $(`#${listId} li`).length > 0 && newList){
			console.log('new');
			$(`#${listId} li`).remove();
		}

		$.each(list, function(index, value){

			var elementInfo = {};

			switch(type){
				case 'countryWithUsers':

					elementInfo.name =  value.name;
					elementInfo.percentage = formatPercentage(value.percentage);
					elementInfo.value = value.number;
					elementInfo.flag = `<?=HTTP_ROOT?>img/flags/${value.abbreviation.toLowerCase()}.png`;
					classPrefix = 'country';

					break;
				case 'countryWithoutUsers':
					
					if( $(`.country-name:contains('${value}')`).length === 0 ){
											
						elementInfo.name =  value;
						elementInfo.percentage = formatPercentage(0.00);
						elementInfo.value = 0;
						elementInfo.flag = `<?=HTTP_ROOT?>img/flags/${index.toLowerCase()}.png`;
						classPrefix = 'country';
					}

					break;
				case 'state':
					
					elementInfo.name =  index.replace('State of', '').trim();
					elementInfo.value = value;
					elementInfo.percentage = calculatePercentage(elementInfo.value, total, true);
					classPrefix = 'state';

					break;
				case 'age':
					
					elementInfo.name =  value.name;
					elementInfo.value = value.value;
					elementInfo.percentage = calculatePercentage(elementInfo.value, total, true);
					classPrefix = 'age';

					break;	
				case 'gender':
					
					elementInfo.name =  value.name;
					elementInfo.value = value.value;
					elementInfo.percentage = calculatePercentage(elementInfo.value, total, true);
					classPrefix = 'gender';

					break;	
				default:
					elementInfo.name =  value.name;
					elementInfo.value = value.value;
					elementInfo.percentage = calculatePercentage(elementInfo.value, total, true);

					classPrefix = 'default';
			}

			if( elementInfo.name ){
				unsetValue -= elementInfo.value;
				data.push(elementInfo);
			}

		});

		if(unsetValue > 0){
			
			$.each(data, function(index, value){

				if(value.value <= unsetValue){

					var unsetElement = {
						name: 'unset',
						value: unsetValue,
						percentage: calculatePercentage(unsetValue, total, true),
					}

					data.splice(index, 0, unsetElement);
					unsetValue = -1;
				}

			});

		}
		
		$.each(data, function(index, value){
			value.ranking = $(`#${listId} li`).length + 1;
			addElementToList(listId, value, classPrefix);
		});
	
		return data;
	}

	function addElementToList(listId, elementInfo, classPrefix){

		var listElement = $(`
			<li> 
				<span class = "list-ranking ${classPrefix}-ranking"> ${elementInfo.ranking}. </span> 
				<a href = "#"> 
					<span class = "list-name ${classPrefix}-name">${elementInfo.name}</span> 
				</a> 
				<span class = "list-number ${classPrefix}-number"> ${elementInfo.value} <span class = "list-percentage ${classPrefix}-percentage"> ( ${elementInfo.percentage}% ) </span> </span> 
			</li>`);

		if(elementInfo.flag){
			$( listElement.find('a').get(0) ).prepend(`<span class = "list-flag ${classPrefix}-flag"> <img src = "${elementInfo.flag}" > </span>`)
		}

		$(`#${listId}`).append(listElement);
	}

	function calculatePercentage(value, total, format = false){

		var percentage = Math.round( ( (value/total) + Number.EPSILON) * 10000)/100;

		if(format){
			return formatPercentage(percentage);
		}
		else{
			return percetange
		}
	}

	function formatPercentage(value){
		var percentage = parseFloat(value).toFixed(2)
		return ( percentage.toString().length === 4 ) ? '0'+percentage : percentage;
	}
