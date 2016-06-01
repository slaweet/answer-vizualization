

function main(dataDir) {
  dataDir = 'data/' + dataDir;
  d3.csv(dataDir + "/answers.csv", function(answers) {
    d3.csv(dataDir + "/flashcards.csv", function(flashcards) {
      answers = filterData(answers);
      answersByUser = preprocessData(answers, flashcards);
      renderControlls(answers, answersByUser, renderer.colors);
      showLegendFunc(renderer.colors);
      render(answersByUser, answers, 'is_correct');
      renderer.render = function(displayKey) {
        render(answersByUser, answers, displayKey);
      };
    });
  });
  var renderer = {
    r : 3,
    colors : ["#ddd", "red"],
  };
  return renderer;
}

function renderControlls(answers, answersByUser, colors) {
  d3.select("#controlls")
    .append("button")
    .text('Zoom in')
    .on('click', function(d) {
      renderer.r++;
      render(answersByUser, answers);
    });
  d3.select("#controlls")
    .append("button")
    .text('Zoom out')
    .on('click', function(d) {
      renderer.r--;
      render(answersByUser, answers);
    });
  d3.select("#controlls")
    .append("span").text(" Attr to color ");
  d3.select("#controlls")
    .append("select")
    .on('change', function(d) {
      var value = d3.select("#controlls")
        .select("select").node().value;
      render(answersByUser, answers, value);
    })
    .selectAll('option')
    .data(d3.entries(answers[0]))
    .enter()
    .append('option')
    .attr('value', function(d) { return d.key; })
    .text(function(d) { return d.key; });
}

function filterData(data) {
  return data.filter(function(row, i) {
    return row.response_time < 30000 && i < 10000;
  });
}

function preprocessData(data, flashcards) {
  var answersByUser = {};

  var flashcardsDict = {};
  for (var i = 0; i < flashcards.length; i++) {
    fc = flashcards[i];
    flashcardsDict[fc.item_id] = fc;
  }
  for (i = 0; i < data.length; i++) {
    var row = data[i];
    row.is_correct = row.item_asked_id == row.item_answered_id;

    var flashcard = flashcardsDict[row.item_asked_id];
    if (flashcard) {
      row.term_type = flashcard.term_type;
      row.term_name = flashcard.term_name;
      row.context_name = flashcard.context_name;
    }
    answersByUser[row.user_id] = answersByUser[row.user_id] || [];
    answersByUser[row.user_id].push(row);
  }

  var byExperiment = [];
  for (i in answersByUser) {
    var userRow = answersByUser[i];
    var first = answersByUser[i][0];
    byExperiment[first.experiment_setup_id] = byExperiment[first.experiment_setup_id] || [];
    byExperiment[first.experiment_setup_id].push(userRow);
  }
  var experimentList = [];
  for (i in byExperiment) {
    byExperiment[i] = byExperiment[i].sort(sortByLength);
    experimentList.push(byExperiment[i]);
  }

  return experimentList;
}

function sortByLength(a, b) {
      return b.length - a.length;
}

function render(data, answers, displayKey) {
  if (displayKey) {
    renderer.displayKey = displayKey;
  } else {
    displayKey = renderer.displayKey;
  }
  var options = {
    displayKey: displayKey,
    domain : getDomain(answers, displayKey),
    r : renderer.r,
    colors : renderer.colors,
  };
  d3.select("#data-render").selectAll("span").remove();
  d3.select("#controlls")
    .select("select").node().value = displayKey;
  for (var i = 0; i < data.length; i++) {
    renderExperiment(data[i], options);
  }
}

function getDomain(answers, key) {
  var min = answers[0][key] - 0;
  var max = answers[0][key] - 0;
  for (var i = 0; i < answers.length; i++) {
    var val = answers[i][key] - 0;
    min = Math.min(val, min);
    max = Math.max(val, max);
  }
  return [min, max];
}

