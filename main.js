

function main() {
  d3.csv("data/distractors-2/answers.csv", function(answers) {
    answersByUser = preprocessData(answers);
    render(answersByUser);
  });
}

function preprocessData(data) {
  var answersByUser = {};

  for (var i = 0; i < data.length && i < 50000; i++) {
    var row = data[i];
    row.is_correct = row.item_asked_id == row.item_answered_id;
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

function render(data) {
  for (var i = 0; i < data.length; i++) {
    renderExperiment(data[i]);
  }
}

function renderExperiment(data) {
  var span = d3.select("body").append("span");
  span.attr('class','svg-holder');
  span.append("strong").text(getTitle(data));
  var svg = span.append("svg");
  var r = 3;
  var w = 10000;
  var h = data.length * 3 * r + 6 * r;
  svg.attr("width", w)
    .attr("height", h);
  for (var i = 0; i < data.length; i++) {
    var group = svg.append('g');
    drawRow(group, data[i], (i + 1) * 3 * r, r);
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
  };

  var id = data[0][0].experiment_setup_id;
  return AB_VALUES[id] || id;
}

function drawRow(group, row, y, r) {
  var circles = group.selectAll("circle")
    .data(row)
    .enter()
    .append("circle");
  circles.attr("cx", function(d, i) {
    return (i + 1) * r * 2;
  })
  .attr("fill", function(d) {
    return d.is_correct ? 'green' : 'red';
  })
  .attr("cy", y)
  .attr("r", r);
}
main();
