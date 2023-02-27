
var NAV2D = NAV2D || {
    REVISION: '0.3.0'
};

var count =null;
var robotvisible=false;




NAV2D.ImageMapClientNav = function(options) {
    var that = this;
    options = options || {};
    this.ros = options.ros;
    var topic = options.topic || '/map_metadata';
    var image = options.image;
    this.serverName = options.serverName || '/move_base';
    this.actionName = options.actionName || 'move_base_msgs/MoveBaseAction';
    this.rootObject = options.rootObject || new createjs.Container();
    this.viewer = options.viewer;
    this.withOrientation = options.withOrientation || true;
    this.navigator = null;

    // setup a client to get the map
    var client = new ROS2D.ImageMapClient({
        ros: this.ros,
        rootObject: this.rootObject,
        topic: topic,
        image: image
    });
    client.on('change', function() {

        that.navigator = new NAV2D.Navigator({
            ros: that.ros,
            serverName: that.serverName,
            actionName: that.actionName,
            rootObject: that.rootObject,
            withOrientation: that.withOrientation
        });


        // scale the viewer to fit the map

        that.viewer.scaleToDimensions(client.currentImage.width, client.currentImage.height);

        that.viewer.shift(client.currentImage.pose.position.x, client.currentImage.pose.position.y);

    });

    this.removeImg = client.removeImg;

    this.addImg = client.addImg;
   
};