function renderExperiment(data, options) {
  var span = d3.select("#data-render").append("span");
  span.attr('class','svg-holder');
  span.append("strong").text(getTitle(data));
  var svg = span.append("svg");
  var r = options.r;
  var w = 10000;
  var h = data.length * 3 * r + 6 * r;
  svg.attr("width", w)
    .attr("height", h);
  for (var i = 0; i < data.length; i++) {
    var group = svg.append('g');
    drawRow(group, data[i], (i + 1) * 3 * r, r, options);
  }
}

function getTitle(data) {
  var AB_VALUES = {
      0: 'No A/B experiment',
      6: 'Random-Adaptive',
      7: 'Random-Random',
      8: 'Adaptive-Adaptive',
      9: 'Adaptive-Random',
      14: '50%',
      15: '35%',
      16: '20%',
      17: '5%',
      18: 'A-C',
      19: 'C-A',
      20: 'C-C',
      21: 'A-A',
      22: 'A-R',
      23: 'C-R',
      24: 'A-R',
      25: 'C-A',
      26: 'A-A',
      27: 'A-4',
      28: 'C-R',
      29: 'C-4',
      30: 'max_options 4',
      31: 'max_options 6',
      32: 'max_options 3',
      33: 'max_options 2',
      34: 'max_options 8',
  };

  var id = data[0][0].experiment_setup_id;
  return AB_VALUES[id] || id;
}

function drawRow(group, row, y, r, options) {
  var colorScale = d3.scale.linear()
    .domain(options.domain)
    .range(options.colors);
  var circles = group.selectAll("circle")
    .data(row)
    .enter()
    .append("circle");
  circles.attr("cx", function(d, i) {
    return (i + 1) * r * 2;
  })
  .attr("fill", function(d) {
    return colorScale(d[options.displayKey]);
  })
  .attr("cy", y)
  .attr("r", r)
  .on("mouseover", hoverAnswer)
  .on("click", selectAnswer);
}
var selected;

function hoverAnswer(d,i,j,k) {
  if (!selected) {
    showDetails(d, i);
  }
}

function selectAnswer(d,i) {
  showDetails(d, i);
  if (selected != d) {
    d3.select(this).attr('class', 'selected');
    selected = d;
  } else {
    d3.select(this).attr('class', '');
    selected = undefined;
  }
}

function showDetails(d,i) {
  var infoDiv = d3.select("div#info");
  infoDiv.selectAll('div').remove();
  infoDiv.selectAll('div')
    .data(d3.entries(d))
    .enter()
    .append('div')
    .html(function(dd, i) {
      return dd.key + ': <strong>' + dd.value + '</strong>&nbsp;&nbsp;&nbsp;';
    })
    .attr('title', 'Choose this attr for coloring')
    .attr('style', 'cursor: pointer')
    .on('click', function(dd, i) {
      renderer.render(dd.key);
    });
}
  function showLegendFunc(colors) {
    var canvas = d3.select("#controlls").append("svg");
    canvas.attr('class','svg-gradient');
    var gw = 200;
    var gh = 20;
    var offsetY = 10;
    canvas.attr("width",gw).attr("height",gh + offsetY);
    var gradient = canvas.append("defs")
      .append("linearGradient")
      .attr("id", "gradient")
      .attr("x1", "0%")
      .attr("y1", "50%")
      .attr("x2", "100%")
      .attr("y2", "50%")
      .attr("spreadMethod", "pad");
    gradient.append("stop")
      .attr("offset", "0%")
      .attr("stop-color", colors[0])
      .attr("stop-opacity", 1);
    gradient.append("stop")
      .attr("offset", "100%")
      .attr("stop-color", colors[1])
      .attr("stop-opacity", 1);
    canvas.append("rect")
      .attr("width",gw)
      .attr("height", gh)
      .attr("x", 0)
      .attr("y", offsetY)
      .attr("stroke", "lightgray")
      .attr("stroke-width",2)
      .attr("fill", "url(#gradient)");
    canvas.append("text")
      .text("Legenda")
      .attr("x", 10)
      .attr("y",450);
    canvas.append("text")
      .text("0")
      .attr("x", 5)
      .attr("y",500);
  }

var dataDir = (window.location.hash || 'max-options-count').replace('#', '');
var renderer = main(dataDir);
