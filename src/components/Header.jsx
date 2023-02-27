import React, { Component } from "react";
import {Navbar, Nav} from "react-bootstrap";

class Header extends Component {
	render() {
		return (
				<div>
				<Navbar bg="dark" variant="dark" collapseOnSelect expand="lg">
				    <Navbar.Brand href="#home">&emsp;&emsp; Robot Fleet Management System</Navbar.Brand>
				    <Navbar.Toggle aria-controls="basic-navbar-nav" />
				    <Navbar.Collapse id="basic-navbar-nav">
				      <Nav className="mr-auto">
				        <Nav.Link href="/">Home</Nav.Link>
				        <Nav.Link href="/About">About</Nav.Link>
				      </Nav>
				    </Navbar.Collapse>
				</Navbar>
				</div>
		);
	}
}

export default Header;