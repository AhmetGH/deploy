import React, { useState,useEffect } from 'react';
import axios from 'axios';
import '../styles/login.css';
import {useNavigate,Link} from "react-router-dom";
import { AiOutlineEye, AiOutlineEyeInvisible } from "react-icons/ai";

export const Login = () => {
  const accessToken=localStorage.getItem('token');
  const navigation=useNavigate();
  const [email,setEmail]=useState('');
  const [password,setPassword]=useState('');
  const [openMessage, setOpenMessage] = useState(false);
  const [messageText, setMessageText] = useState("");
  const [isVisible, setIsVisible] = useState(false);
  

  useEffect(()=>{
    if(accessToken){
      navigation("/home")
    }
  },[]);

  function isValidEmail(email) {
    // Email adresi için düzenli ifade
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailPattern.test(email);
  }
  async function submit(e) {
    e.preventDefault();

    try {

      if(email === undefined 
        || email === "" 
        || password === undefined 
        || password === "")
      {
        setMessageText("Please enter a valid email and password")
        setOpenMessage(true)
        return
      }
      
      let isvalidEmail = isValidEmail(email)

      if (!isvalidEmail) {
        setMessageText("Invalid input type, please enter a valid email")
        console.log(isvalidEmail)
        setOpenMessage(true)
        return;
      }

      await axios.post("http://localhost:3000/login",{
        email,password
      })
      .then(res=>{
        localStorage.setItem('token', res.data.accessToken)
        if(res.status===200){
          navigation("/home")
        }

        })
        .catch(e => {
          setMessageText("Email or password is incorrect, please try again...")
          setOpenMessage(true)
          // alert("Username or password mistake")

        })

    }
    catch (e) {
      console.log(e)

    }
  }
  return (
    <div className="login-container">
      <h2>Sign in</h2>
      <div className="form-control">
        <label>Email</label>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <div className="form-control">
        <label>Password</label>
        <div className="password-input">
          <input
            type={isVisible ? "text" : "password"}
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <AiOutlineEye className='icon' onClick={() => { setIsVisible(!isVisible) }} />
        </div>
      </div>

      <button type="submit" onClick={(e) => { submit(e) }}>Giriş Yap</button>
      {openMessage && <div className="message">{messageText}</div>}
    </div>
  );
};

export default Login;