var fs = require('fs');
var dgram = require('dgram');
var protobuf = require('protobufjs');

var field_initialized = false;

var scale_w = 0;
var scale_h = 0;
var half_width = 0;
var half_height = 0;

var ball_color  = 'rgb(255, 118, 0)';
var field_color = 'rgb(0, 171, 10)';
var line_color  = 'rgb(255, 255, 255)';
var blue_color  = 'rgb(0, 0, 255)';
var yellow_color  = 'rgb(255, 255, 0)';

var canvas = document.getElementById('field');
var ctx = null
if(canvas.getContext){
  ctx = canvas.getContext('2d');
}

canvas.height = 800;//$("#field").height();
canvas.width = 1200;//$("#field").width();

//read vision config
var network_config = JSON.parse(fs.readFileSync(__dirname + "/configs/network.json", "utf-8"));
var PORT = network_config.port_num;

var client = dgram.createSocket('udp4');

//ready to recieve multicast message
client.on('listening', function() {
  var address = client.address();
  client.setBroadcast(true);
  client.setMulticastTTL(128);
  client.addMembership(network_config.multicast_address);
})

//analyze protobuf
var builder = protobuf.loadProtoFile(__dirname + "/proto/messages_robocup_ssl_wrapper.proto");
var packet_data = builder.build("SSL_WrapperPacket");

//recieve a message
client.on('message', function(message, remote){
  var packet = packet_data.decode(message);
  //save geometry info.
  if(packet.geometry != null){
    var geometry = {
      "field_length": packet.geometry.field.field_length,
      "field_width": packet.geometry.field.field_width,
      "goal_width": packet.geometry.field.goal_width,
      "goal_depth": packet.geometry.field.goal_depth,
      "center_circle_radius": packet.geometry.field.center_circle_radius,
      "defense_radius": packet.geometry.field.defense_radius,
      "defense_stretch": packet.geometry.field.defense_stretch,
      "penalty_spot_from_field_line_dist": packet.geometry.field.penalty_spot_from_field_line_dist,
      "referee_width": packet.geometry.field.referee_width,
    };
    fs.writeFile(__dirname + '/configs/geometry.json', JSON.stringify(geometry, null, '    '));
  }

  //draw vision data
  draw(packet.detection);
})


//binding port num.
client.bind(PORT);


function draw(detection){
  draw_field();
  draw_ball(detection.balls);
  draw_robot(detection.robots_yellow, yellow_color);
  draw_robot(detection.robots_blue, blue_color);
}

function translate_x(x){
    return Math.round(x * scale_w + scale_w * half_width);
}

function translate_y(y){
    return Math.round(y * -scale_h + scale_h * half_height);
}


