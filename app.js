//Khalil Acheche
//Emojionary
//Project Started on 09/06/2017 (dd/mm/yyyy)

var express = require('express'),
    request = require('request'),
    AppleEmojiesBody ,
    images = [];
    bodyParser = require('body-parser');
var app = express(),
    server = require('http').createServer(app),
    io = require('socket.io').listen(server),
    ent = require('ent'),
    fs = require('fs');
var users=[],
    rooms=[],
    userCount=0,
    roomCount=0;
const cheerio = require('cheerio');
const ejsLint = require('ejs-lint'); //Linter/Syntax Checker for EJS Templates.

//app.use(express.static("public"));
app.set('views', __dirname+'/views');
app.use(express.static('public'));
app.use(bodyParser.urlencoded({extended: true}));
app.set('view engine', 'ejs');

app.get('/', function (req, res) {
  //res.sendfile(__dirname + '/index.html');//sending the index file as a response when the user connects to the indexpage
  console.log(images);
  res.render("index",{images:images});
});

io.sockets.on('connection', function (socket) {
  socket.on('connectToRoom',function(data){
    var index= getIndexByusername(data.user,users);//Getting the index of this user in the users array
    if(users[index].isCTR){
      return; //if the user is already connected to a room, we stop the execution of the function
    }
    for (var i = 0; i < rooms[data.Roomid].connUsers.length; i++) {
      if (rooms[data.Roomid].connUsers[i].username==data.user) {
        return;//if the user is already connected to this room, we stop the execution of the function
      }
    }
    users[index].Roomid=data.Roomid;//Putting the room id in the user object
    users[index].isCTR=true;//Changing the connection state of the user
    var userObj ={};
    userObj=users[index];//Copying the object of this user in the users array to put it in the connusers array
    rooms[data.Roomid].connUsers.push(userObj);//Pushing the userObj array
    socket.emit("connected");//Telling the user he's connected
    sendInfo(data.Roomid,data.user+" has joined the Party!");
    if (rooms[data.Roomid].connUsers.length==2) {
      console.log("starting new game on room "+data.Roomid);
      StartNextTurn(rooms[data.Roomid]);
    }
  });
  socket.on("TimeOut",function(data){
    if (!data.user==rooms[data.Roomid].connUsers[rooms[data.Roomid].userTurn].username){
      return;
    }
    index=getIndexByusername(data.user,users);
    users[index].score-=2;
    sendInfo(data.Roomid,users[index].username+" timed out! his score: "+users[index].score);
    StartNextTurn(rooms[data.Roomid]);
  });

  socket.on('roomReq',function(){
    var roomRes=[];
    for (var i = 0; i < rooms.length; i++) {
      roomRes[i]={};
      roomRes[i].id=rooms[i].id;
      roomRes[i].user=rooms[i].user;
      roomRes[i].name=rooms[i].name;
      roomRes[i].roomMax=rooms[i].roomMax;
      roomRes[i].userCount=rooms[i].connUsers.length;//Copying the data we want from the rooms object (to save bandwidth)
    }
    socket.emit('roomRes',{rooms:roomRes});//Sending the info to the user
  });

  socket.on('newRoomReq',function(data){
    rooms[roomCount]={user:data.user,name:data.roomName,roomMax:data.roomMax,id:roomCount,userTurn:0};
    rooms[roomCount].connUsers=[];
    var index= getIndexByusername(data.user,users);
    var userObj ={};
    users[index].Roomid=roomCount;
    userObj=users[index];
    rooms[roomCount].connUsers.push(userObj);
    socket.emit("connected",{Roomid:roomCount});
    roomCount++;
  });

  socket.on ('userLogin',function(data){
    if (data in users) {
      socket.emit('Usererror');
    }else {
      socket.emit('authenticated');
      users[userCount]={username:data,socket:socket,isCTR:false,score:0};
      userCount++;
    }
  });
  socket.on ('ChosenWord',function(data){
    if (!data.user==rooms[data.Roomid].connUsers[rooms[data.Roomid].userTurn].username){
      return;
    }
    rooms[data.Roomid].word=data.word;
    for (var i = 0; i < users.length; i++) {
      if (users[i].Roomid==data.Roomid && users[i].username!=data.user ) {
          users[i].socket.emit("startGameCountdown",60);//Tell all users but the user in this round to start counting
      }
    }
  });
  socket.on('message',function(data){
    if (data.user==rooms[data.Roomid].connUsers[rooms[data.Roomid].userTurn].username){
      return;
    }
    var textComp =  compareStrings(rooms[data.Roomid].word,data.msg);
    var color;
    if (textComp==2) {
      color="#ffffff";
    }else if (textComp<0.5) {
      color="#f4d2d2";
    }else if(textComp<1) {
      color="#fcffbc";
    }else {
      color="#caf7e0";
      for (var i = 0; i < users.length; i++) {
        if (users[i].Roomid==data.Roomid) {
          users[i].socket.emit("message",{msg:data.msg,user:data.user,color:color});
        }
      }
      index =getIndexByusername(data.user,users);
      users[index].score+=2;
      users[getIndexByusername(rooms[data.Roomid].connUsers[rooms[data.Roomid].userTurn].username,users)].score+=2;
      sendInfo(data.Roomid,data.user+" won this Round!");
      sendInfo(data.Roomid,data.user+"'s score: "+users[getIndexByusername(rooms[data.Roomid].connUsers[rooms[data.Roomid].userTurn].username,users)].score);
      sendInfo(data.Roomid,rooms[data.Roomid].connUsers[rooms[data.Roomid].userTurn].username+"'s score: "+users[index].score);
      StartNextTurn(rooms[data.Roomid]);
      return;
    }
    for (var i = 0; i < users.length; i++) {
      if (users[i].Roomid==data.Roomid) {
        users[i].socket.emit("message",{msg:data.msg,user:data.user,color:color});
      }
    }
  });
});
function compareStrings(str1,str2){
  if (str1 == undefined || str2 == undefined) {
    return 2;
  }
  var score=0;
  var length = (str1.length > str2.length) ? str1.length :str2.length;
  for (var i = 0; i < length; i++) {
    if (str1.charAt(i)==str2.charAt(i)) {
      score++;
    }
  }
  return score/length;
}

function getIndexByusername(username,array){
  for (var i = 0; i < array.length; i++) {
    if (array[i].username==username) {
      return i;
    }
  }

}
function StartNextTurn(room){
  rooms[room.id].word=undefined;
  room.userTurn++;
  if(room.userTurn>(room.connUsers.length-1)){
    room.userTurn=0;
  }
  sendInfo(room.id,"it's "+room.connUsers[room.userTurn].username+"'s turn");
  room.connUsers[room.userTurn].socket.emit("StartNextTurn",{words:["Hey","Khalil","Random","word"]});
}
function sendInfo(Roomid,message){
  for (var i = 0; i < users.length; i++) {
    if (users[i].Roomid==Roomid) {
      users[i].socket.emit("info",message);
    }
  }
}
var w = fs.createWriteStream('downloaded.html');
request('http://emojipedia.org/apple/').pipe(w)

w.on('finish', function(){
  images = [];
  console.log("done");

  const $ = cheerio.load(fs.readFileSync("downloaded.html"));


      $(".emoji-grid").children().children().children().each(function(){
        images.push($(this).attr('data-src'))
      })
});



  server.listen(8080,function () {
    console.log('Server Started!');
    console.log(images[20]);
  });
