import React, { Component } from "react";
import {Alert, Spinner} from "react-bootstrap";
import Config from "../scripts/config";

class Connection extends Component {
	state = {
		connected : false,
		ros : null
	};

	constructor() {
		super();
		this.init_connection();
	}

	init_connection(){
		this.state.ros = new window.ROSLIB.Ros();
		console.log(this.state.ros);

		this.state.ros.on("connection", () => {
			console.info("Connected to ROS:CONNECTION");
			this.setState({connected:true});
		});

		this.state.ros.on("close", () => {
			console.warn("Disconnected from ROS:CONNECTION");
			this.setState({connected:false});
			setTimeout(()=>{
				try{
					this.state.ros.connect(
						"ws://"+Config.ROSBRIDGE_SERVER_IP+":"+Config.ROSBRIDGE_SERVER_PORT+""
					);
				}catch(error){
					console.error("Connection problem : CONNECTION");
				}
			},Config.RECONNECTION_TIMER);
		});

		try{
			this.state.ros.connect(
				"ws://"+Config.ROSBRIDGE_SERVER_IP+":"+Config.ROSBRIDGE_SERVER_PORT+""
			);
		}catch(error){
			console.error("Connection problem : CONNECTION");
		}
	}

	render() {
		return (
				<div>
                    <Alert className="text-center m-3" variant={this.state.connected?"success":"danger"}>
						{this.state.connected? "Robot Connected": "Robot Disconnected"}&emsp;
						<Spinner animation={this.state.connected?"grow":"border"} 
						variant={this.state.connected?"danger":"light"} size="sm"/>
					</Alert>
				</div>
		);
	}
}

export default Connection;