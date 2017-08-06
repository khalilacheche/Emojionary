//Khalil Acheche & Amir Braham
//Emojionary
//Project Started on 09/06/2017 (dd/mm/yyyy)

$(document).ready(SetUp());
var uid;
firebase.auth().onAuthStateChanged(function(user) {
  if (user) {
     var isAnonymous = user.isAnonymous;
     //uid = user.uid;
//Sending a handshake to the server so see if we are already connected to a user
   } else {
   }
   // ...
});
 /* TO SIGN OUT , JUST UNCOMMENT THIS CODE
 firebase.auth().signOut().then(function() {
   console.log('Signed Out');
 }, function(error) {
   console.error('Sign Out Error', error);
 });
 */
//Var declaration
var roomID,
    username,
    timer,
    countdown,
    socket = io(),
    popup = document.getElementById('wordPopup');
//Events
socket.on('welcome',function(data){ //When the server recognizes us, it sends a welcome event for us to show the room
  console.log("receiving welcome");
  roomID= data.roomID;
  username= data.username;
  showRoom();
})
socket.on('Usererror', function(data) {
  showError(data);//Show the error when the server tells us there's an error with the username
});
socket.on('roomRes',function(data){
    displayRooms(data.rooms); //Displaying the rooms available
});
socket.on('authenticated', function(data) {
  showChooseMenu(); //Showing the menu
});
socket.on('connected', function(data) {
  if(data!=undefined){
    roomID=data.Roomid; //Getting the id of the room we are connected to
  }
  showRoom();//Showing the room
  firebase.auth().onAuthStateChanged(function(user) {
  if (user) {
      // User is signed in.
      var isAnonymous = user.isAnonymous;
      var uid = user.uid;
      //console.log(uid);
      // ...
    } else {
      firebase.auth().signInAnonymously().catch(function(error) {
        // Handle Errors here.
        var errorCode = error.code;
        var errorMessage = error.message;
        // ...
      });
    }
    // ...
  });
});
socket.on('message', function(data) {
  $('#chatbox').append(
    '<div class="row message-bubble" style="background-color:'+data.color+';">'+
      ' <p class="text-muted">'+data.user+'</p>'+
      '<span>'+data.msg+'</span>'+
    '</div>'
  );//Showing the new message

    var objDiv = document.getElementById("chatbox");//AutoScroll
    objDiv.scrollTop = objDiv.scrollHeight;
});
socket.on('info', function(message) {
  $('#chatbox').append(
    '<div class="row message-bubble">'+
      '<span><strong>'+message+'</strong></span>'+
    '</div>'
  );//Showing the new message

    var objDiv = document.getElementById("chatbox");//Autoscroll
    objDiv.scrollTop = objDiv.scrollHeight;
});
socket.on('startGameCountdown', function(start) {
  window.clearInterval(countdown);
  window.clearInterval(timer);
  var time = start;
  $('#countdown').show();
  countdown = setInterval(function(){
    document.getElementById("countdown").innerHTML = time;
    time--;
    if(time==0){
      window.clearInterval(countdown);
      $('#countdown').hide();
    }
  }, 1000);
});
socket.on('StartNextTurn', function(data) {
  window.clearInterval(timer);
  startTimer(10);
  $(".popup-body").empty();
  for (var i = 0; i < data.words.length; i++) {
    $('.popup-body').append(
      '<button type="button" class="btn btn-secondary btn-lg btn-block" onclick="sendChosenWord(\''+data.words[i]+'\'); ">'+data.words[i]+'</button>'
    );
  }
  popup.style.display = "block";
});
//Submit functions
$('#newRoomForm').submit(function () {
  if($('#roomMax').val() > 0 ) {
    socket.emit('newRoomReq', {user:username,roomName:$('#roomName').val(),roomMax:$('#roomMax').val()}); // Sending the request to the server via Socket.io (not HTTP requests)
  }
  return false; // Blocks the classical POST method
});
$('#chatform').submit(function () {
  msg = $('#ChatInput').val(); //Getting the value of the input
  $('#ChatInput').val(''); //Emptying the input
  if(msg!=''){
    socket.emit('message', {user:username,msg:msg,Roomid:roomID});//Sending the message to the server
  }
  return false;
});
$('#searchform').submit(function () {
  var searchterm=$('#searchterm').val();
  socket.emit('roomReq',searchterm);//Sending the search request
  return false;
});
$('#loginForm').submit(function () {
  username = $('#username').val();
  socket.emit('userLogin', {username:username,uid:uid});

  return false;
});
$(document).on('click', '.connectButton', function () {
  id = $(this).attr('id');
  connectToRoom(id);
});

