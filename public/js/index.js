
$(document).ready(SetUp());
var roomID;
var username;
var socket = io.connect('http://localhost:8080');

socket.on('Usererror', function(data) {
  showError();//Show the error when the server tells us there's an error with the username
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
socket.on('newUserConnected', function(data) {
  $('#chatbox').append(
    '<div class="row message-bubble">'+
      '<span><strong>'+data.user+'</strong> has joined the party!</span>'+
    '</div>'
  );//Showing the new message

    var objDiv = document.getElementById("chatbox");//Autoscroll
    objDiv.scrollTop = objDiv.scrollHeight;
});
$('#newRoomForm').submit(function () {
  socket.emit('newRoomReq', {user:username,roomName:$('#roomName').val(),roomMax:$('#roomMax').val()}); // Sending the request to the server via Socket.io (not HTTP requests)
  return false; // Blocks the classical POST method
});
$('#chatform').submit(function () {
  msg = $('#ChatInput').val(); //Getting the value of the input
  $('#ChatInput').val(''); //Emptying the input
  $('.emojionearea-editor').text(''); //Emptying the input
  if(msg!=''){
    socket.emit('message', {user:username,msg:msg,Roomid:roomID});//Sending the message to the server
  }
  return false;
});
$('#searchform').submit(function () {
  socket.emit('roomReq');//Sending the request
  return false;
});
$('#loginForm').submit(function () {
  username = $('#username').val();
  socket.emit('userLogin', username);
  return false;
});
$(document).on('click', '.connectButton', function () {
  id = $(this).attr('id');
  connectToRoom(id);
});
$('#ChatInput').keypress(function(e){
if (e.keyCode == 13) {
  console.log("press");
$('#chatform').submit();
}
});
function displayRooms(rooms){
  $("#RoomSearchSectionTable").empty();
    for (var i=0; i<rooms.length;i++){
      $('#RoomSearchSectionTable').prepend(
        '<tr><td><div class="connectButton"id="'+rooms[i].id +'" align="center"><div class="buttonContent"><div class="RoomName">'+ rooms[i].name+ ' </div><div class="RoomDetails"><i class="fa fa-user" aria-hidden="true"></i>' +rooms[i].user+' / <i class="fa fa-users" aria-hidden="true"></i>'+rooms[i].userCount+'/'+rooms[i].roomMax+'</div></div> </div></td></tr>');
  }
}
function connectToRoom(id) {
  roomID=id;
  socket.emit("connectToRoom",{user:username,Roomid:id})
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
}
function showError(){
  $("#loginSection").show();
  $("#error").show();
  $("#chooseMenuSection").hide();
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

//Two tabs
$('.tab a').on('click', function (e) {
  e.preventDefault();

  $(this).parent().addClass('active');
  $(this).parent().siblings().removeClass('active');

  target = $(this).attr('href');

  $('.tab-content > div').not(target).hide();

  $(target).fadeIn(600);

});
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
