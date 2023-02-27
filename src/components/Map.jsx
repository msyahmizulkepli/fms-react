import React, { Component } from "react";
import {Row, Col, Form, Button, ButtonGroup, ListGroup, ToggleButton, ToggleButtonGroup, FloatingLabel, Modal, Alert} from "react-bootstrap";
import { IoNavigate, IoCloseCircleOutline, IoLocation, IoRemoveOutline, IoAddOutline, IoCaretBack, IoCaretForward, IoCaretUp, IoCaretDown, IoNavigateOutline, IoSaveOutline, IoTrashOutline } from "react-icons/io5";
import { VscClearAll } from "react-icons/vsc";
import Config from "../scripts/config";
import Teleoperation from "./Teleoperation";
window.navigation = false;
window.homing = false;
window.navoption = 1;

class Map extends Component {
    state = {
        ros:null,
		viewer:null,
		grid_client: null,
		robot_nav: 0,
		show_path:true,
		pathView1:null,
		pathTopic1:null,
		pathView2:null,
		pathTopic2:null,
		task: [],
		label:[],
		show_set_spot:false,
		goal_status1:{message: "Doing nothing. Waiting for goal...",variant: "info",show:true},
		goal_status2:{message: "Doing nothing. Waiting for goal...",variant: "info",show:true}
    };

    constructor(){
		super();
		this.view_map = this.view_map.bind(this);
		this.showPath = this.showPath.bind(this);
		this.hidePath = this.hidePath.bind(this);
		this.getSpot = this.getSpot.bind(this);
		this.setSpot = this.setSpot.bind(this);
		this.sendGoal = this.sendGoal.bind(this);
	}

    init_connection(){
		// eslint-disable-next-line
		this.state.ros = new window.ROSLIB.Ros();

		this.state.ros.on("connection", () => {
			console.info("Connected to ROS:MAP");
			this.setState({connected:true});
		});

		this.state.ros.on("close", () => {
			console.warn("Disconnected from ROS:MAP");
			this.setState({connected:false});
			//try to reconnect every 3 seconds
			setTimeout(()=>{
				try{
					this.state.ros.connect(
						"ws://"+Config.ROSBRIDGE_SERVER_IP+":"+Config.ROSBRIDGE_SERVER_PORT+""
					);
				}catch(error){
					console.error("Connection problem : MAP");
				}
			},Config.RECONNECTION_TIMER);
		});

		try{
			this.state.ros.connect(
				"ws://"+Config.ROSBRIDGE_SERVER_IP+":"+Config.ROSBRIDGE_SERVER_PORT+""
			);
		}catch(error){
			console.error("Connection problem : MAP");
		}

		this.state.ros.on("error", (error) => {
			// console.log('Error connecting to ROS: ', error);
		});
	}

    componentDidMount(){
		this.init_connection();
		this.view_map();
		this.showPath();
		this.getGoalStatus();
		this.getSpot();
	}

    view_map(){

		this.state.viewer = new window.ROS2D.Viewer({
			divID: "nav_div",
			width: 640,
			height: 480,
			// width: 480,
			// height: 780,
		});

		var navClient = new window.NAV2D.OccupancyGridClientNav2({
			ros: this.state.ros,
			rootObject: this.state.viewer.scene,
			viewer: this.state.viewer,
			continuous: true,
		});
 
	}

    navigation(){
		if(this.state.pathView==null && this.state.pathTopic==null && this.state.show_path){
			this.showPath();
		}
		try{
			window.navigation = true;
			window.homing = false;
		}catch(error){
			console.error("window.navigation or window.homing problem");
		}
		if(window.navoption == 0){
			setTimeout(() => {this.hidePath();}, 5000);
			setTimeout(() => {this.showPath();}, 5000);
		}
	}

	localize(){
		if(this.state.pathView==null && this.state.pathTopic==null && this.state.show_path){
			this.showPath();
		}
		try{
			window.navigation = false;
			window.homing = true;
		}catch(error){
			console.error("window.navigation or window.homing problem");
		}
	}

	stop(){
		try{
			window.navigation = false;
			window.homing = false;
		}catch(error){
			console.error("window.navigation or window.homing problem");
		}
		if (this.state.robot_nav == 1) {
			// stop robot1
			var move_base_stop1 = new window.ROSLIB.Topic({
				ros: this.state.ros,
				name: Config.ROBOT1_NAMESPACE+'/move_base/cancel',
				messageType: 'actionlib_msgs/GoalID'
			});
			var move_base_stop_msg1 = new window.ROSLIB.Message({
				id: ''
			});
			move_base_stop1.publish(move_base_stop_msg1);
			this.state.viewer.scene.removeChild(this.state.pathView1);
			this.hidePath1(true);
		}
		if (this.state.robot_nav == 2) {
			// stop robot2
			var move_base_stop2 = new window.ROSLIB.Topic({
				ros: this.state.ros,
				name: Config.ROBOT2_NAMESPACE+'/move_base/cancel',
				messageType: 'actionlib_msgs/GoalID'
			});
			var move_base_stop_msg2 = new window.ROSLIB.Message({
				id: ''
			});
			move_base_stop2.publish(move_base_stop_msg2);
			this.state.viewer.scene.removeChild(this.state.pathView2);
			this.hidePath2(true);
		}
		
	}

