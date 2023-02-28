# fms-react
Fleet Management System react-based dashboard which allows monitoring multiple robots using ROS. To be tested with multirobot_sim ros package from my repo.


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

### Multirobot Simulation

```shell
export TURTLEBOT3_MODEL=burger
roslaunch multirobot_sim gazebo.launch
```
```shell
export TURTLEBOT3_MODEL=burger
roslaunch multirobot_sim navigation.launch
```
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