function draw_field(){
  if(fs.readFileSync(__dirname + "/configs/geometry.json", "utf-8")){
    var field_config = JSON.parse(fs.readFileSync(__dirname + "/configs/geometry.json", "utf-8"));
    if(!field_initialized){
      half_height = (field_config.field_width + field_config.referee_width * 2) / 2;
      half_width = (field_config.field_length + field_config.referee_width * 2) / 2;
      scale_h = canvas.height / (field_config.field_width + field_config.referee_width * 2);
      scale_w = canvas.width / (field_config.field_length + field_config.referee_width * 2);
      field_initialized = true;
    }

    //field base draw
    ctx.fillStyle = field_color;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    //line draw
    ctx.beginPath();
    ctx.strokeStyle = line_color;
    ctx.strokeRect(( scale_w * field_config.referee_width),
                   ( scale_h * field_config.referee_width),
                   ( scale_w * field_config.field_length),
                   ( scale_h * field_config.field_width));
    //center line
    ctx.beginPath();
    ctx.lineTo(translate_x(0), translate_y(-field_config.field_width / 2));
    ctx.lineTo(translate_x(0), translate_y(field_config.field_width / 2));
    ctx.closePath();
    ctx.stroke();

    //goal
    ctx.beginPath();
    ctx.lineTo(translate_x(field_config.field_length / 2), translate_y(field_config.goal_width / 2));
    ctx.lineTo(translate_x(field_config.field_length / 2 + field_config.goal_depth), translate_y(field_config.goal_width / 2));
    ctx.lineTo(translate_x(field_config.field_length / 2 + field_config.goal_depth), translate_y(-field_config.goal_width / 2));
    ctx.lineTo(translate_x(field_config.field_length / 2), translate_y(-field_config.goal_width / 2));
    ctx.closePath();
    ctx.stroke();
    ctx.beginPath();
    ctx.lineTo(translate_x(-field_config.field_length / 2), translate_y(field_config.goal_width / 2));
    ctx.lineTo(translate_x(-field_config.field_length / 2 - field_config.goal_depth), translate_y(field_config.goal_width / 2));
    ctx.lineTo(translate_x(-field_config.field_length / 2 - field_config.goal_depth), translate_y(-field_config.goal_width / 2));
    ctx.lineTo(translate_x(-field_config.field_length / 2), translate_y(-field_config.goal_width / 2));
    ctx.closePath();
    ctx.stroke();


    //center circle
    ctx.beginPath();
    ctx.arc(translate_x(0), translate_y(0),
            scale_w * field_config.center_circle_radius, 0, Math.PI*2, false);
    ctx.stroke();

    //defense area
    ctx.beginPath();
    ctx.lineTo(translate_x(-field_config.field_length / 2 + field_config.defense_radius),
            translate_y(field_config.defense_stretch / 2));
    ctx.arc(translate_x(-field_config.field_length / 2),
            translate_y(field_config.defense_stretch / 2),
            scale_w * field_config.defense_radius, 0, -Math.PI / 2, true);
    ctx.arc(translate_x(-field_config.field_length / 2),
            translate_y(-field_config.defense_stretch / 2),
            scale_w * field_config.defense_radius, Math.PI / 2, 0, true);
    ctx.lineTo (translate_x(-field_config.field_length / 2 + field_config.defense_radius),
                translate_y(-field_config.defense_stretch / 2));
    ctx.closePath();
    ctx.stroke();
    ctx.beginPath();
    ctx.lineTo(translate_x(field_config.field_length / 2 - field_config.defense_radius),
            translate_y(field_config.defense_stretch / 2));
    ctx.arc(translate_x(field_config.field_length / 2),
            translate_y(field_config.defense_stretch / 2),
            scale_w * field_config.defense_radius, -Math.PI, -Math.PI / 2, false);
    ctx.arc(translate_x(field_config.field_length / 2),
            translate_y(-field_config.defense_stretch / 2),
            scale_w * field_config.defense_radius, Math.PI / 2, Math.PI, false);
    ctx.lineTo(translate_x(field_config.field_length / 2 - field_config.defense_radius),
                translate_y(-field_config.defense_stretch / 2));
    ctx.closePath();
    ctx.stroke();
  }
}

function draw_ball(balls){
  for(var i = 0; i < balls.length; i++){
    ctx.beginPath();
    ctx.fillStyle = ball_color;
    ctx.arc(translate_x(balls[i].x), translate_y(balls[i].y), scale_w * 20, 0, Math.PI*2.0, true);
    ctx.fill();
  }
}

function draw_robot(robots, color){
  for(var i = 0; i < robots.length; i++){
    var image = new Image();
    if(color == yellow_color)
      image.src = __dirname + "/images/robots/yellow/" + robots[i].robot_id + ".png";
    else
      image.src = __dirname + "/images/robots/blue/" + robots[i].robot_id + ".png";
    ctx.save();
    ctx.translate(translate_x(robots[i].x - 90), translate_y(robots[i].y + 90));
    ctx.rotate(robots[i].orientation + Math.PI / 2);
    ctx.drawImage(image, 0, 0, scale_w * 180, scale_h * 180);
    ctx.restore();
  }
}
