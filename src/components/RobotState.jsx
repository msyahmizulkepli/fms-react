import React, { Component } from "react";
import {Row, Col, ListGroup, ListGroupItem} from "react-bootstrap";
import Config from "../scripts/config";
import * as Three from "three";

class RobotState extends Component {
	state = {
		ros:null,
		x1:0,
		y1:0,
		orientation1:0,
		linear_velocity1:0,
		angular_velocity1:0,
		pwm1:80,
		pwm_turn1:60,
		pwm_control1:false,
		lwheel1:0,
		rwheel1:0,
        x2:0,
		y2:0,
		orientation2:0,
		linear_velocity2:0,
		angular_velocity2:0,
		pwm2:80,
		pwm_turn2:60,
		pwm_control2:false,
		lwheel2:0,
		rwheel2:0
	};

	constructor(){
		super();
		this.init_connection();
		this.changePwm = this.changePwm.bind(this);
	}

	init_connection(){
		// eslint-disable-next-line
		this.state.ros = new window.ROSLIB.Ros();

		this.state.ros.on("connection", () => {
			console.info("Connected to ROS:ROBOTSTATE");
			this.setState({connected:true});
		});

		this.state.ros.on("close", () => {
			console.warn("Disconnected from ROS:ROBOTSTATE");
			this.setState({connected:false});
			//try to reconnect every 3 seconds
			setTimeout(()=>{
				try{
					this.state.ros.connect(
						"ws://"+Config.ROSBRIDGE_SERVER_IP+":"+Config.ROSBRIDGE_SERVER_PORT+""
					);
				}catch(error){
					console.error("Connection problem : ROBOTSTATE");
				}
			},Config.RECONNECTION_TIMER);
		});

		try{
			this.state.ros.connect(
				"ws://"+Config.ROSBRIDGE_SERVER_IP+":"+Config.ROSBRIDGE_SERVER_PORT+""
			);
		}catch(error){
			console.error("Connection problem : ROBOTSTATE");
		}

		this.state.ros.on("error", (error) => {
			// console.log('Error connecting to ROS: ', error);
		});
	}

	componentDidMount(){
		this.getRobotState();
		this.changePwm(0,0);
	}

