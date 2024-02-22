import { NavLink, Outlet,useNavigate } from "react-router-dom"
import "./styles/layout.css"
import React, { useState, useEffect } from 'react';

const Layout = () => {
  const [log,setLog]=useState('Login');
  const [a,setA]=useState(true);
  const navigation=useNavigate();


  async function submit(e) {
    const accessToken = localStorage.getItem('token');
    if(accessToken && a){
      setLog("Logout");
      setA(false);
      console.log("girdi1")
    }else if(accessToken && !a){
      console.log("girdi2")
      localStorage.removeItem('token');
      setLog("Login")
      alert("Çıkış yapıldı giriş sayfasına yönlendiriliyorsunuz.")
      setA(true);
    }else{
      setA("Logout")
    }
  }



  return (
    <div>
      <div >
        <header className='menu'>
          <nav>
            <NavLink className='item' to="/">
              Main
            </NavLink>
            <NavLink onClick={submit} className='item' to="/login">
            {log}
            </NavLink>
          </nav>
        </header>
      </div>
      <div>
        <Outlet></Outlet>
      </div>
    </div>
  )
}

export default Layout