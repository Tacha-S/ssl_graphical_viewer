var fs = require('fs');
var dgram = require('dgram');
var protobuf = require('protobufjs');

var stages = [
    "NORMAL_FIRST_HALF_PRE",
    "NORMAL_FIRST_HALF",
    "NORMAL_HALF_TIME",
    "NORMAL_SECOND_HALF_PRE",
    "NORMAL_SECOND_HALF",
    "EXTRA_TIME_BREAK",
    "EXTRA_FIRST_HALF_PRE",
    "EXTRA_FIRST_HALF",
    "EXTRA_HALF_TIME",
    "EXTRA_SECOND_HALF_PRE",
    "EXTRA_SECOND_HALF",
    "PENALTY_SHOOTOUT_BREAK",
    "PENALTY_SHOOTOUT",
    "POST_GAME"
];

var commands = [
    "HALT",
    "STOP",
    "NORMAL_START",
    "FORCE_START",
    "PREPARE_KICKOFF_YELLOW",
    "PREPARE_KICKOFF_BLUE",
    "PREPARE_PENALTY_YELLOW",
    "PREPARE_PENALTY_BLUE",
    "DIRECT_FREE_YELLOW",
    "DIRECT_FREE_BLUE",
    "INDIRECT_FREE_YELLOW",
    "INDIRECT_FREE_BLUE",
    "TIMEOUT_YELLOW",
    "TIMEOUT_BLUE",
    "GOAL_YELLOW",
    "GOAL_BLUE"
];

//read referee config
var referee_config = JSON.parse(fs.readFileSync(__dirname + "/configs/network.json", "utf-8"));
var PORT = referee_config.referee_port_num;

var referee_client = dgram.createSocket('udp4');

//ready to recieve multicast message
referee_client.on('listening', function() {
  var address = referee_client.address();
  referee_client.setBroadcast(true);
  referee_client.setMulticastTTL(128);
  referee_client.addMembership(referee_config.referee_multicast_address);
})

//analyze protobuf
var referee_builder = protobuf.loadProtoFile(__dirname + "/proto/referee.proto");
var referee_data = referee_builder.build("SSL_Referee");

//recieve a message
referee_client.on('message', function(message, remote){
  var packet = referee_data.decode(message);
  document.getElementById('stage').innerHTML = stages[packet.stage];
  document.getElementById('command').innerHTML = commands[packet.command];
  var sec = parseInt((packet.stage_time_left/1000000)%60);
  if(sec < 10)
    document.getElementById('time').innerHTML = parseInt(packet.stage_time_left/60000000) + ":0" + sec;
  else
    document.getElementById('time').innerHTML = parseInt(packet.stage_time_left/60000000) + ":" + sec;
  document.getElementById('blue').innerHTML = packet.blue.name;
  document.getElementById('blue_score').innerHTML = packet.blue.score;
  document.getElementById('yellow').innerHTML = packet.yellow.name;
  document.getElementById('yellow_score').innerHTML = packet.yellow.score;
})



//binding port num.
referee_client.bind(PORT);