	getRobotState(){
        /////////////////////////////////Robot1/////////////////////////////////

		//create a twist subscriber
		var vel_subscriber1 = new window.ROSLIB.Topic({
			ros : this.state.ros,
			name : Config.ROBOT1_NAMESPACE+Config.CMD_VEL_TOPIC,
			messageType : "geometry_msgs/Twist"
			//messageType: "geometry_msgs/PoseWithCovariance"
		});
		//create a twist callback
		vel_subscriber1.subscribe((message)=>{
			this.setState({linear_velocity1:message.linear.x});
			this.setState({angular_velocity1:message.angular.z});
		});

		//create a pose subscriber
		var pose_subscriber1 = new window.ROSLIB.Topic({
			ros : this.state.ros,
			name : Config.ROBOT1_NAMESPACE+Config.ODOM_TOPIC,
			messageType : "geometry_msgs/PoseWithCovarianceStamped"
		});
		//create a pose callback
		pose_subscriber1.subscribe((message)=>{
			this.setState({x1:message.pose.pose.position.x});
			this.setState({y1:message.pose.pose.position.y});
			this.setState({orientation1:this.getOrientationFromQuaternion(message.pose.pose.orientation)});
		});

		//create a pwm subscriber
		var pwm_subscriber1 = new window.ROSLIB.Topic({
			ros : this.state.ros,
			name : Config.ROBOT1_NAMESPACE+Config.PWM_TOPIC,
			messageType : "std_msgs/Int16"
		});
		//create a pwm callback
		pwm_subscriber1.subscribe((message)=>{
			this.setState({pwm1:message.data});
		});

		//create a pwm turn subscriber
		var pwm_turn_subscriber1 = new window.ROSLIB.Topic({
			ros : this.state.ros,
			name : Config.ROBOT1_NAMESPACE+Config.PWM_TURN_TOPIC,
			messageType : "std_msgs/Int16"
		});
		//create a pwm callback
		pwm_turn_subscriber1.subscribe((message)=>{
			this.setState({pwm_turn1:message.data});
		});

		//create a lwheel subscriber
		var lwheel_subscriber1 = new window.ROSLIB.Topic({
			ros : this.state.ros,
			name : Config.ROBOT1_NAMESPACE+Config.ENCODER_LEFT_TOPIC,
			messageType : "std_msgs/Int16"
		});
		//create a lwheel callback
		lwheel_subscriber1.subscribe((message)=>{
			this.setState({lwheel1:message.data});
		});

		//create a rwheel subscriber
		var rwheel_subscriber1 = new window.ROSLIB.Topic({
			ros : this.state.ros,
			name : Config.ROBOT1_NAMESPACE+Config.ENCODER_RIGHT_TOPIC,
			messageType : "std_msgs/Int16"
		});
		//create a rwheel callback
		rwheel_subscriber1.subscribe((message)=>{
			this.setState({rwheel1:message.data});
		});

        /////////////////////////////////Robot2/////////////////////////////////

        //create a twist subscriber
		var vel_subscriber2 = new window.ROSLIB.Topic({
			ros : this.state.ros,
			name : Config.ROBOT2_NAMESPACE+Config.CMD_VEL_TOPIC,
			messageType : "geometry_msgs/Twist"
			//messageType: "geometry_msgs/PoseWithCovariance"
		});
		//create a twist callback
		vel_subscriber2.subscribe((message)=>{
			this.setState({linear_velocity2:message.linear.x});
			this.setState({angular_velocity2:message.angular.z});
		});

		//create a pose subscriber
		var pose_subscriber2 = new window.ROSLIB.Topic({
			ros : this.state.ros,
			name : Config.ROBOT2_NAMESPACE+Config.ODOM_TOPIC,
			messageType : "geometry_msgs/PoseWithCovarianceStamped"
		});
		//create a pose callback
		pose_subscriber2.subscribe((message)=>{
			this.setState({x2:message.pose.pose.position.x});
			this.setState({y2:message.pose.pose.position.y});
			this.setState({orientation2:this.getOrientationFromQuaternion(message.pose.pose.orientation)});
		});

		//create a pwm subscriber
		var pwm_subscriber2 = new window.ROSLIB.Topic({
			ros : this.state.ros,
			name : Config.ROBOT2_NAMESPACE+Config.PWM_TOPIC,
			messageType : "std_msgs/Int16"
		});
		//create a pwm callback
		pwm_subscriber2.subscribe((message)=>{
			this.setState({pwm2:message.data});
		});

		//create a pwm turn subscriber
		var pwm_turn_subscriber2 = new window.ROSLIB.Topic({
			ros : this.state.ros,
			name : Config.ROBOT2_NAMESPACE+Config.PWM_TURN_TOPIC,
			messageType : "std_msgs/Int16"
		});
		//create a pwm callback
		pwm_turn_subscriber2.subscribe((message)=>{
			this.setState({pwm_turn2:message.data});
		});

		//create a lwheel subscriber
		var lwheel_subscriber2 = new window.ROSLIB.Topic({
			ros : this.state.ros,
			name : Config.ROBOT2_NAMESPACE+Config.ENCODER_LEFT_TOPIC,
			messageType : "std_msgs/Int16"
		});
		//create a lwheel callback
		lwheel_subscriber2.subscribe((message)=>{
			this.setState({lwheel2:message.data});
		});

		//create a rwheel subscriber
		var rwheel_subscriber2 = new window.ROSLIB.Topic({
			ros : this.state.ros,
			name : Config.ROBOT2_NAMESPACE+Config.ENCODER_RIGHT_TOPIC,
			messageType : "std_msgs/Int16"
		});
		//create a rwheel callback
		rwheel_subscriber2.subscribe((message)=>{
			this.setState({rwheel2:message.data});
		});
	}

	changePwm(dpwm,dpwm_turn){
	    var pwm_publisher = new window.ROSLIB.Topic({
	        ros: this.state.ros,
	        name: Config.PWM_TOPIC,
	        messageType: 'std_msgs/Int16'
	    });
	    var pwm_turn_publisher = new window.ROSLIB.Topic({
	        ros: this.state.ros,
	        name: Config.PWM_TURN_TOPIC,
	        messageType: 'std_msgs/Int16'
	    });
	    var pwm_msg = new window.ROSLIB.Message({
	        data: this.state.pwm+dpwm
	    });
	    var pwm_turn_msg = new window.ROSLIB.Message({
	        data: this.state.pwm_turn+dpwm_turn
	    });
	    pwm_publisher.publish(pwm_msg);
	    pwm_turn_publisher.publish(pwm_turn_msg);
	}