	showPath(){
		this.setState({show_path:true});
		// show robot1 path
		if(this.state.pathView1==null && this.state.pathTopic1==null){
			this.state.pathView1 = new window.ROS2D.PathShape({
	            ros: this.state.ros,
	            strokeSize: 0.2,
	            strokeColor: "green",
	        });

	        this.state.viewer.scene.addChild(this.state.pathView1);

	        this.state.pathTopic1 = new window.ROSLIB.Topic({
	            ros: this.state.ros,
	            name: '/move_base1/NavfnROS/plan', //Config.ROBOT1_NAMESPACE+'/move_base/NavfnROS/plan',
	            messageType: 'nav_msgs/Path'
	        });

	        this.state.pathTopic1.subscribe((message)=>{
	        	try{
	        		this.state.pathView1.setPath(message);
	        	}catch(error){
	        		console.error("show path error");
	        	}
	            
	        });
		}
		// show robot2 path
		if(this.state.pathView2==null && this.state.pathTopic2==null){
			this.state.pathView2 = new window.ROS2D.PathShape({
	            ros: this.state.ros,
	            strokeSize: 0.2,
	            strokeColor: "green",
	        });

	        this.state.viewer.scene.addChild(this.state.pathView2);

	        this.state.pathTopic2 = new window.ROSLIB.Topic({
	            ros: this.state.ros,
	            name: '/move_base2/NavfnROS/plan', //Config.ROBOT2_NAMESPACE+'/move_base/NavfnROS/plan',
	            messageType: 'nav_msgs/Path'
	        });

	        this.state.pathTopic2.subscribe((message)=>{
	        	try{
	        		this.state.pathView2.setPath(message);
	        	}catch(error){
	        		console.error("show path error");
	        	}
	            
	        });
		}
	}

	hidePath(){
		this.hidePath1();
		this.hidePath2();
	}

	hidePath1(isStopping=false){
		if(!isStopping){
			this.setState({show_path:false});
		}
		
        this.state.viewer.scene.removeChild(this.state.pathView1);
        if (this.state.pathTopic1) {
            this.state.pathTopic1.unsubscribe();
        }
        this.setState({pathView1:null});
        this.setState({pathTopic1:null});
	}

	hidePath2(isStopping=false){
		if(!isStopping){
			this.setState({show_path:false});
		}
		
		this.state.viewer.scene.removeChild(this.state.pathView2);
		if (this.state.pathTopic2) {
			this.state.pathTopic2.unsubscribe();
		}
		this.setState({pathView2:null});
        this.setState({pathTopic2:null});
	}


    zoomInMap(){
        var zoom = new window.ROS2D.ZoomView({
            ros: this.state.ros,
            rootObject: this.state.viewer.scene
        });
        zoom.startZoom(250, 250);
        zoom.zoom(1.2);
    }

    zoomOutMap(){
        var zoom = new window.ROS2D.ZoomView({
            ros: this.state.ros,
            rootObject: this.state.viewer.scene
        });
        zoom.startZoom(250, 250);
        zoom.zoom(0.8);
    }


    panUpMap(){
        var pan = new window.ROS2D.PanView({
            ros: this.state.ros,
            rootObject: this.state.viewer.scene
        });
        pan.startPan(250, 250);
        pan.pan(250,300);
    }

    panDownMap(){
        var pan = new window.ROS2D.PanView({
            ros: this.state.ros,
            rootObject: this.state.viewer.scene
        });
        pan.startPan(250, 250);
        pan.pan(250,200);
    }

    panRightMap(){
        var pan = new window.ROS2D.PanView({
            ros: this.state.ros,
            rootObject: this.state.viewer.scene
        });
        pan.startPan(250, 250);
        pan.pan(200,250);
    }

    panLeftMap(){
        var pan = new window.ROS2D.PanView({
            ros: this.state.ros,
            rootObject: this.state.viewer.scene
        });
        pan.startPan(250, 250);
        pan.pan(300,250);
    }

