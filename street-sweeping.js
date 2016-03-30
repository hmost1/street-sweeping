Routes = new Mongo.Collection('SweepingRoutes');
//Intersections = new Mongo.Collection('Intersections');
//Routes = new Mongo.Collection('SweepingRoutes', {
//  transform: function(route){
//    route.streetInfo = Intersections.find({
//      //cnn: route.cnn
//      cnn: { $in: [ route.cnn] }
//    });
//    return route;
//  }
//});

if (Meteor.isServer) {
  
  //allow client access to all routes 
  Meteor.publish('routes', function(){
    return Routes.find();
  });
}

if (Meteor.isClient) {
  angular.module('street-sweeping',['angular-meteor']);

  angular.module('street-sweeping').controller('StreetSweepingCtrl', ['$scope', '$meteor',
    function ($scope, $meteor) {
      $scope.subscribe('routes', function(){
        console.log("routes ready!");
      });

      $scope.hi = "hi";

      $scope.log = function(value){
        console.log(value);
      }
      
      //TODO: remove this or make the transformation from the db somewhere else 
      $scope.days = ["week1ofmon","week2ofmon","week3ofmon","week4ofmon","week5ofmon"]; 

      //the D3 stuff
      $scope.set = {
        x: "test",
        y: [ ]
      };

      //first type of query, looking up by an address 
      //this is triggered by the submit of the form with id = routeByAddress
      $scope.routeByAddress = function(street, number){        
        $scope.street = street;
        $scope.number = parseInt(number);

        console.log("Looking up details for  " + $scope.number + $scope.street); 

        //TODO: everything below here needs to be broken out into better helpers or reusable 

        //This is very data specific: if even, rightside, if odd, left. 
        //Used to filter on the cnnrightle field 
        var rightLeft = $scope.number %2 ? "L" : "R";  

        //we need to do all of this because there is no guarantee blocks on each side end at preceding values (is this true???)
        //so couldnt just do ands of both regardless
        //need to look at some maps... 
        //TODO: simplify this 
        var numberQuery = rightLeft === "L" ? {lf_fadd: {$lte: $scope.number}, lf_toadd: {$gte: $scope.number}} : {rt_fadd: {$lte: $scope.number}, rt_toadd: {$gte: $scope.number}}
       
        //TODO: get the npm merge package or something for this and others down the line 
        //fill up the mongo query with the other fields we're searching on 
        var addressQuery = numberQuery;
        addressQuery.streetname =  {$regex: ".*"+$scope.street+".*", $options: 'i'}; 
        addressQuery.cnnrightle = {$regex: rightLeft}

        $scope.set.x = "address";
        $scope.routeQuery = addressQuery; 
      };

      //second type of query, a bit more complicated looking up by an address 
      //Given a street (block) and 2 cross streets (block), look up in the intersections number to 
      //get the cnn. Then map to the routes in the table 

      //TODO: may need to add side of street, etc. and an address transformer since they aren't written out consistently 
      $scope.routeByBlock = function(block, cross1, cross2){        
        $scope.block = block;
        $scope.cross1 = cross1; 
        $scope.cross2 = cross2; 

        console.log("Looking up details for  " + $scope.block + " between " + $scope.cross1 + " and " + $scope.cross2); 

        var blockQuery = {}

        //tODO: this works, should maybe reorg
        //TODO: fix indexing in mongo so this goes faster
        //TODO: there are literally circular streets in sf (ex: Urbano drive)
        //TODO: also some streets use "end" (ex: urbano to end on corona )
        blockQuery=
        {$and:
          [
            {$or:[{from_st:{$regex: ".*"+$scope.cross1+".*", $options: 'i'}},{from_st:{$regex: ".*"+$scope.cross2+".*", $options: 'i'}}]},
            {$or:[{to_st:{$regex: ".*"+$scope.cross1+".*", $options: 'i'}},{to_st:{$regex: ".*"+$scope.cross2+".*", $options: 'i'}}]},
            {streetname: {$regex: ".*"+$scope.block+".*", $options: 'i'}}
          ]
        };
        
        $scope.set.x = "block"; 
        $scope.routeQuery = blockQuery; 
      };
      $scope.result = $meteor.collection( function() {
        return Routes.find($scope.getReactively('routeQuery'));
      });
    } 
  ]);
  
  var d3function = function(){
            // Revealing module pattern to store some global data that will be shared between different functions.
    var d3CalendarGlobals = function() {
            var calendarWidth = 790, 
            calendarHeight = 410,
            gridXTranslation = 5,
            gridYTranslation = 20,
            cellColorForCurrentMonth = '#EAEAEA',
            cellColorForPreviousMonth = '#FFFFFF',
            counter = 0, // Counter is used to keep track of the number of "back" and "forward" button presses and to calculate the month to display.
            currentMonth = new Date().getMonth(),
            addedSweeps = [], //store maps of (day, occurrence) ex: 4,1 = thursday, first of the month 
            monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
            datesGroup;

            function publicCalendarWidth() { return calendarWidth; }
            function publicCalendarHeight() { return calendarHeight; }
            function publicGridXTranslation() { return gridXTranslation; }
            function publicGridYTranslation() { return gridYTranslation; }
            function publicGridWidth() { return calendarWidth - gridXTranslation; }
            function publicGridHeight() { return calendarHeight - gridYTranslation; }
            function publicCellWidth() { return publicGridWidth() / 7; }
            function publicCellHeight() { return publicGridHeight() / 5; }
            function publicGetDatesGroup() {
                return datesGroup;
            }
            function publicSetDatesGroup(value) {
                datesGroup = value;
            }
            function publicIncrementCounter() { counter = counter + 1;}
            function publicDecrementCounter() { counter = counter - 1; }
            function publicMonthToDisplay() {
                var dateToDisplay = new Date();
                // We use the counter that keep tracks of "back" and "forward" presses to get the month to display.
                dateToDisplay.setMonth(currentMonth + counter);
                return dateToDisplay.getMonth();
            }
            function publicMonthToDisplayAsText() { return monthNames[publicMonthToDisplay()]; }
            function publicYearToDisplay() {
                var dateToDisplay = new Date();
                // We use the counter that keep tracks of "back" and "forward" presses to get the year to display.
                dateToDisplay.setMonth(currentMonth + counter);
                return dateToDisplay.getFullYear();
            }
            function publicGridCellPositions() {

                // We store the top left positions of a 7 by 5 grid. These positions will be our reference points for drawing
                // various objects such as the rectangular grids, the text indicating the date etc.
                var cellPositions = [];
                for (y = 0; y < 5; y++) {
                    for (x = 0; x < 7; x++) {
                        cellPositions.push([x * publicCellWidth(), y * publicCellHeight()]);
                    }
                }

                return cellPositions;
            }

            // This function generates all the days of the month. But since we have a 7 by 5 grid, we also need to get some of
            // the days from the previous month and the next month. This way our grid will have all its cells filled. The days
            // from the previous or the next month will have a different color though. 
            function publicDaysInMonth() {
                var daysArray = [];

                var firstDayOfTheWeek = new Date(publicYearToDisplay(), publicMonthToDisplay(), 1).getDay();
                var daysInPreviousMonth = new Date(publicYearToDisplay(), publicMonthToDisplay(), 0).getDate();

                /* 'date' = day to display, color, [-1,0,1] representing previous, current, or next month*/

                // Lets say the first week of the current month is a Wednesday. Then we need to get 3 days from 
                // the end of the previous month. But we can't naively go from 29 - 31. We have to do it properly
                // depending on whether the last month was one that had 31 days, 30 days or 28.
                for (i = 1; i <= firstDayOfTheWeek; i++) {
                    daysArray.push([daysInPreviousMonth - firstDayOfTheWeek + i, cellColorForCurrentMonth, -1]);
                }
                
                // These are all the days in the current month.
                var daysInMonth = new Date(publicYearToDisplay(), publicMonthToDisplay() + 1, 0).getDate();
                for (i = 1; i <= daysInMonth; i++) {
                  daysArray.push([i, cellColorForPreviousMonth, 0]);
                }

                // Depending on how many days we have so far (from previous month and current), we will need
                // to get some days from next month. We can do this naively though, since all months start on
                // the 1st.
                var daysRequiredFromNextMonth = 35 - daysArray.length;

                for (i = 1; i <= daysRequiredFromNextMonth; i++) {
                    daysArray.push([i,cellColorForCurrentMonth, 1]);
                }

                return daysArray.slice(0,35);
            }

            function publicAddedSweeps(){
              return addedSweeps;
            }

            function publicAddSweep(day, occurrence){
              addedSweeps.push({"day":day, "occurrence":occurrence});
            }

            return {
                calendarWidth: publicCalendarWidth(),
                calendarHeight: publicCalendarHeight(),
                gridXTranslation :publicGridXTranslation(),
                gridYTranslation :publicGridYTranslation(),
                gridWidth :publicGridWidth(),
                gridHeight :publicGridHeight(),
                cellWidth :publicCellWidth(),
                cellHeight :publicCellHeight(),
                getDatesGroup : publicGetDatesGroup,
                setDatesGroup: publicSetDatesGroup,
                incrementCounter : publicIncrementCounter,
                decrementCounter : publicDecrementCounter,
                monthToDisplay : publicMonthToDisplay,
                monthToDisplayAsText : publicMonthToDisplayAsText,
                yearToDisplay: publicYearToDisplay,
                gridCellPositions: publicGridCellPositions(),
                daysInMonth : publicDaysInMonth, 
                addedSweeps : publicAddedSweeps, 
                addSweep: publicAddSweep
            }
    }();
  
    //TODO: save global var of the "sweeps"
    //on every addday, add that day to the "sweeps"
    //back and forth will call initColor, which includes rendering every day in "sweeps"
    $(document).ready( function (){
                            renderCalendarGrid();
                            renderDaysOfMonth();
                            initColors();      
                            $('#back').click(displayPreviousMonth);
                            $('#forward').click(displayNextMonth);

                            //TODO: unblock the query values here 
                            }
    );

  function isToday(year, month, day){
      var today = new Date();
      if(day === today.getDate() && month === today.getMonth() && year === today.getFullYear()){
        return true; 
      }
      return false; 
  }
  
    function displayPreviousMonth() {
            // We keep track of user's "back" and "forward" presses in this counter
            d3CalendarGlobals.decrementCounter();
            renderDaysOfMonth();
            initColors(); 
    }
  
    function displayNextMonth(){
        // We keep track of user's "back" and "forward" presses in this counter
        d3CalendarGlobals.incrementCounter();
        renderDaysOfMonth();
        initColors();
    }
 
         // This function is responsible for rendering the days of the month in the grid.
    function renderDaysOfMonth(month, year) {
      $('#currentMonth').text(d3CalendarGlobals.monthToDisplayAsText() + ' ' + d3CalendarGlobals.yearToDisplay());
      // We get the days for the month we need to display based on the number of times the user has pressed
      // the forward or backward button.
      var daysInMonthToDisplay = d3CalendarGlobals.daysInMonth();
      var cellPositions = d3CalendarGlobals.gridCellPositions;

      // All text elements representing the dates in the month are grouped together in the "datesGroup" element by the initalizing
      // function below. The initializing function is also responsible for drawing the rectangles that make up the grid.
      d3CalendarGlobals.datesGroup 
        .selectAll("text")
        .data(daysInMonthToDisplay)
        .attr("x", function (d,i) { return cellPositions[i][0]; })
        .attr("y", function (d,i) { return cellPositions[i][1]; })
        .attr("dx", 20) // right padding
        .attr("dy", 20) // vertical alignment : middle
        .attr("transform", "translate(" + d3CalendarGlobals.gridXTranslation + "," + d3CalendarGlobals.gridYTranslation + ")")
        .style("fill", function(d,i){
          if(isToday(d3CalendarGlobals.yearToDisplay(), d3CalendarGlobals.monthToDisplay()+d[2], d[0])){
            return "red"; 
          }
          return "blue"; 
        })
        .text(function (d) { return d[0]; });
    }

    function initColors(){
      var daysInMonthToDisplay = d3CalendarGlobals.daysInMonth();
      var sweeps = d3CalendarGlobals.addedSweeps();

      d3CalendarGlobals.calendar
       .selectAll("rect")
       .data(daysInMonthToDisplay)
       .style("fill", function (d,i){
          for(s in sweeps){
            if(toFill(d,i,sweeps[s]["day"], sweeps[s]["occurrence"])){
              return "green";
            }
          } 
          return d[1]
        });
    }

    //d, i the day and index being looped through 
    //sweep_day, sweep_occurrence, which need to end up matching mod 7 of d, i 
    function toFill(d, i, sweep_day, sweep_occurrence){
      var d_occurrence = Math.ceil(d[0]/7);
      var d_of_week = i%7

      //check if they match the seeping days 
      if(d_of_week === sweep_day && d_occurrence === sweep_occurrence){
          return true;
      }
      else{
        return false; 
      }
    }

    //TODO: this fxn loops through all days, then decides if this day matches any, 
    //should think of a better exact selector for that. (ex: with days as a class or something)
    function addDay(day_of_week, day_occurrence){
            d3CalendarGlobals.addSweep(day_of_week, day_occurrence);
            var daysInMonthToDisplay = d3CalendarGlobals.daysInMonth();
            d3CalendarGlobals.calendar
             .selectAll("rect")
             .data(daysInMonthToDisplay)
             // Here we change the color depending on whether the day is in the current month, the previous month or the next month.
             // The function that generates the dates for any given month will also specify the colors for days that are not part of the
             // current month. We just have to use it to fill the rectangle
             //.style("fill", function (d) { return d[1]; })
             .filter(function(d,i){
               var d_occurrence = Math.ceil(d[0]/7);
                var d_of_week = i%7

                //check if they match the seeping days 
                if(day_of_week === d_of_week && d_occurrence === day_occurrence){
                    return true;
                }
                else{
                  return false; 
                }
             })
             .style("fill", "green");
    }
 
    function is_swept(d,j){
            //var sweeps_of_week = {4:[1,3], 2:[1,3]}; //test, lets do thursdays  (first and 3rd)
            day_of_month=d[0];
    
            //take the day of month, see if there should be sweeping
            //DoM/7 (rounded up to the celing integer) gives you recurrence of that day in the month
            //(ex: the 21st, is the )        
            day = j%7;

            //TODO: this shouldn't be a global, gets passed in 
            sweeps = sweeps_of_week[day]||[];
            day_occurence = Math.ceil(day_of_month/7); //this date is the day_occurence(th) day of the month it's in
            if(sweeps.indexOf(day_occurence)>=0){
                return true;
            }
            return false;
    }

        // This is the initializing function. It adds an svg element, draws a set of rectangles to form the calendar grid,
        // puts text in each cell representing the date and does the initial rendering of the pie charts.
    function renderCalendarGrid(month, year) {
            // Add the svg element.
            d3CalendarGlobals.calendar = d3.select("#chart")
                         .append("svg")
                         .attr("class", "calendar")
                         .attr("width", d3CalendarGlobals.calendarWidth )
                         .attr("height", d3CalendarGlobals.calendarHeight)
                         .append("g");

            // Cell positions are generated and stored globally because they are used by other functions as a reference to render different things.
            var cellPositions = d3CalendarGlobals.gridCellPositions;

            // Draw rectangles at the appropriate postions, starting from the top left corner. Since we want to leave some room for the heading and buttons,
            // use the gridXTranslation and gridYTranslation variables.
            d3CalendarGlobals.calendar.selectAll("rect")
                    .data(cellPositions)
                    .enter()
                    .append("rect")
                    .attr("x", function (d) { return d[0]; })
                    .attr("y", function (d) { return d[1]; })
                    .attr("width", d3CalendarGlobals.cellWidth)
                    .attr("height", d3CalendarGlobals.cellHeight)
                    .style("stroke", "#555")
                    .style("fill", "white") 
                    .attr("transform", "translate(" + d3CalendarGlobals.gridXTranslation + "," + d3CalendarGlobals.gridYTranslation + ")");

            var daysOfTheWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
            // This adds the day of the week headings on top of the grid
            d3CalendarGlobals.calendar.selectAll("headers")
                 .data([0, 1, 2, 3, 4, 5, 6])
                 .enter().append("text")
                 .attr("x", function (d) { return cellPositions[d][0]; })
                 .attr("y", function (d) { return cellPositions[d][1]; })
                 .attr("dx", d3CalendarGlobals.gridXTranslation + 5) // right padding
                 .attr("dy", 30) // vertical alignment : middle
                 .text(function (d) { return daysOfTheWeek[d] });


            // The intial rendering of the dates for the current month inside each of the cells in the grid. We create a named group ("datesGroup"),
            // and add our dates to this group. This group is also stored globally. Later on, when the the user presses the back and forward buttons
            // to navigate between the months, we clear and re add the new text elements to this group
            d3CalendarGlobals.datesGroup = d3CalendarGlobals.calendar.append("svg:g");
            var daysInMonthToDisplay = d3CalendarGlobals.daysInMonth();

            //how to rdo this 
            var daysOfTheWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
            var thisMonth = false; 

            d3CalendarGlobals.datesGroup 
                 .selectAll("daysText")
                 .data(daysInMonthToDisplay)
                 .enter()
                 .append("text")
                 .attr("x", function (d, i) { return cellPositions[i][0]; })
                 .attr("y", function (d, i) { return cellPositions[i][1]; })
                 .attr("dx", 20) // right padding
                 .attr("dy", 20) // vertical alignment : middle
                 .attr("transform", "translate(" + d3CalendarGlobals.gridXTranslation + "," + d3CalendarGlobals.gridYTranslation + ")")
                 .style("fill", "red")
                 .text(function (d) { return d[0]; });

            // Create a new svg group to store the chart elements and store it globally. Again, as the user navigates through the months by pressing 
            // the "back" and "forward" buttons on the page, we clear the chart elements from this group and re add them again.
            d3CalendarGlobals.chartsGroup = d3CalendarGlobals.calendar.append("svg:g");
            // Call the function to draw the charts in the cells. This will be called again each time the user presses the forward or backward buttons.
            //drawGraphsForMonthlyData();

            //TODO: put in 'calculate sweeping examples' here 
    }

    return {
      addDate: function(w,d){
       
        var weekToNumber = {"week1ofmon":1,"week2ofmon":2,"week3ofmon":3,"week4ofmon":4,"week5ofmon":5};
        var dayToNumber = {"Mon":1,"Tues":2,"Wed":3,"Thu":4,"Fri":5, "Sat":6, "Sun":7};
        addDay(dayToNumber[d],weekToNumber[w]);
      },
      redraw: function(){
        initColors();
      }
    }
  };

  angular.module("street-sweeping").directive("barChart", function() {
    var directive = { };
    directive.restrict = 'AE';

    directive.scope = {
      y: '=barChart',
      options: '=?',
      x: '=?'
    };

    directive.link = function(scope, elements, attr) {
      scope.svg = null;
      scope.container = null;
      scope.d3 = null; 
      
   
      scope.initialize = function(results) {
        scope.d3 = d3function();
      };

      scope.initialize();

      //TODO: need a function that takes the day of week etc. and transforms it 
      scope.$parent.addDate = scope.d3.addDate; //();
      scope.$parent.redrawCal = scope.d3.redraw; 

    };

    return directive; 
  });
}