NAV2D.Navigator = function(options) {
    var that = this;
    options = options || {};
    var ros = options.ros;
    var serverName = options.serverName || '/move_base';
    var actionName = options.actionName || 'move_base_msgs/MoveBaseAction';
    var robot_pose = options.robot_pose || '/robot_pose';
    var initial_pose = options.initial_pose || '/initialpose';
    var plan = options.plan || '/move_base/NavfnROS/plan';
    var withOrientation = options.withOrientation || true;
    this.rootObject = options.rootObject || new createjs.Container();

    // setup the actionlib client
    var actionClient = new ROSLIB.ActionClient({
        ros: ros,
        actionName: actionName,
        serverName: serverName
    });

    function homefunc(pose) {
        var robot = new ROSLIB.Topic({
            ros: ros,
            name: initial_pose,
            messageType: 'geometry_msgs/PoseWithCovarianceStamped'
        });

        var posee = new ROSLIB.Message({ header: { frame_id: "map" }, pose: { pose: { position: { x: pose.position.x, y: pose.position.y, z: 0.0 }, orientation: { z: pose.orientation.z, w: pose.orientation.w } }, covariance: [0.25, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.25, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.06853891945200942] } });
        robot.publish(posee);
        homing = false;
        navigation = false;

    }

    /**
     * Send a goal to the navigation stack with the given pose.
     *
     * @param pose - the goal pose
     */
    function sendGoal(pose) {
        var targetPath;


        var goal = new ROSLIB.Goal({
            actionClient: actionClient,
            goalMessage: {
                target_pose: {
                    header: {
                        frame_id: 'map'
                    },
                    pose: pose
                }
            }
        });

        goal.send();



        var goalMarker = new ROS2D.NavigationArrow({
            size: 7.5,
            strokeSize: 1,
            strokeColor : createjs.Graphics.getRGB(0, 0, 0),
            fillColor: createjs.Graphics.getRGB(0, 64, 255, 0.5),
            pulse: false
        });

        goalMarker.x = pose.position.x;
        goalMarker.y = -pose.position.y;
        goalMarker.rotation = stage.rosQuaternionToGlobalTheta(pose.orientation);
        goalMarker.scaleX = 1.0 / stage.scaleX;
        goalMarker.scaleY = 1.0 / stage.scaleY;
        that.rootObject.addChild(goalMarker);

        goal.on('result', function() {
            that.rootObject.removeChild(goalMarker);
            that.rootObject.removeChild(orientationMarker);
            navigation = false;

        });
    }

    // get a handle to the stage

    var stage;

    if (that.rootObject instanceof createjs.Stage) {
        stage = that.rootObject;
    } else {
        stage = that.rootObject.getStage();
    }

    // marker for the robot
    var robotMarker = new ROS2D.NavigationArrow({
    size : 7.5,
    strokeSize : 1,
    strokeColor : createjs.Graphics.getRGB(0, 0, 0),
    fillColor : createjs.Graphics.getRGB(255, 128, 0, 1.0),
    pulse : true
  });

    // wait for a pose to come in first
    robotMarker.visible = false;


    count=count+1
    if (count == 1 || robotvisible == true){
        that.rootObject.addChild(robotMarker);
        robotvisible=false;
    }
  

    var initScaleSet = false;

    // setup a listener for the robot pose
    var poseListener = new ROSLIB.Topic({
        ros: ros,
        name: robot_pose,
        messageType: 'geometry_msgs/Pose',
        throttle_rate: 1
    });

    poseListener.subscribe(function(pose) {
        // update the robots position on the map
        robotMarker.x = pose.position.x;
        robotMarker.y = -pose.position.y;

        if (!initScaleSet) {
        robotMarker.scaleX = 1.0 / stage.scaleX;
        robotMarker.scaleY = 1.0 / stage.scaleY;
        initScaleSet = true;
        }

        // change the angle
        robotMarker.rotation = stage.rosQuaternionToGlobalTheta(pose.orientation);

        robotMarker.visible = true;
    });

    var pathView = null,
        pathTopic = null;

    window.pathed = function() {

        pathView = new ROS2D.PathShape({
            ros: ros,
            strokeSize: 0.02,
            strokeColor: "green",
        });

        that.rootObject.addChild(pathView);

        pathTopic = new ROSLIB.Topic({
            ros: ros,
            name: plan,
            messageType: 'nav_msgs/Path'
        });

        pathTopic.subscribe(function(message) {
            pathView.setPath(message);
        });

    }

    window.upathed = function() {
        that.rootObject.removeChild(pathView);
        if (pathTopic) {
            pathTopic.unsubscribe();
        }
        pathView = null;
        pathTopic = null;
    }



    var position = null;
    var positionVec3 = null;
    var thetaRadians = 0;
    var thetaDegrees = 0;
    var orientationMarker = null;
    var mouseDown = false;
    var xDelta = 0;
    var yDelta = 0;
    var panflag = true;

    var pannavfunction = function(event, mouseState) {
        // label:
        if (navigation == true || homing == true) {
            // var mouseEventHandler = function(event, mouseState) {

            if (mouseState === 'down') {
                // get position when mouse button is pressed down
                position = stage.globalToRos(event.stageX, event.stageY);
                positionVec3 = new ROSLIB.Vector3(position);
                mouseDown = true;
            } else if (mouseState === 'move') {
                // remove obsolete orientation marker
                that.rootObject.removeChild(orientationMarker);

                if (mouseDown === true) {

                    // if mouse button is held down:
                    // - get current mouse position
                    // - calulate direction between stored <position> and current position
                    // - place orientation marker
                    var currentPos = stage.globalToRos(event.stageX, event.stageY);
                    var currentPosVec3 = new ROSLIB.Vector3(currentPos);

                    orientationMarker = new ROS2D.NavigationArrow({
                        size: 15,
                        strokeSize: 1,
                        strokeColor : createjs.Graphics.getRGB(0, 0, 0),
                        fillColor: createjs.Graphics.getRGB(0, 64, 255, 0.5),
                        pulse: false
                    });

                    xDelta = currentPosVec3.x - positionVec3.x;
                    yDelta = currentPosVec3.y - positionVec3.y;

                    thetaRadians = Math.atan2(xDelta, yDelta);

                    thetaDegrees = thetaRadians * (180.0 / Math.PI);

                    if (thetaDegrees >= 0 && thetaDegrees <= 180) {
                        thetaDegrees += 270;
                    } else {
                        thetaDegrees -= 90;
                    }

                    orientationMarker.x = positionVec3.x;
                    orientationMarker.y = -positionVec3.y;
                    orientationMarker.rotation = thetaDegrees;
                    orientationMarker.scaleX = 1.0 / stage.scaleX;
                    orientationMarker.scaleY = 1.0 / stage.scaleY;
                        that.rootObject.addChild(orientationMarker);
                    
                
            }} else if (mouseDown) { // mouseState === 'up'
                // if mouse button is released
                // - get current mouse position (goalPos)
                // - calulate direction between stored <position> and goal position
                // - set pose with orientation
                // - send goal
                mouseDown = false;


                var goalPos = stage.globalToRos(event.stageX, event.stageY);

                var goalPosVec3 = new ROSLIB.Vector3(goalPos);

                xDelta = goalPosVec3.x - positionVec3.x;
                yDelta = goalPosVec3.y - positionVec3.y;

                thetaRadians = Math.atan2(xDelta, yDelta);

                if (thetaRadians >= 0 && thetaRadians <= Math.PI) {
                    thetaRadians += (3 * Math.PI / 2);
                } else {
                    thetaRadians -= (Math.PI / 2);
                }

                var qz = Math.sin(-thetaRadians / 2.0);
                var qw = Math.cos(-thetaRadians / 2.0);

                var orientation = new ROSLIB.Quaternion({
                    x: 0,
                    y: 0,
                    z: qz,
                    w: qw
                });

                var pose = new ROSLIB.Pose({
                    position: positionVec3,
                    orientation: orientation
                });
                // send the goal
                if (navigation == true) {
                    sendGoal(pose);
                }
                if (homing == true) {
                    homefunc(pose);
                }

                navigation = false;

            }
        }

         
            if (!homing && !navigation) {


                if (mouseState === 'down' && typeof pane === "function") {

                    pane(event.stageX, event.stageY);

                    panflag = true;
                } else if (mouseState === 'up') {
                    // console.log("hi up here");
                    panflag = false;

                } else if (mouseState === 'move' && typeof pane === "function") {

                    mouseDown = false;
                    that.rootObject.removeChild(orientationMarker);

                    if (panflag) {
                        paned(event.stageX, event.stageY);
                    }
                }
            }
       
    };

    this.rootObject.addEventListener('stagemousedown', function(event) {
        pannavfunction(event, 'down');
        that.rootObject.addEventListener('stagemousemove', function(event) {
            pannavfunction(event, 'move');

        });

    });

    this.rootObject.addEventListener('stagemouseup', function(event) {
        pannavfunction(event, 'up');
    });
};



