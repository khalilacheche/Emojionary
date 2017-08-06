//Khalil Acheche & Amir Braham
//Emojionary
//Project Started on 09/06/2017 (dd/mm/yyyy)
var Emojis = [];
var EmojiElements = [];
var EmojiID=0;
$('.emoji > img').each(function() {
  var EmojiObject = {};
  $(this).attr("id",EmojiID);
  EmojiObject["ID"] = EmojiID;
  EmojiID++;
  var SplitString = $(this).attr("title").split(" ");
  EmojiObject["Accuracy"] = 0;
  for (var i = 0; i < SplitString.length; i++) {
    var namePair = "word_" + i;
    var valuePair = SplitString[i];
    EmojiObject[namePair] = valuePair;
  }
  Emojis.push(EmojiObject);
});

function levenshteinDistance(a, b) {
  if (a.length == 0) return b.length;
  if (b.length == 0) return a.length;
  var matrix = [];
  for (var i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (var j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }
  for (var i = 1; i <= b.length; i++) {
    for (var j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) == a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, // substitution
          Math.min(matrix[i][j - 1] + 1, // insertion
            matrix[i - 1][j] + 1)); // deletion
      }
    }
  }
  return matrix[b.length][a.length];
}

$('#spotlight').on('keyup', function(e) {
  EmojiElements = [];
  if (e.keyCode == 13) {
    if($('#spotlight').val() =="") {
      Emojis.forEach(function(EmojiObject) {$('#'+EmojiObject["ID"]).show()});
      return;
    }
    Emojis.forEach(function(EmojiObject) {
      CalculateEmojiAccuracy($('#spotlight').val(),EmojiObject);
      if(EmojiObject["Accuracy"] <= 2) {
        $('#'+EmojiObject["ID"]).show();
        EmojiElements.push($('<div>').append($('#'+EmojiObject["ID"]).clone()).html());
      } else {
        $('#'+EmojiObject["ID"]).hide()
      }

    });
    if(EmojiElements.length < 3 ) {
      EmojiElements = []
      Emojis.forEach(function(EmojiObject) {
        if(EmojiObject["Accuracy"] <= 3) {
          $('#'+EmojiObject["ID"]).show()
          EmojiElements.push($('<div>').append($('#'+EmojiObject["ID"]).clone()).html());
        }
      });
    }
  }
});

function CalculateEmojiAccuracy(SearchValue,EmojiObject) {
  var ComparisonResults = []
  Object.keys(EmojiObject).forEach(function(key) {
    if(key != "Accuracy" && key != "ID") {
      ComparisonResults.push(levenshteinDistance(EmojiObject[key],SearchValue))
    }
  })
  var sum = 0;
  for(var g = 0;g < ComparisonResults.length;g++) {
    if(ComparisonResults[g]==1) {
      sum = 0;
      break;
    } else {
      sum += ComparisonResults[g];
    }
  }
  EmojiObject["Accuracy"] = sum / ComparisonResults.length;
  $('#'+EmojiObject["ID"]).attr("acc",sum / ComparisonResults.length);

}
