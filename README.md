# fms-react
React-based Fleet Management System UI dashboard which allows monitoring and controlling multiple robots using ROS. To be tested with multirobot_sim ros package from my repo.

<img src="https://github.com/msyahmizulkepli/fms-react/blob/main/image.png">

### Software

- Ubuntu 20.04
- ROS Noetic

## Installation
Install rosbridge-server
```shell
sudo apt install ros-noetic-rosbridge-server
```
clone this repository 
```shell
git clone https://github.com/msyahmizulkepli/fms-react.git
```
cd into directory
```shell
cd fms-react
```
install react libraries
```shell
npm install
```


## Usage
## Configure IPaddress
Set ROSBRIDGE_SERVER_IP variable in the /fms-react/src/scripts/config.js directory to your ros IPaddress

### Multirobot Simulation

```shell
export TURTLEBOT3_MODEL=burger
roslaunch multirobot_sim gazebo.launch
```
```shell
export TURTLEBOT3_MODEL=burger
roslaunch multirobot_sim navigation.launch
```

<img src="https://github.com/msyahmizulkepli/fms-react/blob/main/image1.png">

### Web Interface
start rosbridge
```shell
roslaunch rosbridge_server rosbridge_websocket.launch
```
start web app
```shell
cd fms-react
npm start
```

<img src="https://github.com/msyahmizulkepli/fms-react/blob/main/image2.png">