	getGoalStatus(){
		// robot1 status
		var goal_status_sub1 = new window.ROSLIB.Topic({
			ros : this.state.ros,
			name : Config.ROBOT1_NAMESPACE+'/move_base/status',
			messageType : 'actionlib_msgs/GoalStatusArray'
		});
		goal_status_sub1.subscribe((message)=>{
			var i;
			for(i=0; i<message.status_list.length; i++){
				if(message.status_list[i].status === 1){
					this.setState({goal_status1:{message:"Goal received. Moving there...",variant:"warning",status:true}});
				}
			}			
		});

		var goal_result_sub1 = new window.ROSLIB.Topic({
			ros : this.state.ros,
			name : Config.ROBOT1_NAMESPACE+'/move_base/result',
			messageType : 'move_base_msgs/MoveBaseActionResult'
		});
		goal_result_sub1.subscribe((message)=>{
			if(message.status.status === 2){
				this.setState({goal_status1:{message:"Goal canceled.",variant:"danger",status:true}});
			}
			else if(message.status.status === 3){
				this.setState({goal_status1:{message:"Goal reached successfully.",variant:"success",status:true}});
				this.hidePath1(true);
			}	
			setTimeout(() => {this.setState({goal_status1:{message:"Doing nothing. Waiting for goal...",variant:"info",status:true}});}, 5000);
		});

		// robot2 status
		var goal_status_sub2 = new window.ROSLIB.Topic({
			ros : this.state.ros,
			name : Config.ROBOT2_NAMESPACE+'/move_base/status',
			messageType : 'actionlib_msgs/GoalStatusArray'
		});
		goal_status_sub2.subscribe((message)=>{
			var i;
			for(i=0; i<message.status_list.length; i++){
				if(message.status_list[i].status === 1){
					this.setState({goal_status2:{message:"Goal received. Moving there...",variant:"warning",status:true}});
				}
			}			
		});

		var goal_result_sub2 = new window.ROSLIB.Topic({
			ros : this.state.ros,
			name : Config.ROBOT2_NAMESPACE+'/move_base/result',
			messageType : 'move_base_msgs/MoveBaseActionResult'
		});
		goal_result_sub2.subscribe((message)=>{
			if(message.status.status === 2){
				this.setState({goal_status2:{message:"Goal canceled.",variant:"danger",status:true}});
			}
			else if(message.status.status === 3){
				this.setState({goal_status2:{message:"Goal reached successfully.",variant:"success",status:true}});
				this.hidePath2(true);
			}	
			setTimeout(() => {this.setState({goal_status2:{message:"Doing nothing. Waiting for goal...",variant:"info",status:true}});}, 5000);
		});
	}

	getSpot(){
		var get_spot = new window.ROSLIB.Service({
			ros : this.state.ros,
			name : '/spots/get_spot',
			serviceType : 'medibotv4/GetSpot'
		});

		var request = new window.ROSLIB.ServiceRequest({});
		var i, temp_label=[];
		get_spot.callService(request, function(result) {
			for(i=0; i<result.label.length; i++){
				temp_label.push(result.label[i].toString());
			}
		});
		setTimeout(() => {
			this.setState({ label: []});
			this.setState({ label: this.state.label.concat(temp_label)});
		}, 500);
    }

    sendGoal(){
    	console.log(this.refs.select_spot_form_ref.value);


    	var send_goal = new window.ROSLIB.Service({
			ros : this.state.ros,
			name : '/spots/send_goal',
			serviceType : 'medibotv4/SendGoal'
		});

		var request = new window.ROSLIB.ServiceRequest({
			label: this.refs.select_spot_form_ref.value
		});

		send_goal.callService(request, function(result) {
			console.log(result.success);
			console.log(result.message);
		});

		setTimeout(() => {
			if(this.state.pathView==null && this.state.pathTopic==null && this.state.show_path){
				this.showPath();
			}
		}, 100);	
    }

    setSpot(act){
    	var temp_label;
    	if(act === 'add'){
    		temp_label = this.refs.set_spot_form_ref.value;
    	}
    	else if(act === 'remove'){
			temp_label = this.refs.select_spot_form_ref.value;
    	}
    	else if(act === 'clear'){
    		temp_label = '';
    	}

    	var set_spot = new window.ROSLIB.Service({
			ros : this.state.ros,
			name : '/spots/set_spot',
			serviceType : 'medibotv4/SetSpot'
		});

		var request = new window.ROSLIB.ServiceRequest({
			action: act, //add remove or clear
			label: temp_label
		});

		set_spot.callService(request, function(result) {
			console.log(result.success);
			console.log(result.message);
		});	

		setTimeout(() => {
			this.getSpot();
			if(act === 'add'){
    			this.setState({show_set_spot:!this.state.show_set_spot});
    		}
		}, 500);
    }

