import React, { Component } from "react";
import {Row, Col, Form, Button, ButtonGroup, ListGroup, FloatingLabel, Modal, Alert} from "react-bootstrap";
import { IoNavigate, IoCloseCircleOutline, IoLocation, IoRemoveOutline, IoAddOutline, IoCaretBack, IoCaretForward, IoCaretUp, IoCaretDown, IoNavigateOutline, IoSaveOutline, IoTrashOutline } from "react-icons/io5";
import { VscClearAll } from "react-icons/vsc";
import Config from "../scripts/config";
import Teleoperation from "./Teleoperation";
window.navigation = false;
window.homing = false;

class Map1 extends Component {
    state = {
        ros:null,
		viewer:null,
		show_path:true,
		pathView:null,
		pathTopic:null,
		label:[],
		show_set_spot:false,
		goal_status:{message: "Doing nothing. Waiting for goal...",variant: "info",show:true}
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
		this.getGoalStatus();
		this.getSpot();
		this.showPath();
	}

    view_map(){
		// eslint-disable-next-line
		this.state.viewer = new window.ROS2D.Viewer({
			divID: "nav_div",
			width: 640,
			height: 480,
		});
		// eslint-disable-next-line
		var navClient = new window.NAV2D.OccupancyGridClientNav({
			ros: this.state.ros,
			rootObject: this.state.viewer.scene,
			viewer: this.state.viewer,
			serverName: '/move_base',
			withOrientation: true,
			continuous: true,
		});
		// eslint-disable-next-line
		// var imageMapClientNav = new NAV2D.ImageMapClientNav({
	 //        ros: this.state.ros,
	 //        viewer: this.state.viewer,
	 //        rootObject: this.state.viewer.scene,
	 //        serverName: '/move_base',
	 //        image: `/static/{value}.png`
	 //    });
	 //    imageMapClientNav.addImg();
	 //    imageMapClientNav.removeImg();
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
		var move_base_stop = new window.ROSLIB.Topic({
	        ros: this.state.ros,
	        name: '/move_base/cancel',
	        messageType: 'actionlib_msgs/GoalID'
	    });
	    var move_base_stop_msg = new window.ROSLIB.Message({
	        id: ''
	    });
	    move_base_stop.publish(move_base_stop_msg);
	    this.hidePath(true);
	}

	showPath(){
		this.setState({show_path:true});
		if(this.state.pathView==null && this.state.pathTopic==null){
			this.state.pathView = new window.ROS2D.PathShape({
	            ros: this.state.ros,
	            strokeSize: 0.2,
	            strokeColor: "green",
	        });

	        this.state.viewer.scene.addChild(this.state.pathView);

	        this.state.pathTopic = new window.ROSLIB.Topic({
	            ros: this.state.ros,
	            name: '/move_base/NavfnROS/plan',
	            messageType: 'nav_msgs/Path'
	        });

	        this.state.pathTopic.subscribe((message)=>{
	        	try{
	        		this.state.pathView.setPath(message);
	        	}catch(error){
	        		console.error("show path error");
	        	}
	            
	        });
		}
	}

