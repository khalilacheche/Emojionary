//Khalil Acheche & Amir Braham
//Emojionary
//Project Started on 09/06/2017 (dd/mm/yyyy)

var express = require('express'),
  request = require('request'),
  AppleEmojiesBody,
  names = [],
  images = [],
  detailedNames = [],
  bodyParser = require('body-parser');
var app = express(),
  server = require('http').createServer(app),
  io = require('socket.io').listen(server),
  ent = require('ent'),
  fs = require('fs');
var users = [],
  rooms = [],
  userCount = 0,
  roomCount = 0;
var port = process.env.PORT || 3000;
const cheerio = require('cheerio');
const ejsLint = require('ejs-lint'); //Linter/Syntax Checker for EJS Templates.

//app.use(express.static("public"));
app.set('views', __dirname + '/views');
app.use(express.static('public'));
app.use(bodyParser.urlencoded({
  extended: true
}));
app.set('view engine', 'ejs');

app.get('/', function(req, res) {
  //res.sendfile(__dirname + '/index.html');//sending the index file as a response when the user connects to the indexpage
  //console.log(images);
  res.render("index", {
    images: images,
    names: names
  });

});
io.sockets.on('connection', function (socket) {

  socket.on('handshake',function(data){
    for (var i = 0; i < users.length; i++) {
      if(users[i].uid==data){
        //returning the handshake and welcoming the user to his room
        socket.emit("welcome",{username:users[i].username,roomID:users[i].Roomid});
        users[i].sockets.push(socket);//adding this socket to the user's sockets array
        return;
      }
    }
  });
  socket.on('connectToRoom',function(data){
    if (rooms[data.Roomid].connUsers.length==rooms[data.Roomid].roomMax) {
      socket.emit("Usererror","Sorry! This room is already full!");
      return;
    }
    var index= getIndexBysocket(socket);//Getting the index of this user in the users array
    if(users[index].isCTR){
      return; //if the user is already connected to a room, we stop the execution of the function
    }
    for (var i = 0; i < rooms[data.Roomid].connUsers.length; i++) {
      if (rooms[data.Roomid].connUsers[i].username == data.user) {
        return; //if the user is already connected to this room, we stop the execution of the function
      }
    }
    users[index].Roomid = data.Roomid; //Putting the room id in the user object
    users[index].isCTR = true; //Changing the connection state of the user
    var userObj = {};
    userObj = users[index]; //Copying the object of this user in the users array to put it in the connusers array
    rooms[data.Roomid].connUsers.push(userObj); //Pushing the userObj array
    socket.emit("connected"); //Telling the user he's connected
    sendInfo(data.Roomid, data.user + " has joined the Party!");
    if (rooms[data.Roomid].connUsers.length == 2) {
      console.log("starting new game on room " + data.Roomid);
      StartNextTurn(rooms[data.Roomid]);
    }
  });


  socket.on('roomReq',function(data){
    var roomsSend=[];
    var roomRes=[];
    for (var i = 0; i < rooms.length; i++) {
      roomsSend[i]={};
      roomsSend[i].id=rooms[i].id;
      roomsSend[i].user=rooms[i].user;
      roomsSend[i].name=rooms[i].name;
      roomsSend[i].roomMax=rooms[i].roomMax;
      roomsSend[i].userCount=rooms[i].connUsers.length;//Copying the data we want from the rooms object (to save bandwidth)
    }
    if (data==''||data==undefined) {
      socket.emit('roomRes',{rooms:roomsSend});//Sending the full array to the user
      return;
    }
    for (var i = 0; i < roomsSend.length; i++) {
      if(compareStrings(roomsSend[i].user.toLowerCase(),data.toLowerCase())>0.5|| compareStrings(roomsSend[i].name.toLowerCase(),data.toLowerCase())>0.5){
        roomRes.push(roomsSend[i]);
      }
    }
    socket.emit('roomRes',{rooms:roomRes});//Sending the sorted array to the user
  });

  socket.on('newRoomReq', function(data) {
    rooms[roomCount] = {
      user: data.user,
      name: data.roomName,
      roomMax: data.roomMax,
      id: roomCount,
      userTurn: 0
    };
    rooms[roomCount].connUsers = [];
    var index = getIndexBysocket(socket);
    var userObj = {};
    users[index].Roomid = roomCount;
    users[index].isCTR= true;
    userObj = users[index];
    rooms[roomCount].connUsers.push(userObj);
    socket.emit("connected", {
      Roomid: roomCount
    });
    roomCount++;
  });


  socket.on ('userLogin',function(data){
    for (var i = 0; i < users.length; i++) {
      if (users[i].username==data) {
        socket.emit('Usererror',"Sorry! this username already exists!");
        return;
      }
    }
      socket.emit('authenticated');
      users[userCount] = {
        username: data.username,
        sockets:[],//the array of sockets the user has
        isCTR: false,
        score: 0,
        uid:data.uid
      };
      users[userCount].sockets.push(socket);//pushing this socket to the sockets array
      userCount++;

  });
  socket.on('ChosenWord', function(data) {
    if (!data.user == rooms[data.Roomid].connUsers[rooms[data.Roomid].userTurn].username) {
      return;
    }
    clearTimeout(rooms[data.Roomid].timer);
    rooms[data.Roomid].word = data.word;
    for (var i = 0; i < users.length; i++) {
      if (users[i].Roomid == data.Roomid && users[i].username != data.user) {
        for (var j = 0; j < users[i].sockets.length; j++) {
          users[i].sockets[j].emit("startGameCountdown", 60);//Tell all users but the user in this round to start counting
        }
      }
    }
    rooms[data.Roomid].timer = setTimeout(function(){
      timeOut(data.Roomid);
    },60000);
  });
  socket.on('message', function(data) {
    if (data.user == rooms[data.Roomid].connUsers[rooms[data.Roomid].userTurn].username) {
      return;
    }
    var textComp = compareStrings(rooms[data.Roomid].word, data.msg);
    var color;
    if (textComp == 2) {
      color = "#ffffff";
    } else if (textComp < 0.5) {
      color = "#f4d2d2";
    } else if (textComp < 1) {
      color = "#fcffbc";
    } else {
      color = "#caf7e0";
      for (var i = 0; i < users.length; i++) {
        if (users[i].Roomid == data.Roomid) {
          for (var j = 0; j < users[i].sockets.length; j++) {
            users[i].sockets[j].emit("message", {
              msg: data.msg,
              user: data.user,
              color: color
            });
          }
        }
      }
      index = getIndexBysocket(socket);
      users[index].score += 2;
      users[getIndexBysocket(rooms[data.Roomid].connUsers[rooms[data.Roomid].userTurn].sockets[0])].score += 2;
      sendInfo(data.Roomid, data.user + " won this Round!");
      sendInfo(data.Roomid, data.user + "'s score: " + users[getIndexBysocket(rooms[data.Roomid].connUsers[rooms[data.Roomid].userTurn].sockets[0])].score);
      sendInfo(data.Roomid, rooms[data.Roomid].connUsers[rooms[data.Roomid].userTurn].username + "'s score: " + users[index].score);
      clearTimeout (rooms[data.Roomid].timer);
      StartNextTurn(rooms[data.Roomid]);
      return;
    }
    for (var i = 0; i < users.length; i++) {
      if (users[i].Roomid == data.Roomid) {
        for (var j = 0; j < users[i].sockets.length; j++) {
          users[i].sockets[j].emit("message", {
            msg: data.msg,
            user: data.user,
            color: color
          });
        }
      }
    }
  });
  socket.on('disconnect', function() {
    var index = getIndexBysocket(socket);
    if (index==-1)
      return ;
    if (users[index].isCTR==false){
      return ;
    }
    for (var i = 0; i < users[index].sockets.length; i++) {

      if(users[index].sockets[i].id == socket.id){
        users[index].sockets.splice(i,1);
        break;
      }
    }
    if(users[index].sockets.length>0)
      return;
    sendInfo(users[index].Roomid,users[index].username+" left the party!");
    var socketid;
    if (rooms[users[index].Roomid].connUsers[rooms[users[index].Roomid].userTurn] != undefined) {
      socketids =[];
      for (var i = 0; i < rooms[users[index].Roomid].connUsers[rooms[users[index].Roomid].userTurn].sockets.length; i++) {
        socketids[i]=rooms[users[index].Roomid].connUsers[rooms[users[index].Roomid].userTurn].sockets[i].id
      }
    }
    rooms[users[index].Roomid].connUsers.splice(getIndexBysocket(socket, rooms[users[index].Roomid].connUsers), 1);
    if (rooms[users[index].Roomid].connUsers.length < 1) {
      for (var i = 0; i < users.length; i++) {
        if (users[i].Roomid > users[index].Roomid) {
          users[i].Roomid--;
        }
        rooms.splice(users[index].Roomid, 1);
        roomCount--;
      }
    } else {
      for (var i = 0; i < socketids.length; i++) {
        if (socketids[i] == socket.id) {
          StartNextTurn(rooms[users[index].Roomid]);
        }
      }
    }
    users.splice(index, 1);
    userCount--;
  });
});