	changeROSState(){
		this.setState({pwm_control:!this.state.pwm_control});
	    var pwm_control_publisher = new window.ROSLIB.Topic({
	        ros: this.state.ros,
	        name: Config.PWM_CONTROL_TOPIC,
	        messageType: 'std_msgs/Bool'
	    });
	    var pwm_control_msg = new window.ROSLIB.Message({
	        data: this.state.pwm_control
	    });
	    pwm_control_publisher.publish(pwm_control_msg);
	}


	getOrientationFromQuaternion(ros_orientation_quat){
		var q = new Three.Quaternion(
			ros_orientation_quat.x,
			ros_orientation_quat.y,
			ros_orientation_quat.z,
			ros_orientation_quat.w
		);
		//convert this quaternion into roll, pitch and yaw
		var RPY = new Three.Euler().setFromQuaternion(q);
		return RPY["_z"]*(180/Math.PI);
	}

	render() {
		return ( 
			<div>
				<ListGroup className="mt-3">
{/*						<ListGroup.Item variant="light">
							<Row>
								<Col>
									<h4 className="mt-4">PWM Control&ensp;
										<Button onClick={()=>{this.changeROSState()}} 
										variant={this.state.pwm_control?"danger":"success"}>
										{this.state.pwm_control?"OFF":"ON"}
										</Button>
									</h4>
									<p className="mt-0">
										<ButtonGroup vertical size="sm">
											<Button onClick={()=>{this.changePwm(10,0)}} variant="secondary" 
											disabled={this.state.pwm_control?true:false}>+</Button>
											<Button onClick={()=>{this.changePwm(-10,0)}} variant="secondary"
											disabled={this.state.pwm_control?true:false}>-</Button>
										</ButtonGroup>
										&emsp;Straight PWM : {this.state.pwm.toFixed(0)} 
									</p>
									<p className="mt-0">
										<ButtonGroup vertical size="sm">
										 	<Button onClick={()=>{this.changePwm(0,10)}} variant="secondary"
										 	disabled={this.state.pwm_control?true:false}>+</Button>
										 	<Button onClick={()=>{this.changePwm(0,-10)}} variant="secondary"
										 	disabled={this.state.pwm_control?true:false}>-</Button>
										</ButtonGroup>
										&emsp;Turning PWM : {this.state.pwm_turn.toFixed(0)} 
									</p>
								</Col>&emsp;
								<Col>
									<br/><Teleoperation/>
								</Col>
							</Row>
						</ListGroup.Item>*/}
						<ListGroup.Item variant="dark">
                            <Row>
                                <h3 className="text-center">Robot 1</h3>
                            </Row>
							<Row>
								<Col align="center">
									<h4 className="mt-4">Velocity</h4>
									<p className="m-0">Linear&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;: {this.state.linear_velocity1.toFixed(2)}</p>
									<p className="m-0">Angular : {this.state.angular_velocity1.toFixed(2)}</p>
								</Col>
								<Col align="center">
									<h4 className="mt-4">Position</h4>
									<p className="m-0">x : {this.state.x1.toFixed(2)}</p>
									<p className="m-0">y : {this.state.y1.toFixed(2)}</p>
									<p className="m-0">θ : {this.state.orientation1.toFixed(0)}</p>
								</Col>
							</Row>
							<br/>
						</ListGroup.Item>
                        <ListGroupItem variant="dark">
                        	<Row>
                                <h3 className="text-center">Robot 2</h3>
                            </Row>
                            <Row>
								<Col align="center">
									<h4 className="mt-4">Velocity</h4>
									<p className="m-0">Linear&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;: {this.state.linear_velocity2.toFixed(2)}</p>
									<p className="m-0">Angular : {this.state.angular_velocity2.toFixed(2)}</p>
								</Col>
								<Col align="center">
									<h4 className="mt-4">Position</h4>
									<p className="m-0">x : {this.state.x2.toFixed(2)}</p>
									<p className="m-0">y : {this.state.y2.toFixed(2)}</p>
									<p className="m-0">θ : {this.state.orientation2.toFixed(0)}</p>
								</Col>
							</Row>
							<br/>
                        </ListGroupItem>
				</ListGroup>
			</div>
		);
	}
}

export default RobotState;