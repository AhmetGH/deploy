import React from 'react';
import Login from './compenents/login'
import './App.css';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Home } from "./compenents/home"
import Layout from "./Layout"


function App() {
  return (
    <div className="App">
      <Router>
        <Routes>
          <Route path="/*" element={<Layout />}>
            <Route path="home" element={<Home />} />
            <Route path="login" element={<Login />} />
          </Route>
        </Routes>
      </Router>

    </div>
  );
}
export default App;