function compareStrings(str1, str2) {
  if (str1 == undefined || str2 == undefined) {
    return 2;
  }
  var score = 0;
  var length = (str1.length > str2.length) ? str1.length : str2.length;
  for (var i = 0; i < length; i++) {
    if (str1.charAt(i) == str2.charAt(i)) {
      score++;
    }
  }
  return score / length;
}

function getIndexBysocket(socket, array) {
  if (socket == undefined)
    return;
  if (array == undefined) {
    array = users;
  }
  for (var i = 0; i < array.length; i++) {
    for (var j = 0; j < array[i].sockets.length; j++) {
      if(array[i].sockets[j].id == socket.id){
        return i;
      }
    }
  }
  return -1;
}

function StartNextTurn(room) {
  if (rooms[room.id].length == 0) {
    return;
  }
  rooms[room.id].word = undefined;
  room.userTurn++;
  if (room.userTurn > (room.connUsers.length - 1)) {
    room.userTurn = 0;
  }
  sendInfo(room.id, "it's " + room.connUsers[room.userTurn].username + "'s turn");
  for (var i = 0; i < room.connUsers[room.userTurn].sockets.length; i++) {
    room.connUsers[room.userTurn].sockets[i].emit("StartNextTurn", {
      words: ["Hey", "Khalil", "Random", "word"]
    });
  }
  rooms[room.id].timer = setTimeout(function(){
    timeOut(room.id);
  }, 10000);
}

function sendInfo(Roomid, message) {
  for (var i = 0; i < users.length; i++) {
    if (users[i].Roomid == Roomid) {
      for (var j = 0; j < users[i].sockets.length; j++) {
        users[i].sockets[j].emit("info", message);
      }
    }
  }
}
function timeOut(Roomid){
  if (Roomid == undefined || rooms[Roomid] == undefined)
    return;
  var index = getIndexBysocket(rooms[Roomid].connUsers[rooms[Roomid].userTurn].sockets[0])
  users[index].score -= 2;
  sendInfo(Roomid, users[index].username + " timed out! his score: " + users[index].score);
  StartNextTurn(rooms[Roomid]);
}

var w = fs.createWriteStream('downloaded.html');
request('http://emojipedia.org/apple/').pipe(w)

w.on('finish', function() {
  images = [];
  console.log("done");

  var $ = cheerio.load(fs.readFileSync("downloaded.html"));
  $(".emoji-grid").children().children().children().each(function() {
    names.push($(this).attr('alt'));
    images.push($(this).attr('data-src'));
  });
});

server.listen(port, function() {
  console.log('Server Started!');
  //console.log(images[20]);
});
