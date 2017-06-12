//Khalil Acheche
//Emojionary
//Project Started on 09/06/2017 (dd/mm/yyyy)

var express = require('express');
var bodyParser = require('body-parser');
var app = express(),
    server = require('http').createServer(app),
    io = require('socket.io').listen(server),
    ent = require('ent'),
    fs = require('fs');
var users=[],
    rooms=[],
    userCount=0,
    roomCount=0;

app.use(express.static("public"));
app.use(bodyParser.urlencoded({extended: true}));
app.set('view engine', 'ejs');

app.get('/', function (req, res) {
  res.sendfile(__dirname + '/index.html');//sending the index file as a response when the user connects to the indexpage
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
    for (var i = 0; i < users.length; i++) {
      if (users[i].Roomid==data.Roomid) {
        users[i].socket.emit("newUserConnected",{user:data.user});//Telling the other users in the same room about the new connection
      }
    }
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
    rooms[roomCount]={user:data.user,name:data.roomName,roomMax:data.roomMax,id:roomCount};
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
      users[userCount]={username:data,socket:socket,isCTR:false};
      userCount++;
    }
  });

  socket.on('message',function(data){
    var textComp =  compareStrings("Hey",data.msg);
    var color;
    if (textComp<0.5) {
      color="#f4d2d2";
    }else if(textComp<1) {
      color="#fcffbc";
    }else {
      color="#caf7e0";
    }
    for (var i = 0; i < users.length; i++) {
      if (users[i].Roomid==data.Roomid) {
        users[i].socket.emit("message",{msg:data.msg,user:data.user,color:color});
      }
    }
  });
});
function compareStrings(str1,str2){
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
  var obj={};
  for (var i = 0; i < array.length; i++) {
    if (array[i].username==username) {
      obj=array[i];
    }
  }
  return array.indexOf(obj);
}
console.log('Server Started!');
server.listen(8080);