NAV2D.OccupancyGridClientNav = function(options) {
    var that = this;
    options = options || {};
    this.ros = options.ros;
    var topic = options.topic || '/map';
    var continuous = options.continuous;
    this.serverName = options.serverName || '/move_base';
    this.actionName = options.actionName || 'move_base_msgs/MoveBaseAction';
    var robot_pose = options.robot_pose || '/robot_pose';
    var initial_pose = options.initial_pose || '/initialpose';
    var plan = options.plan || '/move_base/NavfnROS/plan';
    this.rootObject = options.rootObject || new createjs.Container();
    this.viewer = options.viewer;
    this.withOrientation = options.withOrientation || true;
    this.navigator = null;

    // setup a client to get the map
    var client = new ROS2D.OccupancyGridClient({
        ros: this.ros,
        rootObject: this.rootObject,
        continuous: continuous,
        topic: topic
    });
    client.on('change', function() {

        that.navigator = new NAV2D.Navigator({
            ros: that.ros,
            serverName: that.serverName,
            actionName: that.actionName,
            rootObject: that.rootObject,
            robot_pose: robot_pose,
            initial_pose: initial_pose,
            plan: plan,
            withOrientation: that.withOrientation
        });

        // scale the viewer to fit the map
        that.viewer.scaleToDimensions(client.currentGrid.width, client.currentGrid.height);
        that.viewer.shift(client.currentGrid.pose.position.x, client.currentGrid.pose.position.y);
    });

};

