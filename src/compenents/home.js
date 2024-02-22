import React, { useEffect, useState } from 'react'
import axios from 'axios'
import {useNavigate} from "react-router-dom"
import "../styles/home.css"
export const Home = () => {

  const accessToken = localStorage.getItem('token');
  const navigation=useNavigate();
  const [isAuthenticated, setAuthenticated] = useState(false);

  // async function submit(e) {
  //   e.preventDefault();
  //   localStorage.removeItem('token');
  //   alert("Çıkış yapıldı Gİriş sayfasına yönlendiriliyorsunuz.")
  //   navigation('/login')
  // }


  useEffect(() => {

    async function authMiddleware(e) {

      try {
        const res = await axios.get("http://localhost:3000/auth", {
          headers: {
            'Authorization': `Bearer ${accessToken}` // Token başlığı ekleniyor
          }
        })
        if (res.status === 200) {
          console.log("basarili")
          if (!isAuthenticated) { setAuthenticated(true); }
        }
      } catch (error) {
        alert("Kullanıcı doğrulanamadı Giriş sayfasına yönlendiriliyorsunuz.")
        
        if (!isAuthenticated) { setAuthenticated(false); }
        navigation('/login')
      }
    }
    authMiddleware();
  }, []);

  return (
    <div>{isAuthenticated ? (<div>
      <h1>Hoş geldiniz!</h1>
      <p>Kullanıcı doğrulandı.</p>
      {/* <div className='button-container'>
       <button className='button' onClick={submit}>Çıkış Yap</button>
      </div> */}
    </div>
    ) : null}
    </div>

  )
}

export default Home