	hidePath(isStopping=false){
		if(!isStopping){
			this.setState({show_path:false});
		}
		
        this.state.viewer.scene.removeChild(this.state.pathView);
        if (this.state.pathTopic) {
            this.state.pathTopic.unsubscribe();
        }
        this.setState({pathView:null});
        this.setState({pathTopic:null});
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

	getGoalStatus(){
		var goal_status_sub = new window.ROSLIB.Topic({
			ros : this.state.ros,
			name : '/move_base/status',
			messageType : 'actionlib_msgs/GoalStatusArray'
		});
		goal_status_sub.subscribe((message)=>{
			var i;
			for(i=0; i<message.status_list.length; i++){
				if(message.status_list[i].status === 1){
					this.setState({goal_status:{message:"Goal received. Moving there...",variant:"warning",status:true}});
				}
			}			
		});

		var goal_result_sub = new window.ROSLIB.Topic({
			ros : this.state.ros,
			name : '/move_base/result',
			messageType : 'move_base_msgs/MoveBaseActionResult'
		});
		goal_result_sub.subscribe((message)=>{
			if(message.status.status === 2){
				this.setState({goal_status:{message:"Goal canceled.",variant:"danger",status:true}});
			}
			else if(message.status.status === 3){
				this.setState({goal_status:{message:"Goal reached successfully.",variant:"success",status:true}});
				this.hidePath(true);
			}	
			setTimeout(() => {this.setState({goal_status:{message:"Doing nothing. Waiting for goal...",variant:"info",status:true}});}, 5000);
		});
	}

	render() {
		return (
				<div>
                    <ListGroup.Item variant="light">
                        <Alert variant={this.state.goal_status.variant} show={this.state.goal_status.show}>
                            {this.state.goal_status.message}
                        </Alert>
                        <Row>
                            <Col>
                                <Row>
                                    <p id="nav_div"></p>
                                </Row>
                                <Row align="center">
                                        <ButtonGroup horizontal size="lg">
                                            <Button onClick={()=>{this.localize()}} variant="success"> LOCALIZE <IoLocation/></Button>
                                            <Button onClick={()=>{this.navigation()}} variant="primary">NAVIGATE <IoNavigate/></Button>
                                            <Button onClick={()=>{this.stop()}} variant="danger">STOP <IoCloseCircleOutline/></Button>
                                        </ButtonGroup>
                                </Row><br></br>
                                <Row align="left">
                                    <Col></Col><Col>
                                        <h6>
                                        <Form>
                                        <Form.Check label="SHOW PATH" type="switch" id="show-path-switch" checked={this.state.show_path?true:false} onChange={()=>{this.state.show_path?this.hidePath():this.showPath()}}/>
                                        </Form>
                                        </h6>
                                    </Col><Col></Col>
                                </Row>
                            </Col>
                            <Col>
                                <br></br>
                                <Row align="center">
                                    <h5>
                                        ZOOM VIEW&emsp;
                                        <ButtonGroup vertical size="md" className="gap-2">				
                                            <Button className="rounded-circle" onClick={()=>{this.zoomInMap()}} variant="secondary"><IoAddOutline/></Button>
                                            <Button className="rounded-circle" onClick={()=>{this.zoomOutMap()}} variant="secondary"><IoRemoveOutline/></Button>
                                        </ButtonGroup>&nbsp;&nbsp;&nbsp;
                                        PAN VIEW&emsp;
                                        <ButtonGroup size="md">	
                                            <Button className="rounded-circle" onClick={()=>{this.panLeftMap()}} variant="secondary"><IoCaretBack/></Button>
                                        </ButtonGroup>
                                        <ButtonGroup vertical size="md" className="gap-3">		
                                            <Button className="rounded-circle" onClick={()=>{this.panUpMap()}} variant="secondary"><IoCaretUp/></Button>
                                            <Button className="rounded-circle" onClick={()=>{this.panDownMap()}} variant="secondary"><IoCaretDown/></Button>
                                        </ButtonGroup>
                                        <ButtonGroup size="md">
                                            <Button className="rounded-circle" onClick={()=>{this.panRightMap()}} variant="secondary"><IoCaretForward/></Button>
                                        </ButtonGroup>	
                                    </h5>
                                </Row>
                                <br></br><hr></hr><br></br>
                                <Row align="center">
                                    <h5>WAYPOINT NAVIGATION</h5><br></br>
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
                                <br></br><hr></hr><br></br>
                                <Row align="center">
                                    <h5>TELEOPERATION</h5><br></br><br></br>
                                    <Teleoperation/>
                                </Row>		 	
                            </Col>
                        </Row>
                    </ListGroup.Item>

				    <Modal show={this.state.show_set_spot} onHide={()=>{this.setState({show_set_spot:!this.state.show_set_spot});}} backdrop="static" keyboard={false}>
                        <Modal.Header closeButton>
                            <Modal.Title>SAVE CURRENT SPOT</Modal.Title>
                        </Modal.Header>
                        <Modal.Body>
                            <Form.Control placeholder="Enter label or name" ref="set_spot_form_ref"/>
                        </Modal.Body>
                        <Modal.Footer>
                            <Button variant="danger" onClick={()=>{this.setState({show_set_spot:!this.state.show_set_spot});}}>
                                CANCEL
                            </Button>
                            <Button variant="success" onClick={()=>{this.setSpot("add")}}>SAVE</Button>
                        </Modal.Footer>
			        </Modal>

				</div>
		);
	}
}

export default Map1;