	render() {
		return (
				<div>
                    <ListGroup.Item variant="light">
						<Row>
							<Col>
								<Row>
									<p id="nav_div" className="text-center"></p>
								</Row>
								<Row align="center">
									<h5>
										ZOOM VIEW&emsp;
										<ButtonGroup vertical size="md" className="gap-2">				
											<Button className="rounded-circle" onClick={()=>{this.zoomInMap()}} variant="outline-secondary"><IoAddOutline/></Button>
											<Button className="rounded-circle" onClick={()=>{this.zoomOutMap()}} variant="outline-secondary"><IoRemoveOutline/></Button>
										</ButtonGroup>&nbsp;&nbsp;&nbsp;
										PAN VIEW&emsp;
										<ButtonGroup size="md">	
											<Button className="rounded-circle" onClick={()=>{this.panLeftMap()}} variant="outline-secondary"><IoCaretBack/></Button>
										</ButtonGroup>
										<ButtonGroup vertical size="md" className="gap-3">		
											<Button className="rounded-circle" onClick={()=>{this.panUpMap()}} variant="outline-secondary"><IoCaretUp/></Button>
											<Button className="rounded-circle" onClick={()=>{this.panDownMap()}} variant="outline-secondary"><IoCaretDown/></Button>
										</ButtonGroup>
										<ButtonGroup size="md">
											<Button className="rounded-circle" onClick={()=>{this.panRightMap()}} variant="outline-secondary"><IoCaretForward/></Button>
										</ButtonGroup>	
									</h5>
								</Row>
							</Col>
							<Col>
								<br></br>
								<Row align="center">
									<h5>NAVIGATION</h5><br></br><br></br>
									<Row>
										<Col align="center">
											<ToggleButtonGroup type="radio" name="robot_nav_btn" onChange={(value)=>{this.setState({robot_nav: value}); window.navoption = value;}}>
												<ToggleButton id="auto_nav_btn" value={0} variant="outline-primary">
												&nbsp;&nbsp;Auto&nbsp;&nbsp;
												</ToggleButton>
												<ToggleButton id="robot1_nav_btn" value={1} variant="outline-info">
													Robot 1
												</ToggleButton>
												<ToggleButton id="robot2_nav_btn" value={2} variant="outline-danger">
													Robot 2
												</ToggleButton>
											</ToggleButtonGroup>
										</Col>
									</Row>
									<br></br><p></p><br></br>
									<Row>
										<ButtonGroup horizontal size="lg">
											<Button onClick={()=>{this.localize()}} variant="success"> LOCALIZE <IoLocation/></Button>
											<Button onClick={()=>{this.navigation()}} variant="primary">NAVIGATE <IoNavigate/></Button>
											<Button onClick={()=>{this.stop()}} variant="danger">STOP <IoCloseCircleOutline/></Button>
										</ButtonGroup>
									</Row>
								</Row>
								<br></br>
								<Row align="center">
									<Col></Col><Col></Col><Col>
										<h6>
										<Form>
										<Form.Check label="SHOW PATH" type="switch" id="show-path-switch" checked={this.state.show_path?true:false} onChange={()=>{this.state.show_path?this.hidePath():this.showPath()}}/>
										</Form>
										</h6>
									</Col><Col></Col><Col></Col>
								</Row>
								<hr></hr><br></br>
								{/* <Row align="center">
                                    <h5>TASK ASSIGNMENT</h5><br></br><br></br>
                                    <Form size="md">    
                                        <FloatingLabel label="Select a spot" size="xs">
                                            <Form.Control as="select" ref="select_spot_form_ref" size="xs" onClick={()=>{if(this.refs.select_spot_form_ref.value===""){this.getSpot();}}}>
                                                {this.state.label.map((x) => (<option key={x} value={x}>{x}</option>))}
                                            </Form.Control>
                                        </FloatingLabel>
                                        <p></p>
                                        <ButtonGroup className="gap-1">
                                            <Button onClick={()=>{this.sendGoal()}} variant="secondary">GOTO <IoNavigateOutline/></Button>
                                            <Button onClick={()=>{this.setState({show_set_spot:!this.state.show_set_spot});}} variant="secondary">SAVE <IoSaveOutline/></Button>
                                            <Button onClick={()=>{this.setSpot("remove")}} variant="secondary">REMOVE <IoTrashOutline/></Button>
                                            <Button onClick={()=>{this.setSpot("clear")}} variant="secondary">CLEAR ALL <VscClearAll/></Button>
                                        </ButtonGroup>						 	
                                    </Form>
                                </Row>
								<hr></hr><br></br>	 */}
								<Row align="center">
									<h5>TELEOPERATION</h5><br></br><br></br>
									<Teleoperation/>
								</Row>
							</Col>
						</Row>
                    </ListGroup.Item>
				</div>
		);
	}
}

export default Map;