document.addEventListener('keydown', function(event) {
    if(event.keyCode == 13) {
      $('#chatform').submit();

    }
});
//Custom functions
function displayRooms(rooms){
  $("#RoomSearchSectionTable").empty();
    for (var i=0; i<rooms.length;i++){
      $('#RoomSearchSectionTable').prepend(
        '<tr><td><div class="connectButton"id="'+rooms[i].id +'" align="center"><div class="buttonContent"><div class="RoomName">'+ rooms[i].name+ ' </div><div class="RoomDetails"><i class="fa fa-user" aria-hidden="true"></i>' +rooms[i].user+' / <i class="fa fa-users" aria-hidden="true"></i>'+rooms[i].userCount+'/'+rooms[i].roomMax+'</div></div> </div></td></tr>');
  }
}
function startTimer(start){
  time=start;
  timer = setInterval(function(){
    document.getElementById("timer").innerHTML = time;
    document.getElementById("countdown").innerHTML = time;
    time--;
    if(time==0){
      window.clearInterval(timer);
        popup.style.display = "none";
    }
  }, 1000);

}
function connectToRoom(id) {
  roomID=id;
  socket.emit("connectToRoom",{user:username,Roomid:id});
}
function newRoomClick(){
  $("#searchRoomSection").hide();
  $("#newRoomSection").show();
}
function SetUp(){
  $(".room").hide();
  $("#loginSection").show();
  $("#error").hide();
  $("#chooseMenuSection").hide();
  firebase.auth().signInAnonymously().catch(function(error) {
    // Handle Errors here.
    var errorCode = error.code;
    var errorMessage = error.message;
    // ...
  });
  setTimeout(function () {
    uid = firebase.auth().currentUser.uid;
    console.log(uid);
    socket.emit("handshake",uid);
  }, 1000);

}
function showError(msg){
  $("#error").text(msg);
  $("#error").show();
  console.log($("#error").text());
}
function showChooseMenu(){
  $("#loginSection").hide();
  $("#error").hide();
  $("#chooseMenuSection").show();
}
function showRoom(){
  $(".room").show();
  $(".form").hide();
}
function sendChosenWord(word){
  window.clearInterval(timer);
  window.clearInterval(countdown);
  socket.emit('ChosenWord',{user:username,Roomid:roomID,word:word});
  popup.style.display = "none";
  startTimer(60);
  $('#countdown').show();
}
//Two tabs
$('.tab a').on('click', function (e) {
  e.preventDefault();
  console.log($(this).parent().attr('id'));
  if($(this).parent().attr('id')=="search"){
    console.log("click");
    socket.emit("roomReq");
  }
  $(this).parent().addClass('active');
  $(this).parent().siblings().removeClass('active');
  target = $(this).attr('href');

  $('.tab-content > div').not(target).hide();

  $(target).fadeIn(600);

});


  //Popup


/*$('.form').find('input, textarea').on('keyup blur focus', function (e) {

  var $this = $(this),
      label = $this.prev('label');

	  if (e.type === 'keyup') {
			if ($this.val() === '') {
          label.removeClass('active highlight');
        } else {
          label.addClass('active highlight');
        }
    } else if (e.type === 'blur') {
    	if( $this.val() === '' ) {
    		label.removeClass('active highlight');
			} else {
		    label.removeClass('highlight');
			}
    } else if (e.type === 'focus') {

      if( $this.val() === '' ) {
    		label.removeClass('highlight');
			}
      else if( $this.val() !== '' ) {
		    label.addClass('highlight');
			}
    }

});*/
