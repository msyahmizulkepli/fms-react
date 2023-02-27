import React, { Component } from "react";
import { Joystick } from "react-joystick-component";
import {Row, Col, Form, InputGroup , ToggleButton, ToggleButtonGroup } from "react-bootstrap";
import { BsJoystick, BsKeyboard } from "react-icons/bs";
import Config from "../scripts/config";

class Teleoperation extends Component {
    state = {
		ros : null,
		key_teleop : true,
		key_teleop_obj : null,
		joy_teleop : false,
        robot_teleop : 1
	};

	constructor(){
		super();
		this.init_connection();
		this.initTeleopKeyboard();
		this.handleMove = this.handleMove.bind(this);
		this.handleStop = this.handleStop.bind(this);
		this.initTeleopKeyboard = this.initTeleopKeyboard.bind(this);
	}

	changeTeleopState(){
		this.setState({key_teleop:!this.state.key_teleop});
		this.setState({joy_teleop:!this.state.joy_teleop});
		console.log("key_teleop : "+this.state.key_teleop+" , joy_teleop : "+this.state.joy_teleop);
		if(this.state.key_teleop){
		    this.state.key_teleop_obj.scale=1.0;
		}
		else{
			this.state.key_teleop_obj.scale=0.0;
		}
	}

	init_connection(){
		// eslint-disable-next-line
		this.state.ros = new window.ROSLIB.Ros();

		this.state.ros.on("connection", () => {
			console.info("Connected to ROS:TELEOP");
		});

		this.state.ros.on("close", () => {
			console.warn("Disconnected from ROS:TELEOP");
			setTimeout(()=>{
				try{
					this.state.ros.connect(
						"ws://"+Config.ROSBRIDGE_SERVER_IP+":"+Config.ROSBRIDGE_SERVER_PORT+""
					);
				}catch(error){
					console.error("Connection problem : TELEOP");
				}
			},Config.RECONNECTION_TIMER);
		});

		this.state.ros.on("error", (error) => {});

		try{
			this.state.ros.connect(
				"ws://"+Config.ROSBRIDGE_SERVER_IP+":"+Config.ROSBRIDGE_SERVER_PORT+""
			);
		}catch(error){
			console.error("Connection problem : TELEOP");
		}
	}

	initTeleopKeyboard() {
	    if (this.state.key_teleop_obj == null){
            switch(this.state.robot_teleop){
                case 1: {
                    this.state.key_teleop_obj = new window.KEYBOARDTELEOP.Teleop({
                        ros: this.state.ros,
                        topic: Config.ROBOT1_NAMESPACE+Config.CMD_VEL_TOPIC
                    })
                };
                break;
                case 2: {
                    this.state.key_teleop_obj = new window.KEYBOARDTELEOP.Teleop({
                        ros: this.state.ros,
                        topic: Config.ROBOT2_NAMESPACE+Config.CMD_VEL_TOPIC
                    })
                };
                break;
                default: ;
            }
	        this.state.key_teleop_obj.scale=0.0;
	    }
	}

	handleMove(event){
		console.log("handle move");
		//create a ROS publisher to /cmd_vel
        var cmd_vel;
		switch(this.state.robot_teleop){
            case 1:{
                cmd_vel = new window.ROSLIB.Topic({
                    ros: this.state.ros,
                    name: Config.ROBOT1_NAMESPACE+Config.CMD_VEL_TOPIC,
                    messageType: "geometry_msgs/Twist"
                });
            };
            break;
            case 2:{
                cmd_vel = new window.ROSLIB.Topic({
                    ros: this.state.ros,
                    name: Config.ROBOT2_NAMESPACE+Config.CMD_VEL_TOPIC,
                    messageType: "geometry_msgs/Twist"
                });
            };
            break;
            default: ;
        }
		//create twist message to be published
		var twist = new window.ROSLIB.Message({
			linear:{
				x: event.y/150,
				y: 0,
				z: 0
			},
			angular:{
				x: 0,
				y: 0,
				z: -event.x/75
			}
		});
		//publish the message to /cmd_vel
		cmd_vel.publish(twist);	
        console.log(this.state.robot_teleop.toString()+" is moving")				
	}

	handleStop(event){
		console.log("handle stop");
		//create a ROS publisher to /cmd_vel
		var cmd_vel;
		switch(this.state.robot_teleop){
            case 1:{
                cmd_vel = new window.ROSLIB.Topic({
                    ros: this.state.ros,
                    name: Config.ROBOT1_NAMESPACE+Config.CMD_VEL_TOPIC,
                    messageType: "geometry_msgs/Twist"
                });
            };
            break;
            case 2:{
                cmd_vel = new window.ROSLIB.Topic({
                    ros: this.state.ros,
                    name: Config.ROBOT2_NAMESPACE+Config.CMD_VEL_TOPIC,
                    messageType: "geometry_msgs/Twist"
                });
            };
            break;
            default: ;
        }
		//create twist message to be published
		var twist = new window.ROSLIB.Message({
			linear:{
				x: 0,
				y: 0,
				z: 0
			},
			angular:{
				x: 0,
				y: 0,
				z: 0
			}
		});
		//publish the message to /cmd_vel
		cmd_vel.publish(twist);				

	}

	render() {
		return ( 
			<div>
                <Row>
                    <Col align="center">
                        <ToggleButtonGroup type="radio" name="robot_teleop_btn" onChange={(value)=>{this.setState({robot_teleop: value}); console.log(value)}}>
                            <ToggleButton id="robot1_teleop_btn" value={1} variant="outline-info">
                                Robot 1
                            </ToggleButton>
                            <ToggleButton id="robot2_teleop_btn" value={2} variant="outline-danger">
                                Robot 2
                            </ToggleButton>
                        </ToggleButtonGroup>
                    </Col>
                </Row>
                <Row className="mt-3">
                    <Col align="center">
                            <Joystick disabled={this.state.joy_teleop} size={100} baseColor="#BBBBBB" stickColor={this.state.joy_teleop?"#DDDDDD":"#EEEEEE"} move={this.state.joy_teleop?this.handleStop:this.handleMove} stop={this.handleStop}/>
                    </Col>
                    <Col align="left">
                        <Form>
                        <InputGroup>
                            <Form.Check label="KEYBOARD" name="teleop" type="radio" id="key-teleop-radio" ref="key_teleop_radio_ref" checked={!this.state.key_teleop}  onChange={()=>{this.changeTeleopState();}}/>
                            &emsp;<BsKeyboard size={30}/>
                        </InputGroup><br></br>
                        <InputGroup>
                            <Form.Check label="JOYSTICK" name="teleop" type="radio" id="joy-teleop-radio" ref="joy_teleop_radio_ref" checked={!this.state.joy_teleop}  onChange={()=>{this.changeTeleopState();}}/>
                            &emsp;&ensp;<BsJoystick size={30}/>
                        </InputGroup>                    
                        </Form>
                    </Col>
                </Row>
			</div>
		);
	}
}

export default Teleoperation;