NAV2D.OccupancyGridClientNav2 = function(options) {
    var that = this;
    options = options || {};
    this.ros = options.ros;
    var topic = options.topic || '/map';
    var continuous = options.continuous;
    var robot1Namespace = options.robot1Namespace || '/robot1';
    var robot2Namespace = options.robot2Namespace || '/robot2';
    this.serverName = options.serverName || '/move_base';
    this.actionName = options.actionName || 'move_base_msgs/MoveBaseAction';
    var robot_pose = options.robot_pose || '/robot_pose';
    var initial_pose = options.initial_pose || '/initialpose';
    var plan = options.plan || '/move_base/NavfnROS/plan';
    this.rootObject = options.rootObject || new createjs.Container();
    this.viewer = options.viewer;
    this.withOrientation = options.withOrientation || true;
    this.navigator = null;
  
    // setup a client to get the map
    var client = new ROS2D.OccupancyGridClient({
        ros: that.ros,
        rootObject: this.rootObject,
        continuous: continuous,
        topic: topic
    });
    client.on('change', function() {
        // scale the viewer to fit the map
        that.viewer.scaleToDimensions(client.currentGrid.width, client.currentGrid.height);
        that.viewer.shift(client.currentGrid.pose.position.x, client.currentGrid.pose.position.y);
    });
    
    // setup the actionlib client for robot1
     var actionClient1 = new ROSLIB.ActionClient({
        ros: that.ros,
        actionName: this.actionName,
        serverName: robot1Namespace+this.serverName
    });

    // setup the actionlib client for robot2
    var actionClient2 = new ROSLIB.ActionClient({
        ros: that.ros,
        actionName: this.actionName,
        serverName: robot2Namespace+this.serverName
    });
    
    // pose estimate for robot1
    function homefunc1(pose) {
        var robot1 = new ROSLIB.Topic({
            ros: that.ros,
            name: robot1Namespace+initial_pose,
            messageType: 'geometry_msgs/PoseWithCovarianceStamped'
        });

        var posee = new ROSLIB.Message({ header: { frame_id: "map" }, pose: { pose: { position: { x: pose.position.x, y: pose.position.y, z: 0.0 }, orientation: { z: pose.orientation.z, w: pose.orientation.w } }, covariance: [0.25, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.25, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.06853891945200942] } });
        robot1.publish(posee);
        homing = false;
        navigation = false;

    }

    // pose estimate for robot2
    function homefunc2(pose) {
        var robot2 = new ROSLIB.Topic({
            ros: that.ros,
            name: robot2Namespace+initial_pose,
            messageType: 'geometry_msgs/PoseWithCovarianceStamped'
        });

        var posee = new ROSLIB.Message({ header: { frame_id: "map" }, pose: { pose: { position: { x: pose.position.x, y: pose.position.y, z: 0.0 }, orientation: { z: pose.orientation.z, w: pose.orientation.w } }, covariance: [0.25, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.25, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.06853891945200942] } });
        robot2.publish(posee);
        homing = false;
        navigation = false;

    }

    // send goal to nearest robot
    function taskAssign(pose) {
        var nav_goal = new ROSLIB.Topic({
            ros: that.ros,
            name: '/nav_goal',
            messageType: 'geometry_msgs/PoseStamped'
        });
        var posee = new ROSLIB.Message({ 
            header: { 
                frame_id: "map" 
            }, 
            pose: pose
        });
        nav_goal.publish(posee);
        
        var serviceClient = new ROSLIB.Service({
            ros : that.ros,
            name : '/medibotv4/task_assign',
            serviceType : 'std_srvs/Trigger'
        });
        
        var request = new ROSLIB.ServiceRequest({});

        serviceClient.callService(request, function(result) {
            console.log(result.success);
            if(result.message == "robot1"){
                sendGoal1(pose);
                console.log("robot1 is nearer... assigning task to robot1");
            }
            if(result.message == "robot2"){
                sendGoal2(pose);
                console.log("robot2 is nearer... assigning task to robot2");
            }
            if(result.message == "none"){
                that.rootObject.removeChild(orientationMarker);
                console.log("both robots are busy... please wait for robot to complete task or cancel robot task manually");
            }
        });

    }

    /**
     * Send a goal to the navigation stack with the given pose.
     *
     * @param pose - the goal pose
     */
    // send goal to robot1
     function sendGoal1(pose) {
        
        var goal1 = new ROSLIB.Goal({
            actionClient: actionClient1,
            goalMessage: {
                target_pose: {
                    header: {
                        frame_id: 'map'
                    },
                    pose: pose
                }
            }
        });

        goal1.send();



        var goalMarker1 = new ROS2D.NavigationArrow({
            size: 7.5,
            strokeSize: 1,
            strokeColor : createjs.Graphics.getRGB(0, 0, 0),
            fillColor: createjs.Graphics.getRGB(0, 64, 255, 0.5),
            pulse: false
        });

        goalMarker1.x = pose.position.x;
        goalMarker1.y = -pose.position.y;
        goalMarker1.rotation = stage.rosQuaternionToGlobalTheta(pose.orientation);
        goalMarker1.scaleX = 1.0 / stage.scaleX;
        goalMarker1.scaleY = 1.0 / stage.scaleY;
        that.rootObject.addChild(goalMarker1);
        that.rootObject.removeChild(orientationMarker);

        goal1.on('result', function() {
            that.rootObject.removeChild(goalMarker1);
            navigation = false;

        });
    }

    /**
     * Send a goal to the navigation stack with the given pose.
     *
     * @param pose - the goal pose
     */
    // send goal to robot2
    function sendGoal2(pose) {
        
        var goal2 = new ROSLIB.Goal({
            actionClient: actionClient2,
            goalMessage: {
                target_pose: {
                    header: {
                        frame_id: 'map'
                    },
                    pose: pose
                }
            }
        });

        goal2.send();



        var goalMarker2 = new ROS2D.NavigationArrow({
            size: 7.5,
            strokeSize: 1,
            strokeColor : createjs.Graphics.getRGB(0, 0, 0),
            fillColor: createjs.Graphics.getRGB(0, 64, 255, 0.5),
            pulse: false
        });

        goalMarker2.x = pose.position.x;
        goalMarker2.y = -pose.position.y;
        goalMarker2.rotation = stage.rosQuaternionToGlobalTheta(pose.orientation);
        goalMarker2.scaleX = 1.0 / stage.scaleX;
        goalMarker2.scaleY = 1.0 / stage.scaleY;
        that.rootObject.addChild(goalMarker2);
        that.rootObject.removeChild(orientationMarker);

        goal2.on('result', function() {
            that.rootObject.removeChild(goalMarker2);
            navigation = false;

        });
    }

    // get a handle to the stage
    var stage;
  
    if (that.rootObject instanceof createjs.Stage) {
        stage = that.rootObject;
    } else {
        stage = that.rootObject.getStage();
    }
      // marker for robot1
    var robotMarker1 = new ROS2D.NavigationArrow({
        size : 10.5,
        strokeSize : 0.5,
        strokeColor : createjs.Graphics.getRGB(0, 0, 0),
        fillColor : createjs.Graphics.getRGB(0, 0, 255, 1.0),
        pulse : true
    });
  
    //marker for robot2
    var robotMarker2 = new ROS2D.NavigationArrow({
        size : 10.5,
        strokeSize : 0.5,
        strokeColor : createjs.Graphics.getRGB(0, 0, 0),
        fillColor : createjs.Graphics.getRGB(255, 0, 0, 1.0),
        pulse : true
    });
  
    //wait for a pose to come in first
    robotMarker1.visible = false;
    robotMarker2.visible = false;
  
    count=count+1
    if (count ==1 || robotvisible == true){
        that.rootObject.addChild(robotMarker1);
        that.rootObject.addChild(robotMarker2);
        robotvisible=false;
    }
  
    var initScaleSet1 = false;
  
    // setup a listener for the robot1 pose
    var poseListener1 = new ROSLIB.Topic({
        ros: that.ros,
        name: "/robot1/robot_pose", //robot1Namespace+robot_pose,
        messageType: 'geometry_msgs/Pose',
        throttle_rate: 1
    });
  
    poseListener1.subscribe(function(pose) {
        // update the robot1 position on the map
        robotMarker1.x = pose.position.x;
        robotMarker1.y = -pose.position.y;
  
        if (!initScaleSet1){
            robotMarker1.scaleX = 1.0 / stage.scaleX;
            robotMarker1.scaleY = 1.0 / stage.scaleY;
            initScaleSet1 = true;
        }
  
        // change the angle
        robotMarker1.rotation = stage.rosQuaternionToGlobalTheta(pose.orientation);
  
        robotMarker1.visible = true;
    });
  
    var initScaleSet2 = false;
  
    // setup a listener for the robot pose
    var poseListener2 = new ROSLIB.Topic({
        ros: that.ros,
        name: "/robot2/robot_pose", //robot2Namespace+robot_pose,
        messageType: 'geometry_msgs/Pose',
        throttle_rate: 1
    });
  
    poseListener2.subscribe(function(pose) {
        // update the robots position on the map
        robotMarker2.x = pose.position.x;
        robotMarker2.y = -pose.position.y;
  
        if (!initScaleSet2){
            robotMarker2.scaleX = 1.0 / stage.scaleX;
            robotMarker2.scaleY = 1.0 / stage.scaleY;
            initScaleSet2 = true;
        }
  
        // change the angle
        robotMarker2.rotation = stage.rosQuaternionToGlobalTheta(pose.orientation);
  
        robotMarker2.visible = true;
    });

    var position = null;
    var positionVec3 = null;
    var thetaRadians = 0;
    var thetaDegrees = 0;
    var orientationMarker = null;
    var mouseDown = false;
    var xDelta = 0;
    var yDelta = 0;
    var panflag = true;

    var pannavfunction = function(event, mouseState) {
        // label:
        if (navigation == true || homing == true) {

            if (mouseState === 'down') {
                // get position when mouse button is pressed down
                position = stage.globalToRos(event.stageX, event.stageY);
                positionVec3 = new ROSLIB.Vector3(position);
                mouseDown = true;
            } else if (mouseState === 'move') {
                // remove obsolete orientation marker
                that.rootObject.removeChild(orientationMarker);

                if (mouseDown === true) {

                    // if mouse button is held down:
                    // - get current mouse position
                    // - calulate direction between stored <position> and current position
                    // - place orientation marker
                    var currentPos = stage.globalToRos(event.stageX, event.stageY);
                    var currentPosVec3 = new ROSLIB.Vector3(currentPos);

                    orientationMarker = new ROS2D.NavigationArrow({
                        size: 15,
                        strokeSize: 1,
                        strokeColor : createjs.Graphics.getRGB(0, 0, 0),
                        fillColor: createjs.Graphics.getRGB(0, 64, 255, 0.5),
                        pulse: false
                    });

                    xDelta = currentPosVec3.x - positionVec3.x;
                    yDelta = currentPosVec3.y - positionVec3.y;

                    thetaRadians = Math.atan2(xDelta, yDelta);

                    thetaDegrees = thetaRadians * (180.0 / Math.PI);

                    if (thetaDegrees >= 0 && thetaDegrees <= 180) {
                        thetaDegrees += 270;
                    } else {
                        thetaDegrees -= 90;
                    }

                    orientationMarker.x = positionVec3.x;
                    orientationMarker.y = -positionVec3.y;
                    orientationMarker.rotation = thetaDegrees;
                    orientationMarker.scaleX = 1.0 / stage.scaleX;
                    orientationMarker.scaleY = 1.0 / stage.scaleY;
                        that.rootObject.addChild(orientationMarker);
                    
                
            }} else if (mouseDown) { // mouseState === 'up'
                // if mouse button is released
                // - get current mouse position (goalPos)
                // - calulate direction between stored <position> and goal position
                // - set pose with orientation
                // - send goal
                mouseDown = false;


                var goalPos = stage.globalToRos(event.stageX, event.stageY);

                var goalPosVec3 = new ROSLIB.Vector3(goalPos);

                xDelta = goalPosVec3.x - positionVec3.x;
                yDelta = goalPosVec3.y - positionVec3.y;

                thetaRadians = Math.atan2(xDelta, yDelta);

                if (thetaRadians >= 0 && thetaRadians <= Math.PI) {
                    thetaRadians += (3 * Math.PI / 2);
                } else {
                    thetaRadians -= (Math.PI / 2);
                }

                var qz = Math.sin(-thetaRadians / 2.0);
                var qw = Math.cos(-thetaRadians / 2.0);

                var orientation = new ROSLIB.Quaternion({
                    x: 0,
                    y: 0,
                    z: qz,
                    w: qw
                });

                var pose = new ROSLIB.Pose({
                    position: positionVec3,
                    orientation: orientation
                });
                // send the goal
                if (navigation == true) {
                    if (navoption == 0) {
                        taskAssign(pose);
                    }
                    if (navoption == 1) {
                        sendGoal1(pose);
                    }
                    if (navoption == 2) {
                        sendGoal2(pose);
                    }
                }
                if (homing == true) {
                    if (navoption == 1) {
                        homefunc1(pose);
                    }
                    if (navoption == 2) {
                        homefunc2(pose);
                    }
                }

                navigation = false;

            }
        }

         
        if (!homing && !navigation) {


            if (mouseState === 'down' && typeof pane === "function") {

                pane(event.stageX, event.stageY);

                panflag = true;
            } else if (mouseState === 'up') {
                // console.log("hi up here");
                panflag = false;

            } else if (mouseState === 'move' && typeof pane === "function") {

                mouseDown = false;
                that.rootObject.removeChild(orientationMarker);

                if (panflag) {
                    paned(event.stageX, event.stageY);
                }
            }
        }
       
    };

    this.rootObject.addEventListener('stagemousedown', function(event) {
        pannavfunction(event, 'down');
        that.rootObject.addEventListener('stagemousemove', function(event) {
            pannavfunction(event, 'move');

        });

    });

    this.rootObject.addEventListener('stagemouseup', function(event) {
        pannavfunction(event, 'up');
    });
  
  
 };
 
